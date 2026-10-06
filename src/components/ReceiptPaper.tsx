import type { Receipt } from '../../shared/types'
import { formatPeso } from '../../shared/money'
import { BrandArtwork } from './BrandArtwork'

const methodLabels = { cash: 'Cash', qr: 'QR Payment (simulated)', card: 'Credit / Debit Card (simulated)' }
const typeLabels = { dine_in: 'Dine In', take_out: 'Take Out' }

export function receiptSubtotal(receipt: Receipt) {
  return receipt.items.reduce((sum, item) => sum + item.subtotal_centavos, 0)
}

export function ReceiptPaper({ receipt }: { receipt: Receipt }) {
  const subtotal = receiptSubtotal(receipt)
  return <article className="receipt-paper" aria-label="Verde Coffee receipt">
    <header className="receipt-paper-brand"><BrandArtwork variant="icon" /><BrandArtwork variant="wordmark" /><p>Fresh moments, made simple.</p></header>
    <div className="receipt-paper-title">SALES RECEIPT</div>
    <dl className="receipt-paper-meta">
      <div><dt>Receipt no.</dt><dd>{receipt.reference}</dd></div>
      <div><dt>Date / time</dt><dd>{new Date(receipt.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div>
      <div><dt>Order type</dt><dd>{receipt.order_type ? typeLabels[receipt.order_type] : '—'}</dd></div>
    </dl>
    <div className="receipt-paper-items"><div className="receipt-paper-row receipt-paper-column-head"><span>ITEM / QTY</span><span>AMOUNT</span></div>
      {receipt.items.map(item => <div className="receipt-paper-item" key={item.product_id}><div><strong>{item.product_name}</strong><small>{item.quantity} × {formatPeso(item.unit_price_centavos)}</small></div><strong>{formatPeso(item.subtotal_centavos)}</strong></div>)}
    </div>
    <dl className="receipt-paper-totals">
      <div><dt>Subtotal</dt><dd>{formatPeso(subtotal)}</dd></div>
      <div><dt>Discounts</dt><dd>{formatPeso(0)}</dd></div>
      <div><dt>Additional tax</dt><dd>{formatPeso(0)}</dd></div>
      <div className="receipt-paper-grand"><dt>Total</dt><dd>{formatPeso(receipt.total_centavos)}</dd></div>
    </dl>
    <dl className="receipt-paper-meta receipt-paper-payment">
      <div><dt>Payment</dt><dd>{methodLabels[receipt.payment_method]}</dd></div>
      <div><dt>Amount paid</dt><dd>{formatPeso(receipt.paid_centavos)}</dd></div>
      {receipt.payment_method === 'cash' && <div><dt>Change</dt><dd>{formatPeso(receipt.change_centavos)}</dd></div>}
    </dl>
    <p className="receipt-paper-note">No discounts or additional tax were applied to this order.</p>
    <p className="receipt-paper-thanks">Thank you for choosing Verde Coffee!</p>
  </article>
}
