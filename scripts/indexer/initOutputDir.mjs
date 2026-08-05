import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const CACHE_FOLDER = '/thumbnails';
const OUT_FILE = 'metadata.json';

export async function initOutputDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  await fsp.mkdir(dir + CACHE_FOLDER, { recursive: true });

  const outFile = path.join(dir, OUT_FILE);
  const stream = fs.createWriteStream(outFile, { flags: 'a' });

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

  return { stream, emit, flush, outFile };
}

export { CACHE_FOLDER };
