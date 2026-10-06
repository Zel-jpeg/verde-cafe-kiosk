import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CreditCard, Minus, Plus, Printer, QrCode, ReceiptText, RefreshCw, ShoppingBag, Trash2, Wallet } from 'lucide-react'
import { cartTotal, formatPeso, parsePeso } from '../../shared/money'
import type { OrderType, PaymentMethod, Product, Receipt } from '../../shared/types'
import { api } from '../lib/api'
import { categoryIcon, productPhoto } from '../lib/productPresentation'
import { AppShell } from '../components/AppShell'
import { BrandArtwork } from '../components/BrandArtwork'
import { ProductThumbnail } from '../components/ProductThumbnail'
import { ReceiptPaper } from '../components/ReceiptPaper'
import { CustomerFeedback } from '../components/CustomerFeedback'
import { WelcomePage } from '../components/WelcomePage'
import { ActionDialog, Toast, useToast } from '../components/Feedback'
import type { DialogState } from '../components/Feedback'

type Step = 'order' | 'review' | 'method' | 'pay' | 'success' | 'receipt'
const methodNames: Record<PaymentMethod, string> = { cash: 'Cash', qr: 'QR Payment', card: 'Credit / Debit Card' }
const orderTypeNames: Record<OrderType, string> = { dine_in: 'Dine In', take_out: 'Take Out' }
export function KioskPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orderType, setOrderType] = useState<OrderType | null>(null)
  const [cart, setCart] = useState<Record<string, number>>({})
  const [step, setStep] = useState<Step>('order')
  const [category, setCategory] = useState('All')
  const [method, setMethod] = useState<PaymentMethod | null>(null)
  const [cash, setCash] = useState('')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [feedbackKey, setFeedbackKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const { toast, showToast, clearToast } = useToast()
  const keyRef = useRef(crypto.randomUUID())
  const mountedRef = useRef(false)
  const catalogRequestRef = useRef<Promise<void> | null>(null)
  const catalogVersionRef = useRef(0)

  const loadProducts = useCallback((refresh = false) => {
    if (!mountedRef.current) return
    if (refresh) catalogVersionRef.current += 1
    setLoading(true)
    setCatalogError(null)
    // Keep the request through StrictMode's effect replay. Refreshes wait for it
    // to settle, and its version prevents an older result from being published.
    if (catalogRequestRef.current) return
    const version = catalogVersionRef.current
    catalogRequestRef.current = api.products().then(data => {
      if (!mountedRef.current || version !== catalogVersionRef.current) return
      if (!Array.isArray(data.products)) throw new Error('The catalog response was invalid.')
      setProducts(data.products)
      const photos = new Set(data.products.map(product => productPhoto(product)?.path).filter((path): path is string => Boolean(path)))
      for (const path of photos) {
        // Image warming is best effort and never gates catalog readiness.
        try { const image = new Image(); image.src = path } catch { /* Use the card's normal image loading. */ }
      }
    }).catch((error: unknown) => {
      if (!mountedRef.current || version !== catalogVersionRef.current) return
      setCatalogError(error instanceof Error ? error.message : 'The menu could not be loaded. Please try again.')
    }).finally(() => {
      catalogRequestRef.current = null
      if (!mountedRef.current) return
      if (version !== catalogVersionRef.current) { loadProducts(); return }
      setLoading(false)
    })
  }, [])
  useEffect(() => {
    mountedRef.current = true
    loadProducts()
    return () => { mountedRef.current = false }
  }, [loadProducts])
  useEffect(() => {
    if (orderType && catalogError) {
      setDialog({ kind: 'error', title: 'Menu unavailable', message: catalogError, primaryLabel: 'Try again', onPrimary: () => { setDialog(null); loadProducts() } })
    }
  }, [catalogError, loadProducts, orderType])

  const lines = useMemo(() => products.filter(product => cart[product.id] > 0).map(product => ({ product, quantity: cart[product.id], subtotal: product.price_centavos * cart[product.id] })), [products, cart])
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const total = cartTotal(lines.map(line => ({ price_centavos: line.product.price_centavos, quantity: line.quantity })))
  const categories = ['All', ...Array.from(new Set(products.map(product => product.category || 'Other')))]
  const visible = products.filter(product => category === 'All' || (product.category || 'Other') === category)
  const CategoryMark = categoryIcon(category)
  const paid = parsePeso(cash)
  const change = paid !== null && paid >= total ? paid - total : null

  function resetKey() { keyRef.current = crypto.randomUUID() }
  function changeQuantity(product: Product, delta: number) {
    const next = (cart[product.id] || 0) + delta
    if (next > product.stock_quantity) { showToast(`Only ${product.stock_quantity} available for ${product.name}.`); return }
    if (next < 0) return
    setCart(previous => { const update = { ...previous }; if (next === 0) delete update[product.id]; else update[product.id] = next; return update })
    resetKey()
    showToast(next === 0 ? `${product.name} removed from your order.` : delta > 0 ? `${product.name} added to your order.` : `${product.name} updated.`)
  }
  function remove(id: string) {
    setCart(previous => { const update = { ...previous }; delete update[id]; return update })
    resetKey(); showToast('Item removed from your order.')
  }
  function chooseMethod(value: PaymentMethod) { setMethod(value); setCash(''); resetKey(); setStep('pay') }
  function changeCash(value: string) { setCash(value); resetKey() }
  function paymentError(message: string) {
    setDialog({ kind: 'error', title: 'Check your payment', message, primaryLabel: 'Correct amount', onPrimary: () => { setDialog(null); window.setTimeout(() => document.getElementById('cash-amount')?.focus(), 0) } })
  }
  async function pay() {
    if (!method || !orderType || busy || lines.length === 0) return
    if (method === 'cash') {
      if (paid === null) { paymentError('Enter a valid amount in pesos, such as 200 or 200.00.'); return }
      if (paid < total) { paymentError(`Insufficient payment. Please add ${formatPeso(total - paid)}.`); return }
    }
    setBusy(true)
    if (method === 'card') await new Promise(resolve => setTimeout(resolve, 900))
    try {
      const checkoutKey = keyRef.current
      const result = await api.checkout({ idempotencyKey: checkoutKey, items: lines.map(line => ({ product_id: line.product.id, quantity: line.quantity })), paymentMethod: method, orderType, expectedTotalCentavos: total, ...(method === 'cash' ? { paidCentavos: paid } : {}) })
      setFeedbackKey(checkoutKey)
      setReceipt(result.receipt); setStep('success'); clearToast()
      setDialog({ kind: 'success', title: 'Payment successful', message: `${formatPeso(result.receipt.total_centavos)} paid by ${methodNames[result.receipt.payment_method]}. Reference ${result.receipt.reference}.`, primaryLabel: 'View receipt', onPrimary: () => { setDialog(null); setStep('receipt') }, secondaryLabel: 'View success screen', onSecondary: () => setDialog(null) })
    } catch (error) {
      setDialog({ kind: 'error', title: 'Payment could not complete', message: (error as Error).message, primaryLabel: 'Try again', onPrimary: () => setDialog(null), secondaryLabel: 'Back to order', onSecondary: () => { setDialog(null); setStep('review') } })
    } finally { setBusy(false) }
  }
  function newTransaction() {
    setCart({}); setReceipt(null); setFeedbackKey(null); setMethod(null); setCash(''); setCategory('All'); setStep('order'); setOrderType(null); resetKey(); clearToast()
    setDialog(null); loadProducts(true)
  }
  function changeOrderType() {
    if (busy || receipt) return
    setMethod(null); setCash(''); setStep('order'); setOrderType(null); resetKey(); clearToast()
    setDialog(null)
  }

  const stepNumber = step === 'order' ? 1 : step === 'review' ? 2 : step === 'method' || step === 'pay' ? 3 : 4
  if (!orderType) return <WelcomePage onChoose={setOrderType} />
  return <AppShell categories={step === 'order' ? categories : undefined} activeCategory={category} onCategory={setCategory}>
    {toast && <Toast message={toast.message} onClose={clearToast} />}
    <ActionDialog dialog={dialog} onClose={() => setDialog(null)} />
    <main className="kiosk-main" id="main-content">
      <div className="progress-header">{!receipt && <button type="button" className="progress-back" onClick={changeOrderType} disabled={busy} aria-label="Back to Dine In or Take Out choices"><ArrowLeft size={18} aria-hidden="true" /> Order type</button>}<div className="stepper" aria-label="Checkout progress">{['Explore menu', 'Review order', 'Payment', 'Receipt'].map((label, index) => <div key={label} className={`step ${index + 1 === stepNumber ? 'current' : ''} ${index + 1 < stepNumber ? 'done' : ''}`} aria-current={index + 1 === stepNumber ? 'step' : undefined}><span>{index + 1}</span><small>{label}</small></div>)}</div></div>

      {step === 'order' && <div className="order-layout">
        <section className="catalog-panel">
          <div className="hero"><div><p className="eyebrow">WELCOME TO VERDE COFFEE · {orderTypeNames[orderType].toUpperCase()}</p><h1>A little green in<br />your everyday.</h1><p>Pick your favorites. We’ll take care of the rest.</p></div><BrandArtwork variant="mascot" /></div>
          <div className="section-heading"><div><p className="eyebrow">MADE FOR YOUR MOMENT</p><h2>Explore our menu</h2></div><span>{products.length} delicious choices</span></div>
          <div className="category-summary"><CategoryMark size={17} aria-hidden="true" /><span>{category === 'All' ? 'All favorites' : category}</span><span>Choose a category in the sidebar</span></div>
          {loading ? <p className="empty-state">Loading today’s menu…</p> : catalogError ? <p className="empty-state">Menu unavailable. Please try again.</p> : visible.length === 0 ? <p className="empty-state">No products in this category yet.</p> : <div className="product-grid" id="menu-products">{visible.map(product =>
            <button type="button" className="product-card" key={product.id} aria-label={`Add ${product.name} for ${formatPeso(product.price_centavos)}`} disabled={product.stock_quantity === 0} onClick={() => changeQuantity(product, 1)}>
              <div className={`product-visual tone-${(product.category || 'Other').toLowerCase().replace(/\W/g, '')}`}>{(() => { const photo = productPhoto(product); const Icon = categoryIcon(product.category); return photo ? <img src={photo.path} alt={photo.alt} loading="lazy" /> : <Icon size={70} aria-hidden="true" strokeWidth={1.5} /> })()}{product.stock_quantity === 0 && <span className="sold-out">Sold out</span>}</div>
              <div className="product-info"><span className="product-category">{product.category || 'Coffee favorite'}</span><h3>{product.name}</h3><p>{product.description || 'Made fresh for you.'}</p><div className="product-bottom"><strong>{formatPeso(product.price_centavos)}</strong><span className="add-symbol"><Plus size={20} /></span></div></div>
            </button>)}</div>}
        </section>
        <CartPanel lines={lines} count={count} total={total} onChange={changeQuantity} onRemove={remove} onReview={() => { if (count > 0) { setStep('review'); clearToast() } }} />
      </div>}

      {step === 'review' && <div className="flow-card wide"><button className="back-link" onClick={() => setStep('order')}><ArrowLeft size={18} /> Back to menu</button><p className="eyebrow">STEP 02 / 04 · {orderTypeNames[orderType].toUpperCase()}</p><h1>Review your order</h1><p className="muted">Adjust quantities here, or go back to browse the menu.</p><div className="review-list">{lines.length === 0 ? <p className="empty-state">Your order is empty. Go back to the menu to add something.</p> : lines.map(line => <div className="review-line review-line-edit" key={line.product.id}><ProductThumbnail product={line.product} /><div className="review-line-info"><strong>{line.product.name}</strong><span>{formatPeso(line.product.price_centavos)} each</span><div className="quantity"><button type="button" aria-label={`Decrease ${line.product.name}`} onClick={() => changeQuantity(line.product, -1)}><Minus size={17} /></button><span>{line.quantity}</span><button type="button" aria-label={`Increase ${line.product.name}`} onClick={() => changeQuantity(line.product, 1)}><Plus size={17} /></button></div></div><strong>{formatPeso(line.subtotal)}</strong></div>)}</div><div className="grand-total" aria-live="polite"><span>Total due</span><strong>{formatPeso(total)}</strong></div><button className="primary full" disabled={lines.length === 0} onClick={() => setStep('method')}>Continue to payment <ArrowRight size={20} /></button></div>}

      {step === 'method' && <div className="flow-card wide"><button className="back-link" onClick={() => setStep('review')}><ArrowLeft size={18} /> Back to order</button><p className="eyebrow">STEP 03 / 04</p><h1>How would you like to pay?</h1><p className="muted">Choose one option to complete your order.</p><div className="amount-banner"><span>AMOUNT DUE</span><strong>{formatPeso(total)}</strong></div><div className="payment-options"><button onClick={() => chooseMethod('cash')}><Wallet size={30} /><strong>Cash</strong><span>Enter your payment and see your change.</span><ArrowRight size={20} /></button><button onClick={() => chooseMethod('qr')}><QrCode size={30} /><strong>QR Payment</strong><span>Simulated scan and confirmation.</span><ArrowRight size={20} /></button><button onClick={() => chooseMethod('card')}><CreditCard size={30} /><strong>Credit / Debit Card</strong><span>Simulated tap, insert, or swipe.</span><ArrowRight size={20} /></button></div></div>}

      {step === 'pay' && method && <div className="flow-card payment-card"><button className="back-link" disabled={busy} onClick={() => setStep('method')}><ArrowLeft size={18} /> Change payment method</button><p className="eyebrow">STEP 03 / 04 · {methodNames[method].toUpperCase()}</p><h1>{methodNames[method]}</h1><div className="amount-banner"><span>AMOUNT DUE</span><strong>{formatPeso(total)}</strong></div>{method === 'cash' ? <div className="cash-box"><label htmlFor="cash-amount">Amount paid (₱)</label><input id="cash-amount" autoFocus inputMode="decimal" placeholder="0.00" value={cash} onChange={event => changeCash(event.target.value)} /><div className="quick-amounts"><button onClick={() => changeCash((total / 100).toFixed(2))}>Exact</button>{[200, 500, 1000].map(value => <button key={value} onClick={() => changeCash(String(value))}>₱{value.toLocaleString()}</button>)}</div><div className="change-row"><span>Change</span><strong>{change === null ? '—' : formatPeso(change)}</strong></div></div> : method === 'qr' ? <div className="simulation-box"><div className="qr-placeholder"><QrCode size={90} strokeWidth={1.5} /><strong>QR simulation</strong></div><p>Scan the displayed code placeholder with your preferred payment app, then confirm below. No real payment will be charged.</p></div> : <div className="simulation-box"><CreditCard size={80} strokeWidth={1.3} /><p>Tap, insert, or swipe at the reader, then process below. This is a simulation; do not enter card details.</p></div>}<button className="primary full" disabled={busy} onClick={() => void pay()}>{busy ? <><RefreshCw size={20} className="spin" /> Processing…</> : method === 'cash' ? <>Pay now <ArrowRight size={20} /></> : method === 'qr' ? <>Confirm simulated payment <ArrowRight size={20} /></> : <>Process simulated payment <ArrowRight size={20} /></>}</button></div>}

      {step === 'success' && receipt && <div className="flow-card success-card"><div className="success-mark"><Check size={38} /></div><p className="eyebrow">ORDER COMPLETE</p><h1>Payment successful!</h1><p className="muted">Thank you for spending a moment with Verde Coffee.</p><div className="success-amount">{formatPeso(receipt.total_centavos)}</div><dl className="details"><div><dt>Reference</dt><dd className="reference">{receipt.reference}</dd></div><div><dt>Order type</dt><dd>{receipt.order_type ? orderTypeNames[receipt.order_type] : '—'}</dd></div><div><dt>Payment method</dt><dd>{methodNames[receipt.payment_method]}</dd></div><div><dt>Amount paid</dt><dd>{formatPeso(receipt.paid_centavos)}</dd></div><div><dt>Change</dt><dd>{formatPeso(receipt.change_centavos)}</dd></div></dl><div className="receipt-actions"><button className="primary full" onClick={() => setStep('receipt')}><ReceiptText size={20} /> View receipt</button><button className="secondary full" onClick={() => window.print()}><Printer size={20} /> Print Receipt</button></div></div>}

      {step === 'receipt' && receipt && <div className="flow-card receipt-card"><h1>Your digital receipt</h1><p className="muted">Keep this reference for your records.</p><ReceiptPaper receipt={receipt} />{feedbackKey && <CustomerFeedback key={receipt.reference} checkoutKey={feedbackKey} />}<div className="receipt-actions"><button className="secondary full" onClick={() => window.print()}><Printer size={20} /> Print Receipt</button><button className="primary full" onClick={newTransaction}><ShoppingBag size={20} /> New transaction</button></div></div>}
    </main><footer className="site-footer">Fresh moments, made simple. <span>Verde Coffee · Self-service kiosk</span></footer>
    {receipt && <div className="print-only"><ReceiptPaper receipt={receipt} /></div>}
  </AppShell>
}

