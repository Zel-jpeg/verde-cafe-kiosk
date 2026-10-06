import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref } from 'react'
import { Save } from 'lucide-react'
import type { Product } from '../../shared/types'
import { parsePeso } from '../../shared/money'
import { api } from '../lib/api'
import { productPhoto } from '../lib/productPresentation'
import { ImageField } from './ImageField'

type FormState = { name: string; description: string; category: string; price: string; stock: string; active: boolean }
const blank: FormState = { name: '', description: '', category: '', price: '', stock: '0', active: true }
// Register before BrowserRouter subscribes. On Window, an earlier popstate
// listener can synchronously unmount the form before a later listener runs.
let activeHistoryGuard: ((event: PopStateEvent) => void) | null = null
const dispatchHistoryGuard = (event: PopStateEvent) => activeHistoryGuard?.(event)
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', dispatchHistoryGuard, true)
  import.meta.hot?.dispose(() => window.removeEventListener('popstate', dispatchHistoryGuard, true))
}
function values(product?: Product): FormState {
  return product ? { name: product.name, description: product.description || '', category: product.category || '', price: (product.price_centavos / 100).toFixed(2), stock: String(product.stock_quantity), active: product.active } : { ...blank }
}
export type ProductFormHandle = { cancel: (after?: () => void) => void }
type Props = {
  ref?: Ref<ProductFormHandle>
  product?: Product
  token: string
  onCancel: () => void
  onSaved: (product: Product) => void
  onPersisted?: (product: Product) => void
}

export function ProductForm({ ref, product, token, onCancel, onSaved, onPersisted }: Props) {
  const [form, setForm] = useState(() => values(product))
  const [baseline, setBaseline] = useState(() => values(product))
  const [savedProduct, setSavedProduct] = useState(product)
  const savedRef = useRef(product)
  const [image, setImage] = useState<Blob | null>(null)
  const [converting, setConverting] = useState(false)
  const convertingRef = useRef(false)
  const [imageVersion, setImageVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [partial, setPartial] = useState(false)
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline) || Boolean(image) || converting

  function cancel(after = onCancel) {
    if (lock.current) return
    if (dirty && !window.confirm('Discard unsaved changes? Any product details already saved will remain in the catalog.')) return
    after()
  }
  useImperativeHandle(ref, () => ({ cancel }))
  useLayoutEffect(() => {
    if (!dirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const index: unknown = window.history.state?.idx
    let restoring = false
    // BrowserRouter does not expose a navigation blocker. Capture browser Back /
    // Forward before its popstate listener so a declined dismissal keeps the form.
    const guardHistory = (event: PopStateEvent) => {
      if (restoring) { restoring = false; event.stopImmediatePropagation(); return }
      const nextIndex: unknown = event.state?.idx
      if (typeof index !== 'number' || typeof nextIndex !== 'number' || nextIndex === index) return
      if (!lock.current && window.confirm('Discard unsaved changes? Any product details already saved will remain in the catalog.')) return
      event.stopImmediatePropagation(); restoring = true
      window.history.go(index - nextIndex)
    }
    window.addEventListener('beforeunload', warn)
    activeHistoryGuard = guardHistory
    return () => {
      window.removeEventListener('beforeunload', warn)
      if (activeHistoryGuard === guardHistory) activeHistoryGuard = null
    }
  }, [dirty, busy])

  function field<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm(previous => ({ ...previous, [name]: value }))
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || convertingRef.current) return
    const price = parsePeso(form.price)
    if (!form.name.trim()) { setError('Enter a product name.'); return }
    if (price === null || price <= 0 || price > 100_000_000) { setError('Enter a positive price with up to two decimal places, at most ₱1,000,000.00.'); return }
    if (!/^\d+$/.test(form.stock) || !Number.isSafeInteger(Number(form.stock)) || Number(form.stock) > 1_000_000) {
      setError('Stock must be a nonnegative whole number, at most 1,000,000.'); return
    }
    if (!form.active && (!savedRef.current || savedRef.current.active) && !window.confirm('Archive this product? It will be excluded from the customer menu. Historical receipts keep their original details.')) return
    lock.current = true; setBusy(true); setError('')
    try {
      let saved = savedRef.current
      // Retain the ID immediately after creation. Image retries never POST again.
      if (!saved || JSON.stringify(form) !== JSON.stringify(baseline)) {
        const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category.trim() || null, price_centavos: price, stock_quantity: Number(form.stock), active: form.active }
        const result = await api.saveProduct(token, payload, saved?.id)
        saved = result.product; savedRef.current = saved; setSavedProduct(saved)
        setBaseline({ ...form }); onPersisted?.(saved)
      }
      if (image) {
        try {
          const uploaded = await api.uploadImage(token, saved.id, image)
          saved = { ...saved, ...uploaded }; savedRef.current = saved; setSavedProduct(saved)
          setImage(null); setImageVersion(value => value + 1); onPersisted?.(saved)
        } catch (uploadError) {
          setPartial(true)
          setError(`Product details were saved, but the image was not uploaded. ${saved.image_url ? 'The previous image is unchanged.' : 'The product has no uploaded image.'} Retry to upload to this same product; no duplicate will be created. ${uploadError instanceof Error ? uploadError.message : 'Please try again.'}`)
          return
        }
      }
      setPartial(false); onSaved(saved)
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Product could not be saved. Your entered values are retained.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <form className="admin-product-form" onSubmit={event => void save(event)} aria-busy={busy || converting}>
    {partial && savedProduct && <p className="admin-partial" role="status">Product details saved · ID: {savedProduct.id}. You can retry the image, discard it and finish, or return to the catalog with the saved product.</p>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <fieldset disabled={busy}>
      <div className="form-grid">
        <label className="span-two">Product name<input autoFocus value={form.name} maxLength={100} required onChange={event => field('name', event.target.value)} placeholder="e.g. Iced Latte" /></label>
        <label>Price (₱)<input inputMode="decimal" value={form.price} required onChange={event => field('price', event.target.value)} placeholder="95.00" /></label>
        <label>Stock quantity<input inputMode="numeric" value={form.stock} required aria-describedby="admin-stock-help" onChange={event => field('stock', event.target.value)} /></label>
        <p id="admin-stock-help" className="span-two admin-image-help">Inventory available to sell, in whole units.</p>
        <label className="span-two">Category<input value={form.category} maxLength={50} onChange={event => field('category', event.target.value)} placeholder="Coffee, Food, Pastries…" /></label>
        <label className="span-two">Description<textarea value={form.description} maxLength={500} rows={3} onChange={event => field('description', event.target.value)} placeholder="A short note about this item" /></label>
      </div>
      <label className="switch-row"><input type="checkbox" checked={form.active} onChange={event => field('active', event.target.checked)} /><span>{form.active ? 'Active in customer menu' : 'Archived · hidden from customer menu'}</span></label>
      {product && !product.active && <p className="admin-image-help">Check Active in customer menu and save to restore this product.</p>}
      <ImageField key={imageVersion} currentUrl={savedProduct ? productPhoto(savedProduct)?.path || null : null} disabled={busy} onChange={setImage} onPending={pending => { convertingRef.current = pending; setConverting(pending) }} />
    </fieldset>
    <div className="admin-form-actions">
      <button type="button" className="secondary" disabled={busy} onClick={() => cancel()}>Cancel</button>
      <button type="submit" className="primary" disabled={busy || converting}><Save size={18} aria-hidden="true" />{busy ? 'Saving…' : converting ? 'Preparing image…' : partial ? image ? 'Retry image upload' : 'Finish with saved details' : product ? 'Save changes' : 'Create product'}</button>
    </div>
  </form>
}
