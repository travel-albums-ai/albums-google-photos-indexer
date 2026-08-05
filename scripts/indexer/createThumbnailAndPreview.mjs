export async function createThumbnailAndPreview(
  inputPath,
  outputPath,
  sharp
) {
  return sharp(inputPath, {
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
