import { z } from 'zod'
import { HttpError } from './http.js'
import { serverDb } from './supabase.js'

const feedbackSchema = z.object({
  // The unlisted checkout retry key is a bearer capability, not a receipt ID.
  checkoutKey: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
}).strict()

export function parseFeedback(body: unknown) {
  const input = feedbackSchema.parse(body)
  return { ...input, comment: input.comment?.trim() || null }
}

function unavailable(): never { throw new HttpError(503, 'Feedback is unavailable. Please try again.') }

export async function submitFeedback(body: unknown) {
  const input = parseFeedback(body)
  const db = serverDb()
  const { data: order, error: orderError } = await db.from('transactions')
    .select('id,total_centavos,paid_centavos,change_centavos,transaction_items(id)')
    .eq('idempotency_key', input.checkoutKey).maybeSingle()
  if (orderError) unavailable()
  // complete_checkout commits these rows and item snapshots atomically. There
  // are no pending transactions or status column in the existing order schema.
  if (!order || !order.transaction_items?.length || Number(order.total_centavos) <= 0 ||
    Number(order.paid_centavos) < Number(order.total_centavos) ||
    Number(order.change_centavos) !== Number(order.paid_centavos) - Number(order.total_centavos)) {
    throw new HttpError(403, 'A successful checkout is required to submit feedback.')
  }
  const { error } = await db.from('order_feedback').insert({
    transaction_id: order.id, rating: input.rating, comment: input.comment,
  })
  if (!error) return { saved: true as const }
  if (error.code !== '23505') unavailable()
  // A UNIQUE transaction_id makes concurrent requests safe. A lost response
  // can be retried with the same content; accepted feedback is never updated.
  const { data: existing, error: readError } = await db.from('order_feedback')
    .select('rating,comment').eq('transaction_id', order.id).maybeSingle()
  if (readError || !existing) unavailable()
  if (existing.rating !== input.rating || existing.comment !== input.comment) {
    throw new HttpError(409, 'Feedback was already saved for this order and cannot be changed. Retry with your original rating and comment.')
  }
  return { saved: true as const }
}
