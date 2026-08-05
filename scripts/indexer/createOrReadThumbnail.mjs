import fs from 'node:fs';
import path from 'node:path';
import { createThumbnailAndPreview } from './createThumbnailAndPreview.mjs';
import { getSizesAndCreatePreview } from './getSizesAndCreatePreview.mjs';

const SEPARATOR = '::';
const CACHE_FOLDER = '/thumbnails';

export async function createOrReadThumbnail(outDir, folder, fileName, folderName, sharp) {
  const thumbPath = path.join(outDir, CACHE_FOLDER, folderName + SEPARATOR + fileName);

  if (fs.existsSync(thumbPath))
    return getSizesAndCreatePreview(thumbPath, sharp);

  return createThumbnailAndPreview(path.join(folder, fileName), thumbPath, sharp);
}
