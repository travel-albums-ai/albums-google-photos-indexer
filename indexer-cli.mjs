#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { createSemaphore } from './src/indexer/concurrency/queue.mjs';
import { worker } from './src/indexer/concurrency/worker.mjs';
import { createOrReadThumbnail } from './src/indexer/image/thumbnails.mjs';
import { CACHE_FOLDER, OUT_FILE } from './src/indexer/indexer.mjs';
import { initOutputDir } from './src/indexer/io/init-output-dir.mjs';
import { loadCitiesFile, loadConfigFromArgv } from './src/indexer/io/load-config.mjs';
import { loadExisting } from './src/indexer/io/load-existing.mjs';
import { readJsonSafe } from './src/indexer/io/read-json-safe.mjs';
import { walkStream } from './src/indexer/io/walk-stream.mjs';
import { createProgress } from './src/indexer/progress/progress.mjs';
import { convertJSON } from './src/indexer/transform/ndjson-to-json-map.mjs';
import { buildCitiesGridCleaned } from './src/indexer/utils/build-cities-grid.mjs';

const MODE = 'ssd';

const CONFIG = {
  hdd: { concurrency: 3, sharp: 4, cache: false },
  ssd: { concurrency: 16, sharp: 16, cache: false },
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

sharp.cache(ACTIVE_CONFIG.cache);
sharp.concurrency(ACTIVE_CONFIG.sharp);

let _CURRENT_CONTROLLER = null;
let _CURRENT_DONE = null;

export async function start(opts = {}) {
  if (_CURRENT_CONTROLLER) throw new Error('Indexer already running');
  const controller = new AbortController();
  _CURRENT_CONTROLLER = controller;

  const cfg = opts.cfg || await loadConfigFromArgv();
  const signal = controller.signal;

  const OUT_DIR = path.resolve(cfg.TARGET_ROOT);

  // Support multiple roots via TAKEOUT_ROOTS, fall back to TAKEOUT_ROOT for backward compatibility
  const TAKEOUT_ROOTS = Array.isArray(cfg.TAKEOUT_ROOTS)
    ? cfg.TAKEOUT_ROOTS
    : cfg.TAKEOUT_ROOT
      ? [cfg.TAKEOUT_ROOT]
      : [];

  if (!TAKEOUT_ROOTS.length) {
    console.error('No TAKEOUT_ROOTS or TAKEOUT_ROOT configured. Provide at least one root to scan.');
    process.exit(1);
  }

  const resolvedRoots = TAKEOUT_ROOTS.map(r => path.resolve(r));

  console.log(`Scanning roots: ${resolvedRoots.join(', ')}`);
  console.log(`Mode: ${MODE}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Sharp: ${ACTIVE_CONFIG.sharp}`);
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Output Thumbnails: ${OUT_DIR}/${CACHE_FOLDER}`);
  console.log(`Output JSON: ${OUT_DIR}/${OUT_FILE}`);
  console.log(`===============================`);

  const { stream, emit, flush, outFile } = await initOutputDir(OUT_DIR);

  const existingSet = await loadExisting(outFile);
  const progress = createProgress(Date.now());
  progress.setPreindexed(existingSet.size);
  console.log(`[discovery] Found ${Array.from(existingSet).length} existing records. Resuming...`);
  console.log(`===============================`);

  const cities = await loadCitiesFile(new URL('./src/indexer/data/cities.json', import.meta.url));
  const citiesGrid = buildCitiesGridCleaned(cities, 1);

  console.log(`[cities] Loaded ${cities.length} cities. Grid size: ${citiesGrid.size}`);
  console.log(`===============================`);

  // create a transform semaphore sized to the sharp concurrency to bound in-flight image transforms
  const transformPool = createSemaphore(ACTIVE_CONFIG.sharp);

  try {
    for (const ROOT of resolvedRoots) {
      if (signal.aborted) break;
      console.log(`\n[discovery] Scanning: ${ROOT}`);

      const deps = { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir: OUT_DIR, sharp, ROOT };
      const depsWithPool = { ...deps, transformPool };
      const workerFunc = (queue, emitFn, grid) => worker(queue, emitFn, grid, depsWithPool);

      await walkStream(ROOT, emit, existingSet, citiesGrid, CONCURRENCY, workerFunc, progress, signal);
    }

    await flush();
    await new Promise(r => stream.end(r));

    if (!signal.aborted) console.log('\n✅ done');
    else console.log('\n⏸️ stopped');
  } finally {
    _CURRENT_CONTROLLER = null;
  }
}

export function stop() {
  if (_CURRENT_CONTROLLER) _CURRENT_CONTROLLER.abort();
}

export default start;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      _CURRENT_DONE = start();
      await _CURRENT_DONE;
    } catch (err) {
      console.error('\n💥 crash:', err);
      process.exit(1);
    }
  })();
}
