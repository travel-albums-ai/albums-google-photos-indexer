import fs from 'node:fs';
import path from 'node:path';
import { CACHE_FOLDER, SEPARATOR } from '../indexer.mjs';
import { createThumbnailAndPreview } from './createThumbnailAndPreview.mjs';
import { getSizesAndCreatePreview } from './getSizesAndCreatePreview.mjs';

export async function createOrReadThumbnail(outDir, folder, fileName, folderName, sharp) {
  const thumbPath = path.join(outDir, CACHE_FOLDER, folderName + SEPARATOR + fileName);

  return fs.existsSync(thumbPath)
    ? getSizesAndCreatePreview(thumbPath, sharp)
    : createThumbnailAndPreview(path.join(folder, fileName), thumbPath, sharp);
}
