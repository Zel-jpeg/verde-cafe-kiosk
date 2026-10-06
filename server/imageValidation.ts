import { HttpError } from './http.js'

export const MAX_WEBP_BYTES = 1024 * 1024

export function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
}

export function validateWebp(bytes: Uint8Array, mime: string | undefined) {
  if (mime !== 'image/webp') throw new HttpError(415, 'Only converted WebP images are accepted.')
  if (!bytes.length || bytes.length > MAX_WEBP_BYTES) throw new HttpError(413, 'WebP images must be at most 1 MiB.')
  if (!isWebp(bytes)) throw new HttpError(415, 'The uploaded file is not a valid WebP image.')
  const riffSize = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true)
  if (riffSize + 8 !== bytes.length) throw new HttpError(415, 'The WebP file is incomplete or malformed.')
}

export function imageObjectPath(productId: string, imageId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !/^[0-9a-f-]{36}$/i.test(imageId)) throw new HttpError(400, 'Invalid image path.')
  return `products/${productId}/${imageId}.webp`
}
