import type { VercelRequest, VercelResponse } from '@vercel/node'
import { submitFeedback } from '../server/feedback.js'
import { handleError, method } from '../server/http.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    method(req, 'POST')
    return res.status(200).json(await submitFeedback(req.body))
  } catch (error) { return handleError(res, error) }
}
