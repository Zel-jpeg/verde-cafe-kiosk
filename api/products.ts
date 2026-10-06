import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleError, method } from '../server/http.js'
import { imageUrl, serverDb } from '../server/supabase.js'
import type { Product } from '../shared/types.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    method(req, 'GET')
    const { data, error } = await serverDb().from('products').select('id,name,description,category,price_centavos,stock_quantity,active,image_path').eq('active', true).order('name')
    if (error) throw error
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ products: (data as Product[]).map(product => ({ ...product, image_url: imageUrl(product.image_path) })) })
  } catch (error) { return handleError(res, error) }
}
