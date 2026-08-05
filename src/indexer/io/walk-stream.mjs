import fsp from 'node:fs/promises';
import path from 'node:path';
import { createQueue } from '../concurrency/queue.mjs';
import { SEPARATOR } from '../indexer.mjs';

export async function walkStream(root, emit, existingSet, citiesGrid, concurrency, workerFunc, progress) {
  const stack = [root];
  const queue = createQueue(concurrency * 200);
  const base64Root = Buffer.from(root).toString('base64')

  console.log(`Scanning for JSON files in ${root}...`, citiesGrid.size ? `Cities grid size: ${citiesGrid.size}` : '');

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

      if (!e.isFile() || !/\.json$/i.test(e.name)) continue;

      let data;
      try {
        const txt = await fsp.readFile(full, 'utf8');
        data = JSON.parse(txt);
      } catch {
        continue;
      }

      const title = data && data.title;
      if (!title || !/\.(jpe?g|png|gif|webp|tiff|avif)$/i.test(title)) continue;

      function safeDecode(input) {
        if (!input || typeof input !== 'string') return input;
        let prev = input;
        for (let i = 0; i < 3; i++) {
          try {
            const dec = decodeURIComponent(prev);
            if (dec === prev) break;
            prev = dec;
          } catch (err) {
            break;
          }
        }
        return prev;
      }

      const possibleNames = [title, safeDecode(title)];
      let imageExists = false;
      for (const nm of possibleNames) {
        try {
          const imgPath = path.join(dir, nm);
          const st = await fsp.stat(imgPath);
          if (st.isFile()) { imageExists = true; break; }
        } catch (e) {
          // try next
        }
      }
      if (!imageExists) continue;

      const folder = full.replace(root, '').split("/").slice(0,-1).join("/");
      const id = base64Root + SEPARATOR + folder + SEPARATOR + title;

      // console.log(`Found JSON file: ${id} {full: ${full.replace(root, '').split("/").slice(0,-1).join("/")}}`);

      if (existingSet.has(id)) continue;

      existingSet.add(id);
      progress.addFound(); progress.addFile(1);
      progress.log();

      await queue.push({ full, e });
    }
  }

  queue.close();
  await Promise.all(workers);
}
