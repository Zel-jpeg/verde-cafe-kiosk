import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireAdmin } from '../../server/adminAuth.js'
import { handleError, HttpError, method } from '../../server/http.js'

const pageSchema = z.coerce.number().int().min(0).max(100_000)
const pageSize = 20

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    method(req, 'GET')
    const { db } = await requireAdmin(req)
    const page = pageSchema.parse(req.query.page ?? 0)
    const { data, error } = await db.from('order_feedback')
      .select('id,rating,comment,created_at,transactions!inner(reference)')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize)
    if (error?.code === 'PGRST205' || error?.code === '42P01') {
      throw new HttpError(503, 'Customer feedback is not set up yet. Apply the order-feedback migration in Supabase, then retry.')
    }
    if (error || !data) throw new HttpError(503, 'Customer feedback could not be loaded. Please try again.')
    return res.status(200).json({
      feedback: data.slice(0, pageSize).map(row => ({
        id: row.id, rating: row.rating, comment: row.comment, created_at: row.created_at,
        order_reference: (row.transactions as unknown as { reference: string }).reference,
      })),
      hasMore: data.length > pageSize,
    })
  } catch (error) { return handleError(res, error) }
}
