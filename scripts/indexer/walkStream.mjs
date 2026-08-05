import fsp from 'node:fs/promises';
import path from 'node:path';
import { SEPARATOR } from '../indexer.mjs';
import { createQueue } from './queue.mjs';

export async function walkStream(root, emit, existingSet, citiesGrid, concurrency, workerFunc, progress) {
  const stack = [root];
  // bounded queue to avoid excessive memory usage during large scans
  const queue = createQueue(concurrency * 200);

  console.log(`Scanning for JSON files in ${root}...`, citiesGrid.size ? `Cities grid size: ${citiesGrid.size}` : '');

  // start worker pool before producing so work happens while scanning
  const workers = Array.from({ length: concurrency }, () => workerFunc(queue, emit, citiesGrid));

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

      const id = full.split('/').slice(-2).join('/').split('.').slice(0, -2).join('.').replace(/\//g, SEPARATOR);

      if (!e.isFile() || existingSet.has(id) || !/\.json$/i.test(e.name))
        continue;

      existingSet.add(full);
      progress.addFound(); progress.addFile(1);
      progress.log();

      await queue.push({ full, e });
    }
  }

  // signal no more items and wait for workers to finish
  queue.close();
  await Promise.all(workers);
}
