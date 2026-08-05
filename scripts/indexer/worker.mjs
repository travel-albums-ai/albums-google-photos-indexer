import path from 'node:path';

export async function worker(queue, emit, citiesGrid, deps) {
  const { readJsonSafe, createOrReadThumbnail, convertJSON, progress, outDir, sharp, ROOT } = deps;

  while (true) {
    const item = queue.pop();
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
      const filename = record.data.title;
      const folderName = full.split('/').slice(-2, -1).join('/');

      const { width, height } = await createOrReadThumbnail(outDir, folder, filename, folderName, sharp);

      record.width = width;
      record.height = height;
      record.absolutePath = full.replace(ROOT, '').replace(/\\/g, '/').split('/').slice(1,-1).join('/')

      const { result, id } = convertJSON(record, citiesGrid);

      await emit({ [id]: result });

      progress.incDone();
      progress.log();
    } catch (err) {
      // console.error('\n💥 worker:', err);
      progress.incFailed();
      progress.log();
    }
  }
}
