#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';

import EventEmitter from 'node:events';
import { createSemaphore } from './src/indexer/concurrency/queue.mjs';
import { worker } from './src/indexer/concurrency/worker.mjs';
import citiesData from './src/indexer/data/cities.json' with { type: 'json' };
import { createOrReadThumbnail } from './src/indexer/image/thumbnails.mjs';
import { CACHE_FOLDER, OUT_FILE } from './src/indexer/indexer.mjs';
import { initOutputDir } from './src/indexer/io/init-output-dir.mjs';
import { loadConfigFromArgv } from './src/indexer/io/load-config.mjs';
import { loadExisting } from './src/indexer/io/load-existing.mjs';
import { readJsonSafe } from './src/indexer/io/read-json-safe.mjs';
import { walkStream } from './src/indexer/io/walk-stream.mjs';
import { createProgress } from './src/indexer/progress/progress.mjs';
import { convertJSON } from './src/indexer/transform/ndjson-to-json-map.mjs';
import { buildCitiesGridCleaned } from './src/indexer/utils/build-cities-grid.mjs';

const MODE = 'ssd';

const CONFIG = {
  hdd: { concurrency: 3, imageConcurrency: 4 },
  ssd: { concurrency: 16, imageConcurrency: 16 },
};

const getConfig = () =>
  MODE === 'ssd'
    ? CONFIG.ssd
    : MODE === 'hdd'
      ? CONFIG.hdd
      : os.platform() === 'win32'
        ? CONFIG.ssd
        : CONFIG.hdd;

const ACTIVE_CONFIG = getConfig();
const CONCURRENCY = ACTIVE_CONFIG.concurrency;

let _CURRENT_CONTROLLER = null;
let _CURRENT_DONE = null;

export class IndexerController {
  constructor(opts = {}) {
    this.opts = opts;
    this._abort = new AbortController();
    this.signal = this._abort.signal;
    this.emitter = new EventEmitter();
    this.status = 'idle';
    this.done = null;
    this.progress = null;
    this.outFile = null;
    this.error = null;
  }

  on(ev, fn) { this.emitter.on(ev, fn); }

  stop() { this._abort.abort(); }

  start() {
    if (this.status === 'running') throw new Error('Indexer already running');
    this.status = 'running';
    this.emitter.emit('start');
    const signal = this.signal;

    this.done = (async () => {
      const cfg = this.opts.cfg || await loadConfigFromArgv();

      const OUT_DIR = path.resolve(cfg.TARGET_ROOT);

      // Support multiple roots via TAKEOUT_ROOTS, fall back to TAKEOUT_ROOT for backward compatibility
      const TAKEOUT_ROOTS = Array.isArray(cfg.TAKEOUT_ROOTS)
        ? cfg.TAKEOUT_ROOTS
        : cfg.TAKEOUT_ROOT
          ? [cfg.TAKEOUT_ROOT]
          : [];

      if (!TAKEOUT_ROOTS.length) {
        console.error('No TAKEOUT_ROOTS or TAKEOUT_ROOT configured. Provide at least one root to scan.');
        throw new Error('No TAKEOUT_ROOTS or TAKEOUT_ROOT configured');
      }

      const resolvedRoots = TAKEOUT_ROOTS.map(r => path.resolve(r));

      console.log(`Scanning roots: ${resolvedRoots.join(', ')}`);
      console.log(`Mode: ${MODE}`);
      console.log(`Concurrency: ${CONCURRENCY}`);
      console.log(`Image concurrency: ${ACTIVE_CONFIG.imageConcurrency}`);
      console.log(`Output: ${OUT_DIR}`);
      console.log(`Output Thumbnails: ${OUT_DIR}/${CACHE_FOLDER}`);
      console.log(`Output JSON: ${OUT_DIR}/${OUT_FILE}`);
      console.log(`===============================`);

      const { stream, emit, flush, outFile } = await initOutputDir(OUT_DIR);
      this.outFile = outFile;

      const existingSet = await loadExisting(outFile);
      const progress = createProgress(Date.now());
      this.progress = progress;
      progress.setPreindexed(existingSet.size);
      console.log(`[discovery] Found ${Array.from(existingSet).length} existing records. Resuming...`);
      console.log(`===============================`);

      const cities = citiesData.map(({ name, lat, lng, country }) => ({ name, lat, lng, country }));
      const citiesGrid = buildCitiesGridCleaned(cities, 1);

      console.log(`[cities] Loaded ${cities.length} cities. Grid size: ${citiesGrid.size}`);
      console.log(`===============================`);

      // Bound in-flight native image transforms separately from filesystem workers.
      const transformPool = createSemaphore(ACTIVE_CONFIG.imageConcurrency);

      try {
        for (const ROOT of resolvedRoots) {
          if (signal.aborted) break;
          console.log(`\n[discovery] Scanning: ${ROOT}`);

          const deps = { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir: OUT_DIR, ROOT };
          const depsWithPool = { ...deps, transformPool };
          const workerFunc = (queue, emitFn, grid) => worker(queue, emitFn, grid, depsWithPool);

          await walkStream(ROOT, emit, existingSet, citiesGrid, CONCURRENCY, workerFunc, progress, signal);
        }

        await flush();
        await new Promise(r => stream.end(r));

        if (!signal.aborted) console.log('\n✅ done');
        else console.log('\n⏸️ stopped');
      } finally {
        // emit final events
        if (signal.aborted) {
          this.status = 'stopped';
          this.emitter.emit('stop');
        } else {
          this.status = 'done';
          this.emitter.emit('done');
        }
        _CURRENT_CONTROLLER = null;
      }
    })().catch(err => {
      this.status = 'error';
      this.error = err;
      if (this.emitter.listenerCount('error')) this.emitter.emit('error', err);
      throw err;
    });

    return this;
  }
}

export function start(opts = {}) {
  const idx = new IndexerController(opts);
  _CURRENT_CONTROLLER = idx;
  return idx.start();
}

export function stop() {
  if (_CURRENT_CONTROLLER && typeof _CURRENT_CONTROLLER.stop === 'function') _CURRENT_CONTROLLER.stop();
}

export default start;

if (process.env.INDEXER_CLI_ENTRYPOINT === 'true') {
  (async () => {
    try {
      _CURRENT_DONE = start();
      await _CURRENT_DONE.done;
    } catch (err) {
      console.error('\n💥 crash:', err);
      process.exit(1);
    }
  })();
}
