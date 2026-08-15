#!/usr/bin/env node

import compression from 'compression';
import express from 'express';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import startIndexer from './indexer-cli.mjs';
import { CACHE_FOLDER, OUT_FILE } from './src/indexer/indexer.mjs';
import { loadConfigFromArgv } from './src/indexer/io/load-config.mjs';

const DEFAULT_PORT = 3001;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.heif']);

function outputFileFor(config) {
  return config?.TARGET_ROOT
    ? path.resolve(config.TARGET_ROOT, OUT_FILE)
    : null;
}

function takeoutRootsFor(config) {
  const roots = Array.isArray(config?.TAKEOUT_ROOTS)
    ? config.TAKEOUT_ROOTS
    : config?.TAKEOUT_ROOT
      ? [config.TAKEOUT_ROOT]
      : [];

  return roots.map(root => path.resolve(root));
}

function isWithinRoot(filePath, root) {
  return filePath === root || filePath.startsWith(`${root}${path.sep}`);
}

export function createServer({ cfg = {}, indexerStart = startIndexer } = {}) {
  const app = express();
  const allowedOrigins = new Set([
    'https://web-app-travel-albums.vercel.app',
    'http://web-app-travel-albums.vercel.app',
    'http://localhost:5173',
  ]);

  app.use((req, res, next) => {
    const origin = req.get('Origin');

    if (allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'false');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  const targetRoot = cfg?.TARGET_ROOT ? path.resolve(cfg.TARGET_ROOT) : null;
  const takeoutRoots = takeoutRootsFor(cfg);
  const state = {
    cfg,
    controller: null,
    status: 'idle',
    error: null,
  };

  app.use(compression({
    threshold: 1024,
    filter(req, res) {
      if (res.getHeader('Content-Type')?.startsWith('application/x-ndjson')) {
        return true;
      }
      return compression.filter(req, res);
    },
  }));


  const getStatus = () => {
    const controller = state.controller;
    const progress = controller?.progress?.getState?.() ?? null;

    return {
      status: controller?.status ?? state.status,
      progress,
      outputFile: controller?.outFile ?? outputFileFor(state.cfg),
      error: state.error ? state.error.message : null,
    };
  };

  if (targetRoot) {
    app.use('/thumbnails', express.static(path.join(targetRoot, CACHE_FOLDER), {
      immutable: true,
      maxAge: '365d',
      index: false,
      redirect: false,
      fallthrough: false,
      setHeaders(response) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }));
  }

  app.get(/^\/images\/([^/]+)\/(.+)$/, (req, res) => {
    const rootIndex = req.params[0];
    const relativePath = req.params[1];
    const root = takeoutRoots.find(candidate => Buffer.from(candidate).toString('base64') === rootIndex);

    if (!root || !relativePath) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    const absolutePath = path.resolve(root, relativePath);
    if (!isWithinRoot(absolutePath, root)) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    if (!IMAGE_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) {
      res.status(400).json({ error: 'Not an image file' });
      return;
    }

    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(absolutePath, error => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Image not found' });
    });
  });

  app.get('/status', (_req, res) => {
    res.json(getStatus());
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/on', (_req, res) => {
    if (state.controller?.status === 'running') {
      res.json({ ...getStatus(), started: false });
      return;
    }

    try {
      state.error = null;
      const controller = indexerStart({ cfg: state.cfg });
      state.controller = controller;
      state.status = controller.status;

      controller.done.catch(error => {
        state.error = error;
        state.status = controller.status;
      });

      res.status(202).json({ ...getStatus(), started: true });
    } catch (error) {
      state.status = 'error';
      state.error = error;
      res.status(500).json({ ...getStatus(), started: false });
    }
  });

  app.get('/off', (_req, res) => {
    if (state.controller?.status === 'running') {
      state.controller.stop();
    }

    res.json({ ...getStatus(), stopped: true });
  });

  app.get('/takeout-metadata', async (_req, res, next) => {
    const outputFile = state.controller?.outFile ?? outputFileFor(state.cfg);

    if (!outputFile) {
      res.status(503).json({ error: 'TARGET_ROOT is not configured' });
      return;
    }

    try {
      const stat = await fs.stat(outputFile);

      res.type('application/x-ndjson');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Last-Modified', stat.mtime.toUTCString());
      res.setHeader('Cache-Control', 'no-cache');

      createReadStream(outputFile).pipe(res);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'Generated file is not available' });
        return;
      }

      next(error);
    }
  });

  return { app, state, getStatus };
}

export async function startServer({ cfg, port = process.env.PORT || DEFAULT_PORT } = {}) {
  const config = cfg ?? await loadConfigFromArgv();
  const { app, state, getStatus } = createServer({ cfg: config });
  const server = app.listen(Number(port), () => {
    console.log(`Indexer server listening on port ${port}`);
  });

  const shutdown = () => {
    if (state.controller?.status === 'running') state.controller.stop();
    server.close();
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  return { server, state, getStatus };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch(error => {
    console.error('\nServer failed to start:', error);
    process.exitCode = 1;
  });
}
