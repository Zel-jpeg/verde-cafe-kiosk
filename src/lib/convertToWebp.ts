const MAX_INPUT = 10 * 1024 * 1024
const MAX_OUTPUT = 1024 * 1024
const decodeError = 'This browser cannot decode this image, or the file is damaged. Export it as JPEG or PNG and try again. HEIC, HEIF and TIFF need a browser decoder to work.'

function hasRasterHeader(bytes: Uint8Array): boolean {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
  const text = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length))
  return starts(137, 80, 78, 71, 13, 10, 26, 10) || starts(255, 216, 255) ||
    ['GIF87a', 'GIF89a'].includes(text(0, 6)) || text(0, 2) === 'BM' ||
    (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') ||
    starts(73, 73, 42, 0) || starts(77, 77, 0, 42) ||
    // AVIF/HEIF containers. The browser still decides whether it can decode them.
    (text(4, 4) === 'ftyp' && ['avif', 'avis', 'heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(text(8, 4)))
}

export async function convertToWebp(file: File, onProgress?: (message: string) => void): Promise<Blob> {
  if (!file.size) throw new Error('This file is empty. Choose an image with content.')
  if (file.size > MAX_INPUT) throw new Error('The source image must be at most 10 MiB.')
  const prefixBytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer())
  // Raster metadata can contain SVG source text. A raster header takes priority
  // over that text and inaccurate MIME/filename hints; decoding still validates it.
  if (!hasRasterHeader(prefixBytes)) {
    const prefix = new TextDecoder().decode(prefixBytes)
    if (/image\/svg\+xml/i.test(file.type) || /\.svgz?$/i.test(file.name) || /<\s*(?:[\w.-]+:)?svg[\s/>]/i.test(prefix)) {
      throw new Error('SVG images are not supported here. Export the artwork as PNG or JPEG first.')
    }
  }
  onProgress?.('Decoding image…')
  let bitmap: ImageBitmap
  // Remove unreliable MIME metadata so decoding is based on the raster bytes.
  try { bitmap = await createImageBitmap(new Blob([file]), { imageOrientation: 'from-image' }) }
  catch { throw new Error(decodeError) }
  try {
    if (!bitmap.width || !bitmap.height) throw new Error(decodeError)
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    for (let dimensionAttempt = 0; dimensionAttempt < 8; dimensionAttempt++) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      try {
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Image conversion is unavailable in this browser.')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        for (const quality of [0.82, 0.7, 0.55, 0.4]) {
          onProgress?.(`Preparing WebP · ${canvas.width} × ${canvas.height} pixels…`)
          const output = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
          if (!output || output.type !== 'image/webp') throw new Error('This browser could not create WebP. Try a recent browser.')
          if (output.size > MAX_OUTPUT) continue
          const header = new Uint8Array(await output.slice(0, 12).arrayBuffer())
          if (header.length !== 12 || String.fromCharCode(...header.subarray(0, 4)) !== 'RIFF' ||
            String.fromCharCode(...header.subarray(8, 12)) !== 'WEBP' ||
            new DataView(header.buffer).getUint32(4, true) + 8 !== output.size) {
            throw new Error('Image conversion did not produce a valid WebP file.')
          }
          return output
        }
      } finally { canvas.width = 0; canvas.height = 0 }
      scale *= 0.75
    }
    throw new Error('The converted image is still over 1 MiB. Choose a simpler image.')
  } finally { bitmap.close() }
}
