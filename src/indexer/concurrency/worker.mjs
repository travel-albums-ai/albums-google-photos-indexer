import path from 'node:path';
import { SEPARATOR } from '../indexer.mjs';

function safeDecode(input) {
  if (!input || typeof input !== 'string') return input;
  let prev = input;
  for (let i = 0; i < 3; i++) {
    try {
      const dec = decodeURIComponent(prev);
      if (dec === prev) break;
      prev = dec;
    } catch (e) {
      break;
    }
  }
  return prev;
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.heic', '.heif']);

export async function worker(queue, emit, citiesGrid, deps) {
  const { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir, sharp, ROOT, transformPool } = deps;

  while (true) {
    const item = await queue.pop();
    if (!item) break;

    const { full, e } = item;

    try {
      const record = {
        name: e.name,
        path: full,
        type: 'json',
        data: await readJsonSafe(full),
      };

      const folder = path.dirname(full);
      const rawFilename = record.data.title;
      const filename = safeDecode(rawFilename);
      const folderName = safeDecode(full.split('/').slice(-2, -1).join('/'));

      // Relative path from the discovery root to preserve folder structure
      let relPath = '';
      try {
        relPath = path.relative(ROOT, folder).replace(/\\/g, '/');
        if (relPath.startsWith('..')) relPath = path.basename(folder);
      } catch (e) {
        relPath = path.basename(folder);
      }

      // File-friendly index for the discovery root literal
      const rootIndex = (path.basename(ROOT) || 'root').replace(/[^a-zA-Z0-9-_]/g, SEPARATOR) || 'root';

      let width = 0, height = 0;

      const ext = path.extname(filename).toLowerCase();
      const isImage = IMAGE_EXTS.has(ext);

      if (isImage) {
        if (transformPool) {
          await transformPool.acquire();
          try {
            ({ width, height } = await createOrReadThumbnail(outDir, folder, filename, folderName, sharp, rootIndex, relPath));
          } finally {
            transformPool.release();
          }
        } else {
          ({ width, height } = await createOrReadThumbnail(outDir, folder, filename, folderName, sharp, rootIndex, relPath));
        }
      } else {
        // Non-image media: log it and continue without thumbnail creation
        // width/height remain 0 and record will still be emitted
      }

      record.width = width;
      record.height = height;
      record.absolutePath = full.replace(ROOT, '').replace(/\\/g, '/').split('/').slice(1,-1).join('/')

      const { result, id } = convertJSON(record, citiesGrid);

      await emit({ [id]: result });

      progress.incDone();
      progress.log();
    } catch (err) {
      try {
        console.error(`\n💥 worker failed for ${full}: ${err && err.message ? err.message : err}`);
      } catch (e) {
        console.error('\n💥 worker failed (logging error)');
      }
      progress.incFailed();
      progress.log();
    }
  }
}
