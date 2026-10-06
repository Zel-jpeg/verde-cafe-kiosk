import { z } from 'zod'
import { HttpError } from './http.js'
import { serverDb } from './supabase.js'
import type { Receipt } from '../shared/types.js'

const checkoutSchema = z.object({
  idempotencyKey: z.uuid(),
  items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(50),
  paymentMethod: z.enum(['cash', 'qr', 'card']),
  orderType: z.enum(['dine_in', 'take_out']),
  expectedTotalCentavos: z.number().int().positive().safe(),
  paidCentavos: z.number().int().nonnegative().safe().optional(),
}).strict()

export function parseCheckout(body: unknown) {
  const input = checkoutSchema.parse(body)
  if (new Set(input.items.map(item => item.product_id)).size !== input.items.length) throw new HttpError(400, 'An item appears more than once.')
  if (input.paymentMethod === 'cash' && input.paidCentavos === undefined) throw new HttpError(400, 'Enter a valid Cash amount.')
  if (input.paymentMethod !== 'cash' && input.paidCentavos !== undefined) throw new HttpError(400, 'Payment amount is set by the server for simulated methods.')
  return input
}

export async function checkout(body: unknown): Promise<Receipt> {
  const input = parseCheckout(body)
  const db = serverDb()
  // The RPC locks the idempotency key and product rows, calculates current prices,
  // and commits the receipt, item snapshots, and stock deductions as one transaction.
  const { data, error } = await db.rpc('complete_checkout', {
    p_key: input.idempotencyKey,
    p_items: input.items,
    p_method: input.paymentMethod,
    p_order_type: input.orderType,
    p_expected_total_centavos: input.expectedTotalCentavos,
    p_paid_centavos: input.paidCentavos ?? null,
  })
  if (error) {
    if (error.message.startsWith('KIOSK:')) throw new HttpError(409, error.message.slice(6).trim())
    throw error
  }
  return data as Receipt
}
