
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
