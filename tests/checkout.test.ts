import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkout, parseCheckout } from '../server/checkout'

const rpc = vi.fn()
vi.mock('../server/supabase', () => ({ serverDb: () => ({ rpc }) }))
const product_id = '10000000-0000-4000-8000-000000000001'
const idempotencyKey = '20000000-0000-4000-8000-000000000001'
const valid = { idempotencyKey, items: [{ product_id, quantity: 1 }], paymentMethod: 'cash', orderType: 'dine_in', expectedTotalCentavos: 4500, paidCentavos: 5000 }

describe('checkout boundary', () => {
  beforeEach(() => rpc.mockReset())
  it('rejects empty, duplicate, malformed and browser-priced orders before RPC', () => {
    expect(() => parseCheckout({ ...valid, items: [] })).toThrow()
    expect(() => parseCheckout({ ...valid, items: [valid.items[0], valid.items[0]] })).toThrow()
    expect(() => parseCheckout({ ...valid, items: [{ product_id, quantity: -1 }] })).toThrow()
    expect(() => parseCheckout({ ...valid, totalCentavos: 1 })).toThrow()
    expect(() => parseCheckout({ ...valid, orderType: 'delivery' })).toThrow()
    expect(rpc).not.toHaveBeenCalled()
  })
  it('does not send client totals or QR/Card paid amounts to the database', async () => {
    rpc.mockResolvedValue({ data: { reference: 'VC-TEST' }, error: null })
    await checkout({ ...valid, paymentMethod: 'qr', paidCentavos: undefined })
    expect(rpc).toHaveBeenCalledWith('complete_checkout', { p_key: idempotencyKey, p_items: valid.items, p_method: 'qr', p_order_type: 'dine_in', p_expected_total_centavos: 4500, p_paid_centavos: null })
  })
  it('returns the same saved receipt supplied by the atomic RPC on retry', async () => {
    const receipt = { reference: 'VC-TEST', total_centavos: 4500, paid_centavos: 5000, change_centavos: 500, items: [] }
    rpc.mockResolvedValue({ data: receipt, error: null })
    expect(await checkout(valid)).toEqual(receipt)
    expect(await checkout(valid)).toEqual(receipt)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc.mock.calls[0][1].p_key).toBe(rpc.mock.calls[1][1].p_key)
  })
  it('surfaces database stock and idempotency conflicts', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'KIOSK: A product is unavailable or stock has changed' } })
    await expect(checkout(valid)).rejects.toMatchObject({ status: 409 })
  })
})
