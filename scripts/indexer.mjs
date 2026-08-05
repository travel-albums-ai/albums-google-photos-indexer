#!/usr/bin/env node

import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import { createOrReadThumbnail } from './indexer/createOrReadThumbnail.mjs';
import { initOutputDir } from './indexer/initOutputDir.mjs';
import { loadCitiesFile, loadConfigFromArgv } from './indexer/loadConfig.mjs';
import { loadExisting } from './indexer/loadExisting.mjs';
import { convertJSON } from './indexer/ndjsonToJsonMap.mjs';
import { createProgress } from './indexer/progress.mjs';
import { readJsonSafe } from './indexer/readJsonSafe.mjs';
import { buildCitiesGridCleaned } from './indexer/utils.mjs';
import { walkStream } from './indexer/walkStream.mjs';
import { worker } from './indexer/worker.mjs';

export const SEPARATOR = '__';
export const CACHE_FOLDER = '/thumbnails';
export const OUT_FILE = 'metadata.json';

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

  const cities = await loadCitiesFile(path.join('scripts/indexer/cities.json'));
  const citiesGrid = buildCitiesGridCleaned(cities, 1);

  console.log(`[cities] Loaded ${cities.length} cities. Grid size: ${citiesGrid.size}`);

  const deps = { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir: OUT_DIR, sharp, ROOT };

  const workerFunc = (queue, emitFn, grid) => worker(queue, emitFn, grid, deps);

  await walkStream(ROOT, emit, existingSet, citiesGrid, CONCURRENCY, workerFunc, progress);

  await flush();
  await new Promise(r => stream.end(r));

  console.log('\n✅ done');
}

main().catch(err => {
  console.error('\n💥 crash:', err);
  process.exit(1);
});
