#!/usr/bin/env node

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import startIndexer from './indexer-cli.mjs';
import { OUT_FILE } from './src/indexer/indexer.mjs';
import { loadConfigFromArgv } from './src/indexer/io/load-config.mjs';

const DEFAULT_PORT = 3000;

function outputFileFor(config) {
  return config?.TARGET_ROOT
    ? path.resolve(config.TARGET_ROOT, OUT_FILE)
    : null;
}

export function createServer({ cfg = {}, indexerStart = startIndexer } = {}) {
  const app = express();
  const state = {
    cfg,
    controller: null,
    status: 'idle',
    error: null,
  };

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

  app.get('/status', (_req, res) => {
    res.json(getStatus());
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

  app.get('/file', (req, res, next) => {
    const outputFile = state.controller?.outFile ?? outputFileFor(state.cfg);
    if (!outputFile) {
      res.status(503).json({ error: 'TARGET_ROOT is not configured' });
      return;
    }

    res.sendFile(outputFile, error => {
      if (!error) return;
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'Generated file is not available' });
        return;
      }
      next(error);
    });
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
