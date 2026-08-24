import fsp from 'node:fs/promises';
import path from 'node:path';
import { CACHE_FOLDER } from '../indexer.mjs';

export async function getSizesAndCreatePreview(inputPath) {
  const metadata = await new Bun.Image(inputPath).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

export async function createThumbnailAndPreview(
  inputPath,
  outputPath,
  thumbnailSize = 550,
  thumbnailQuality = 70,
) {
  const image = new Bun.Image(inputPath, { autoOrient: true })
    .resize(thumbnailSize, thumbnailSize, {
      fit: 'inside',
      withoutEnlargement: true,
      filter: 'linear',
    })
    .jpeg({ quality: thumbnailQuality });

  await image.write(outputPath);
  return { width: image.width, height: image.height };
}

export async function createOrReadThumbnail(
  outDir,
  folder,
  fileName,
  folderName,
  rootIndex = 'root',
  relPath = '',
  base64Root,
  thumbnailSize = 550,
  thumbnailQuality = 70,
) {
  // Ensure relative path is safe and not escaping the root
  let safeRel = relPath || '';
  if (typeof safeRel === 'string') {
    safeRel = safeRel.replace(/\\/g, path.sep);
    if (safeRel.startsWith('..')) safeRel = folderName;
  } else {
    safeRel = folderName;
  }

  const thumbPath = path.join(outDir, CACHE_FOLDER, base64Root, safeRel, fileName);
  await fsp.mkdir(path.dirname(thumbPath), { recursive: true });

  try {
    await fsp.access(thumbPath);
    return getSizesAndCreatePreview(thumbPath);
  } catch (err) {
    return createThumbnailAndPreview(
      path.join(folder, fileName),
      thumbPath,
      thumbnailSize,
      thumbnailQuality,
    );
  }
}
