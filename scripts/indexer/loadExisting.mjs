import fs from 'node:fs';
import fsp from 'node:fs/promises';
import readline from 'node:readline';

export async function loadExisting(outFile) {
  const existing = new Set();

  try { await fsp.access(outFile); }
  catch { return existing; }

  const rl = readline.createInterface({
    input: fs.createReadStream(outFile, {
      encoding: 'utf8',
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
