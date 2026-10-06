const MAX_INPUT = 10 * 1024 * 1024
const MAX_OUTPUT = 1024 * 1024

export async function convertToWebp(file: File): Promise<Blob> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose a PNG or JPEG image.')
  if (file.size > MAX_INPUT) throw new Error('The source image must be at most 10 MiB.')
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('This image could not be opened.') }
  try {
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    for (let dimensionAttempt = 0; dimensionAttempt < 3; dimensionAttempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Image conversion is unavailable in this browser.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.82, 0.7, 0.55, 0.4]) {
        const output = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
        if (!output || output.type !== 'image/webp') throw new Error('This browser could not create WebP. Try a recent browser.')
        if (output.size > MAX_OUTPUT) continue
        const header = new Uint8Array(await output.slice(0, 12).arrayBuffer())
        const signature = String.fromCharCode(...header)
        if (header.length !== 12 || !signature.startsWith('RIFF') || !signature.endsWith('WEBP')) {
          throw new Error('Image conversion did not produce a valid WebP file.')
        }
        return output
      }
      scale *= 0.75
    }
    throw new Error('The converted image is still over 1 MiB. Choose a simpler image.')
  } finally { bitmap.close() }
}
