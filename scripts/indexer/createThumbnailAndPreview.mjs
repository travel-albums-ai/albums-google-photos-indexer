
export async function createThumbnailAndPreview(
  inputPath,
  outputPath,
  sharp
) {
  const thumb = sharp(inputPath, {
    sequentialRead: true,
    limitInputPixels: false,
  })
    .resize(550, null, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: sharp.kernel.linear,
    })
    .jpeg({
      quality: 70,
      mozjpeg: true,
    })
    .withMetadata(false);

  const result = await thumb.toFile(outputPath);

  return result;
}
