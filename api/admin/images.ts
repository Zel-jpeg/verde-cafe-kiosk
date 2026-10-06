import { randomUUID } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireAdmin } from '../../server/adminAuth.js'
import { handleError, HttpError } from '../../server/http.js'
import { imageObjectPath, MAX_WEBP_BYTES, validateWebp } from '../../server/imageValidation.js'
import { imageUrl } from '../../server/supabase.js'

export const config = { api: { bodyParser: false } }

async function readImage(req: VercelRequest): Promise<Uint8Array> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > MAX_WEBP_BYTES) throw new HttpError(413, 'WebP images must be at most 1 MiB.')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')
    const { db } = await requireAdmin(req)
    const productId = z.uuid().parse(req.query.productId)
    const { data: product, error: productError } = await db.from('products').select('id,image_path').eq('id', productId).maybeSingle()
    if (productError) throw productError
    if (!product) throw new HttpError(404, 'Product not found.')
    const bytes = await readImage(req)
    validateWebp(bytes, String(req.headers['content-type'] ?? '').split(';')[0].trim())
    const path = imageObjectPath(productId, randomUUID())
    const { error: uploadError } = await db.storage.from('product-images').upload(path, bytes, { contentType: 'image/webp', upsert: false })
    if (uploadError) throw uploadError
    let updateQuery = db.from('products').update({ image_path: path }).eq('id', productId)
    updateQuery = product.image_path ? updateQuery.eq('image_path', product.image_path) : updateQuery.is('image_path', null)
    const { data: updated, error: updateError } = await updateQuery.select('id,image_path').maybeSingle()
    if (updateError || !updated) {
      await db.storage.from('product-images').remove([path])
      if (updateError) throw updateError
      throw new HttpError(409, 'Product image changed elsewhere. Please reload and retry.')
    }
    if (product.image_path) {
      const { error: cleanupError } = await db.storage.from('product-images').remove([product.image_path])
      if (cleanupError) console.warn('Old product image needs cleanup', product.image_path, cleanupError)
    }
    return res.status(200).json({ image_path: path, image_url: imageUrl(path) })
  } catch (error) { return handleError(res, error) }
}
