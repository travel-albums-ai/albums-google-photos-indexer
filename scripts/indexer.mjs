#!/usr/bin/env node

import fs from "node:fs";
import fsp, { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import sharp from "sharp";

import { createThumbnailAndPreview } from './indexer/createThumbnailAndPreview.mjs';
import { getSizesAndCreatePreview } from './indexer/getSizesAndCreatePreview.mjs';
import { convertJSON } from "./indexer/ndjsonToJsonMap.mjs";
import { readJsonSafe } from "./indexer/readJsonSafe.mjs";
import { recordProgress } from './indexer/recordProgress.mjs';
import { buildCitiesGridCleaned } from './indexer/utils.mjs';


const MODE = 'ssd';
let ROOT = '';
let OUT_DIR = '';
export const SEPARATOR = "::";
const OUT_FILE = "metadata.json";
const CACHE_FOLDER = "/thumbnails";
const SHARED_BUF = Buffer.allocUnsafe(8192);
const START_TIME = Date.now();

let totalFound = 0, totalFiles = 0, done = 0, preindexed = 0, failed = 0;

const CONFIG = {
  hdd: { concurrency: 3, sharp: 4, cache: false },
  ssd: { concurrency: 16, sharp: 16, cache: false },
};

const getConfig = () =>
  MODE === "ssd"
    ? CONFIG.ssd
    : MODE === "hdd"
      ? CONFIG.hdd
      : os.platform() === "win32"
        ? CONFIG.ssd
        : CONFIG.hdd;

const ACTIVE_CONFIG = getConfig();
const CONCURRENCY = ACTIVE_CONFIG.concurrency;

sharp.cache(ACTIVE_CONFIG.cache);
sharp.concurrency(ACTIVE_CONFIG.sharp);

const logProgress = () => recordProgress(done, totalFiles, START_TIME, preindexed, failed);
const isJson = l => /\.json$/i.test(l);
export async function loadExisting(outFile) {
  const existing = new Set();

  try { await fsp.access(outFile); }
  catch { return existing; }

  const rl = readline.createInterface({
    input: fs.createReadStream(outFile, {
      encoding: "utf8",
      highWaterMark: 1024 * 1024,
    }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      const firstKey = Object.keys(obj)[0];
      if (firstKey) existing.add(firstKey);
    } catch {}
  }

  return existing;
}

async function initOutputDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.mkdir(dir + CACHE_FOLDER, { recursive: true });

  const outFile = path.join(dir, OUT_FILE);
  const stream = fs.createWriteStream(outFile, { flags: "a" });

  let batch = [], batchSize = 0;

  async function flush() {
    if (!batch.length) return;

    const payload = batch.join("");
    batch = []; batchSize = 0;

    await new Promise(res => {
      const ok = stream.write(payload);
      if (ok) return res();
      stream.once("drain", res);
    });
  }

  const emit = async obj => {
    const line = JSON.stringify(obj) + "\n";
    batch.push(line);
    batchSize += line.length;

    if (batch.length >= 100 || batchSize >= 1024 * 1024)
      await flush();
  };

  return { stream, emit, flush, outFile };
}

async function createOrReadThumbnail(folder, fileName, folderName) {
  const thumbPath = `${OUT_DIR}/${CACHE_FOLDER}/` + folderName + SEPARATOR + fileName;

  if (fs.existsSync(thumbPath))
    return getSizesAndCreatePreview(thumbPath, sharp);

  return createThumbnailAndPreview(folder + "/" + fileName, thumbPath, sharp);
}

const createQueue = () => {
  const items = [];
  return {
    push: i => items.push(i),
    pop: () => items.pop(),
    get length() { return items.length; },
  };
};

async function worker(queue, emit, citiesGrid) {
  while (true) {
    const item = queue.pop();
    if (!item) break;

    const { full, e } = item;

    try {
      const record = {
        name: e.name,
        path: full,
        type: "json",
        data: await readJsonSafe(full),
      };

      const folder = path.dirname(full);
      const filename = record.data.title
      const folderName = full.split("/").slice(-2, -1).join("/")

      const { width, height } = await createOrReadThumbnail(folder, filename, folderName);

      record.width = width;
      record.height = height;

      const { result, id } = convertJSON(record, citiesGrid)

      await emit({ [id]: result });

      done++;
      logProgress();
    } catch (err) {
      // console.error("\n💥 worker:", err);
      failed++;
      logProgress();
    }
  }
}

async function walkStream(root, emit, existingSet, citiesGrid) {
  const stack = [root];
  const queue = createQueue();

  console.log(`Scanning for JSON files in ${root}...`, citiesGrid.size ? `Cities grid size: ${citiesGrid.size}` : '');

  while (stack.length) {
    const dir = stack.pop();

    let dh;
    try { dh = await fsp.opendir(dir); } catch { continue; }

    for await (const e of dh) {
      const full = path.join(dir, e.name);

      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }

      const id = full.split("/").slice(-2).join("/").split(".").slice(0, -2).join(".").replace(/\//g, SEPARATOR)

      if (!e.isFile() || existingSet.has(id) || !isJson(e.name))
        continue;

      existingSet.add(full);
      totalFound++; totalFiles++;
      logProgress();

      queue.push({ full, e });
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker(queue, emit, citiesGrid))
  );
}

async function loadConfig() {
  const idx = process.argv.indexOf('--config');
  if (idx !== -1 && process.argv[idx + 1]) {
    try {
      const raw = await readFile(process.argv[idx + 1], 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Failed to read config file:', err.message);
      return {};
    }
  }
  return {};
}

async function loadCitiesFile(citiesFile) {
    try {
      const raw = await readFile(citiesFile, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed.map(({ name, lat, lng, country }) => ({ name, lat, lng, country }));
    } catch (error) {
      console.error(`Failed to read cities.json: ${error.message}`);
      return [];
    }
  };

async function main() {
  const cfg = await loadConfig();

  ROOT = path.resolve(cfg.TAKEOUT_ROOT)
  OUT_DIR = path.resolve(cfg.TARGET_ROOT)

  console.log(`Scanning: ${ROOT}`);
  console.log(`Mode: ${MODE}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Sharp: ${ACTIVE_CONFIG.sharp}`);
  console.log(`Output: ${OUT_DIR}`);

  const { stream, emit, flush, outFile } = await initOutputDir(OUT_DIR);
  const existingSet = await loadExisting(outFile);
  preindexed = existingSet.size;
  console.log(`Found ${Array.from(existingSet).length} existing records. Resuming...`);

  const cities = await loadCitiesFile(path.join('cities.json'));
  const citiesGrid = buildCitiesGridCleaned(cities, 1);

  await walkStream(ROOT, emit, existingSet, citiesGrid);
  await flush();
  await new Promise(r => stream.end(r));

  console.log("\n✅ done");
}

main().catch(err => {``
  console.error("\n💥 crash:", err);
  process.exit(1);
});
