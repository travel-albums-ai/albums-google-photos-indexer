import fsp from 'node:fs/promises';
import path from 'node:path';
import { CACHE_FOLDER } from '../indexer.mjs';

export async function getSizesAndCreatePreview(inputPath, sharp) {
  const metadata = await sharp(inputPath, {
    sequentialRead: true,
    limitInputPixels: false,
  }).metadata();

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

export async function createThumbnailAndPreview(
  inputPath,
  outputPath,
  sharp
) {
  return await sharp(inputPath, {
    limitInputPixels: false,
    sequentialRead: true,
    failOn: 'none',
  })
    .resize({
      width: 550,
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.linear,
      fastShrinkOnLoad: true,
    })
    .jpeg({
      quality: 70,
      mozjpeg: false,
    })
    .toFile(outputPath);
}

export async function createOrReadThumbnail(
  outDir,
  folder,
  fileName,
  folderName,
  sharp,
  rootIndex = 'root',
  relPath = ''
) {
  // Ensure relative path is safe and not escaping the root
  let safeRel = relPath || '';
  if (typeof safeRel === 'string') {
    safeRel = safeRel.replace(/\\/g, path.sep);
    if (safeRel.startsWith('..')) safeRel = folderName;
  } else {
    safeRel = folderName;
  }

  const thumbPath = path.join(outDir, CACHE_FOLDER, rootIndex, safeRel, fileName);
  await fsp.mkdir(path.dirname(thumbPath), { recursive: true });

  try {
    await fsp.access(thumbPath);
    return getSizesAndCreatePreview(thumbPath, sharp);
  } catch (err) {
    return createThumbnailAndPreview(path.join(folder, fileName), thumbPath, sharp);
  }
}