function CartPanel({ lines, count, total, onChange, onRemove, onReview }: { lines: { product: Product; quantity: number; subtotal: number }[]; count: number; total: number; onChange: (product: Product, delta: number) => void; onRemove: (id: string) => void; onReview: () => void }) {
  return <aside className="cart-panel"><div className="cart-top"><div><p className="eyebrow">YOUR SELECTION</p><h2>Your order <span>{count}</span></h2></div><ShoppingBag size={25} /></div>{lines.length === 0 ? <div className="cart-empty"><div><ShoppingBag size={39} strokeWidth={1.6} /></div><strong>Your order is empty</strong><p>Tap a menu favorite to get started.</p></div> : <div className="cart-lines">{lines.map(line => <div className="cart-line" key={line.product.id}><div className="cart-line-top"><ProductThumbnail product={line.product} /><strong>{line.product.name}</strong><button aria-label={`Remove ${line.product.name}`} onClick={() => onRemove(line.product.id)}><Trash2 size={16} /></button></div><small>{formatPeso(line.product.price_centavos)} each</small><div className="cart-line-bottom"><div className="quantity"><button aria-label={`Decrease ${line.product.name}`} onClick={() => onChange(line.product, -1)}><Minus size={17} /></button><span>{line.quantity}</span><button aria-label={`Increase ${line.product.name}`} onClick={() => onChange(line.product, 1)}><Plus size={17} /></button></div><strong>{formatPeso(line.subtotal)}</strong></div></div>)}</div>}<div className="cart-footer"><div className="cart-subtotal"><span>Subtotal</span><strong>{formatPeso(total)}</strong></div><div className="cart-total"><span>Total</span><strong>{formatPeso(total)}</strong></div><button className="primary full" disabled={count === 0} onClick={onReview}>Review order <ArrowRight size={20} /></button><p>Prices are confirmed at checkout.</p></div></aside>
}
