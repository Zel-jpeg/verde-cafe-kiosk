import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkout } from '../server/checkout.js'
import { handleError, method } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    method(req, 'POST')
    const receipt = await checkout(req.body)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ receipt })
  } catch (error) { return handleError(res, error) }
}
