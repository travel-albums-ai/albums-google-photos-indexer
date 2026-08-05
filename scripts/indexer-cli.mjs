#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { initOutputDir } from '../src/indexer/initOutputDir.mjs';
import { loadCitiesFile, loadConfigFromArgv } from '../src/indexer/loadConfig.mjs';
import { loadExisting } from '../src/indexer/loadExisting.mjs';
import { convertJSON } from '../src/indexer/ndjsonToJsonMap.mjs';
import { createProgress } from '../src/indexer/progress.mjs';
import { createSemaphore } from '../src/indexer/queue.mjs';
import { readJsonSafe } from '../src/indexer/readJsonSafe.mjs';
import { createOrReadThumbnail } from '../src/indexer/thumbnails.mjs';
import { buildCitiesGridCleaned } from '../src/indexer/utils.mjs';
import { walkStream } from '../src/indexer/walkStream.mjs';
import { worker } from '../src/indexer/worker.mjs';
import { CACHE_FOLDER, OUT_FILE } from '../src/indexer/indexer.mjs';

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

async function main() {
  const cfg = await loadConfigFromArgv();

  const ROOT = path.resolve(cfg.TAKEOUT_ROOT);
  const OUT_DIR = path.resolve(cfg.TARGET_ROOT);

  console.log(`Scanning: ${ROOT}`);
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

  const cities = await loadCitiesFile(new URL('./indexer/cities.json', import.meta.url));
  const citiesGrid = buildCitiesGridCleaned(cities, 1);

  console.log(`[cities] Loaded ${cities.length} cities. Grid size: ${citiesGrid.size}`);

  const deps = { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir: OUT_DIR, sharp, ROOT };

  // create a transform semaphore sized to the sharp concurrency to bound in-flight image transforms
  const transformPool = createSemaphore(ACTIVE_CONFIG.sharp);
  const depsWithPool = { ...deps, transformPool };

  const workerFunc = (queue, emitFn, grid) => worker(queue, emitFn, grid, depsWithPool);

  await walkStream(ROOT, emit, existingSet, citiesGrid, CONCURRENCY, workerFunc, progress);

  await flush();
  await new Promise(r => stream.end(r));

  console.log('\n✅ done');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('\n💥 crash:', err);
    process.exit(1);
  });
}
