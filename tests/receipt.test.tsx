import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReceiptPaper, receiptSubtotal } from '../src/components/ReceiptPaper'
import type { Receipt } from '../shared/types'

const receipt: Receipt = {
  reference: 'VC-TEST-123', created_at: '2026-10-06T12:00:00.000Z', order_type: 'take_out', payment_method: 'cash',
  total_centavos: 18500, paid_centavos: 20000, change_centavos: 1500,
  items: [
    { product_id: 'coffee', product_name: 'Barako Brew', quantity: 2, unit_price_centavos: 4500, subtotal_centavos: 9000 },
    { product_id: 'latte', product_name: 'Iced Latte', quantity: 1, unit_price_centavos: 9500, subtotal_centavos: 9500 },
  ],
}

describe('saved receipt', () => {
  it('uses item snapshots for the subtotal and shows completed order details in printable markup', () => {
    expect(receiptSubtotal(receipt)).toBe(18500)
    const html = renderToStaticMarkup(<ReceiptPaper receipt={receipt} />)
    for (const value of ['verde-logo-txt.png', 'verde-logo-icon.png', 'VC-TEST-123', 'Take Out', 'Barako Brew', 'Iced Latte', '2', '₱45.00', '₱95.00', '₱185.00', '₱200.00', '₱15.00', 'Cash']) {
      expect(html).toContain(value)
    }
    expect(html).toContain('Discounts')
    expect(html).toContain('Additional tax')
  })
  it('labels simulated QR receipts and omits cash-only change', () => {
    const html = renderToStaticMarkup(<ReceiptPaper receipt={{ ...receipt, payment_method: 'qr', paid_centavos: 18500, change_centavos: 0 }} />)
    expect(html).toContain('QR Payment (simulated)')
    expect(html).not.toContain('<dt>Change</dt>')
  })
})


