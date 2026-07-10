export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { width: number; height: number; x: number; y: number }
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to match the bounding box
  canvas.width = image.width
  canvas.height = image.height

  // Draw image to canvas
  ctx.drawImage(image, 0, 0)

  // Extract the cropped image data
  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height)

  // Set canvas size to match the cropped image
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Put the cropped image data into the canvas
  ctx.putImageData(data, 0, 0)

  // As a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file)
      } else {
        reject(new Error('Canvas is empty'))
      }
    }, 'image/png')
  })
}
