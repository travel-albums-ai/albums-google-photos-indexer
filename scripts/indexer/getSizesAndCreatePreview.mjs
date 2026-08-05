
export async function getSizesAndCreatePreview(inputPath, sharp) {
  const image = sharp(inputPath, {
    sequentialRead: true,
    limitInputPixels: false,
  });

  const [metadata] = await Promise.all([
    image.metadata(),
  ]);

  return {
    width: metadata.width,
    height: metadata.height,
  };
}
