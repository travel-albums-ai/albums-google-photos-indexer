import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { CACHE_FOLDER, OUT_FILE } from './indexer.mjs';

export async function initOutputDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.mkdir(path.join(dir, CACHE_FOLDER), { recursive: true });

  const outFile = path.join(dir, OUT_FILE);
  const stream = fs.createWriteStream(outFile, {
    flags: 'a',
    highWaterMark: 4 * 1024 * 1024,
    encoding: 'utf8'
  });

  let batch = [], batchSize = 0;

  async function flush() {
    if (!batch.length) return;

    const payload = batch.join('');
    batch = []; batchSize = 0;

    await new Promise(res => {
      const ok = stream.write(payload);
      if (ok) return res();
      stream.once('drain', res);
    });
  }

  const emit = async obj => {
    const line = JSON.stringify(obj) + '\n';
    batch.push(line);
    batchSize += line.length;

    if (batch.length >= 100 || batchSize >= 1024 * 1024)
      await flush();
  };

  let _shutdownRegistered = false;
  const _shutdown = async () => {
    try {
      await flush();
    } catch (e) {
      // ignore flush errors
    }
    try {
      await new Promise(res => stream.end(res));
    } catch (e) {
      // ignore
    }
  };

  if (!_shutdownRegistered) {
    _shutdownRegistered = true;
    process.once('SIGINT', _shutdown);
    process.once('SIGTERM', _shutdown);
    process.once('beforeExit', _shutdown);
  }

  return { stream, emit, flush, outFile };
}
