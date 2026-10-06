import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireAdmin } from '../../server/adminAuth.js'
import { handleError, HttpError } from '../../server/http.js'
import { imageUrl } from '../../server/supabase.js'
import type { Product } from '../../shared/types.js'

const productFields = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable(),
  category: z.string().trim().max(50).nullable(),
  price_centavos: z.number().int().positive().max(100_000_000),
  stock_quantity: z.number().int().nonnegative().max(1_000_000),
  active: z.boolean(),
}).strict()

export function parseProduct(body: unknown) { return productFields.parse(body) }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { db } = await requireAdmin(req)
    res.setHeader('Cache-Control', 'no-store')
    if (req.method === 'GET') {
      const { data, error } = await db.from('products').select('id,name,description,category,price_centavos,stock_quantity,active,image_path').order('name')
      if (error) throw error
      return res.status(200).json({ products: (data as Product[]).map(product => ({ ...product, image_url: imageUrl(product.image_path) })) })
    }
    if (req.method === 'POST') {
      const fields = parseProduct(req.body)
      const { data, error } = await db.from('products').insert(fields).select('id,name,description,category,price_centavos,stock_quantity,active,image_path').single()
      if (error) throw error
      return res.status(201).json({ product: { ...data, image_url: null } })
    }
    if (req.method === 'PATCH') {
      const input = z.object({ id: z.uuid(), ...productFields.shape }).strict().parse(req.body)
      const { id, ...fields } = input
      const { data, error } = await db.from('products').update(fields).eq('id', id).select('id,name,description,category,price_centavos,stock_quantity,active,image_path').maybeSingle()
      if (error) throw error
      if (!data) throw new HttpError(404, 'Product not found.')
      return res.status(200).json({ product: { ...data, image_url: imageUrl(data.image_path) } })
    }
    throw new HttpError(405, 'Method not allowed')
  } catch (error) { return handleError(res, error) }
}
