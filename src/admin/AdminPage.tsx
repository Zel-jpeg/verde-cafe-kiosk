import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Archive, ImagePlus, Plus, Save } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { formatPeso, parsePeso } from '../../shared/money'
import type { Product } from '../../shared/types'
import { api } from '../lib/api'
import { authClient } from '../lib/supabaseAuth'
import { AppShell } from '../components/AppShell'
import { ActionDialog } from '../components/Feedback'
import type { DialogState } from '../components/Feedback'
import { ImageField } from './ImageField'
import { ProductThumbnail } from '../components/ProductThumbnail'

type FormState = { name: string; description: string; category: string; price: string; stock: string; active: boolean }
const blank: FormState = { name: '', description: '', category: '', price: '', stock: '0', active: true }

export function AdminPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [authorized, setAuthorized] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(blank)
  const [image, setImage] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const closeDialog = () => setDialog(null)
  const showError = (title: string, message: string) => setDialog({ kind: 'error', title, message, primaryLabel: 'Close', onPrimary: closeDialog })
  const load = useCallback(async (token: string) => {
    try {
      const data = await api.adminProducts(token)
      if (!Array.isArray(data.products)) throw new Error('The admin catalog response was invalid.')
      setProducts(data.products); setAuthorized(true)
    } catch (error) {
      setAuthorized(false); setProducts([])
      console.error('Admin access unavailable:', error)
    } finally { setChecking(false) }
  }, [])

  useEffect(() => {
    if (!authClient) { setChecking(false); return }
    let mounted = true
    void authClient.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) void load(data.session.access_token)
      else setChecking(false)
    })
    const { data: listener } = authClient.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return
      setSession(next)
      if (!next) { setAuthorized(false); setProducts([]); setChecking(false) }
      else void load(next.access_token)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [load])

  function edit(product: Product) {
    setSelected(product); setImage(null)
    setForm({ name: product.name, description: product.description || '', category: product.category || '', price: (product.price_centavos / 100).toFixed(2), stock: String(product.stock_quantity), active: product.active })
  }
  function add() { setSelected(null); setImage(null); setForm(blank) }
  function field<K extends keyof FormState>(name: K, value: FormState[K]) { setForm(previous => ({ ...previous, [name]: value })) }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!session || !authorized) return
    const price = parsePeso(form.price)
    if (price === null || price <= 0) { showError('Check the price', 'Enter a positive price with up to two decimal places.'); return }
    if (!/^\d+$/.test(form.stock) || !Number.isSafeInteger(Number(form.stock))) { showError('Check the stock', 'Stock must be a nonnegative whole number.'); return }
    setBusy(true)
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || null, category: form.category.trim() || null, price_centavos: price, stock_quantity: Number(form.stock), active: form.active }
      const saved = await api.saveProduct(session.access_token, payload, selected?.id)
      setSelected(saved.product)
      if (image) {
        try {
          const uploaded = await api.uploadImage(session.access_token, saved.product.id, image)
          setSelected({ ...saved.product, ...uploaded }); setImage(null)
        } catch (uploadError) {
          await load(session.access_token)
          showError('Image upload failed', `Product details were saved. The previous image remains available. ${(uploadError as Error).message}`)
          return
        }
      }
      await load(session.access_token)
      setDialog({ kind: 'success', title: 'Product saved', message: `${saved.product.name} is up to date in the Verde Coffee catalog.`, primaryLabel: 'Done', onPrimary: closeDialog })
    } catch (error) { showError('Product could not be saved', (error as Error).message) }
    finally { setBusy(false) }
  }
  async function archive(product: Product) {
    if (!session || !authorized) return
    setDialog(null); setBusy(true)
    try {
      await api.saveProduct(session.access_token, { name: product.name, description: product.description, category: product.category, price_centavos: product.price_centavos, stock_quantity: product.stock_quantity, active: false }, product.id)
      await load(session.access_token)
      if (selected?.id === product.id) add()
      setDialog({ kind: 'success', title: 'Product archived', message: `${product.name} is no longer available in the customer menu.`, primaryLabel: 'Done', onPrimary: closeDialog })
    } catch (error) { showError('Archive failed', (error as Error).message) }
    finally { setBusy(false) }
  }
  function confirmArchive(product: Product) {
    setDialog({ kind: 'confirm', title: `Archive ${product.name}?`, message: 'This product will leave the customer menu. Historical receipts will keep their original details.', primaryLabel: 'Archive product', onPrimary: () => void archive(product), secondaryLabel: 'Cancel', onSecondary: closeDialog })
  }

  if (!checking && (!session || !authorized)) return <Navigate to="/admin/login" replace />
  return <AppShell onSignOut={session ? () => void authClient?.auth.signOut() : undefined}>
    <ActionDialog dialog={dialog} onClose={closeDialog} />
    <main className="admin-main" id="main-content">{checking ? <div className="flow-card"><p>Checking admin access…</p></div> : <> <div className="admin-intro"><div><p className="eyebrow">MENU MANAGEMENT</p><h1>Good things start here.</h1><p>Keep your menu fresh and stock up to date.</p></div><div className="admin-actions"><button className="secondary" onClick={add}><Plus size={18} /> Add product</button></div></div><div className="admin-grid"><section className="admin-list"><div className="admin-list-heading"><h2>Products</h2><span>{products.length} total</span></div>{products.map(product => <button className={`admin-product ${selected?.id === product.id ? 'selected' : ''}`} key={product.id} onClick={() => edit(product)}><ProductThumbnail product={product} className="admin-thumb" /><span className="admin-product-name"><strong>{product.name}</strong><small>{product.category || 'Uncategorized'} · {formatPeso(product.price_centavos)}</small></span><span className={`stock-badge ${!product.active ? 'archived' : product.stock_quantity === 0 ? 'out' : ''}`}>{!product.active ? 'Archived' : product.stock_quantity === 0 ? 'Sold out' : `${product.stock_quantity} in stock`}</span></button>)}</section><section className="admin-editor"><div className="editor-heading"><div><p className="eyebrow">{selected ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</p><h2>{selected ? selected.name : 'Add to the menu'}</h2></div>{selected?.active && <button className="archive-button" disabled={busy} onClick={() => confirmArchive(selected)}><Archive size={17} /> Archive</button>}</div><form onSubmit={event => void save(event)}><div className="form-grid"><label className="span-two">Product name<input value={form.name} maxLength={100} required onChange={event => field('name', event.target.value)} placeholder="e.g. Iced Latte" /></label><label>Price (₱)<input inputMode="decimal" value={form.price} required onChange={event => field('price', event.target.value)} placeholder="95.00" /></label><label>Stock quantity<input inputMode="numeric" value={form.stock} required onChange={event => field('stock', event.target.value)} /></label><label className="span-two">Category<input value={form.category} maxLength={50} onChange={event => field('category', event.target.value)} placeholder="Coffee, Food, Pastries…" /></label><label className="span-two">Description<textarea value={form.description} maxLength={500} rows={3} onChange={event => field('description', event.target.value)} placeholder="A short note about this item" /></label></div><label className="switch-row"><input type="checkbox" checked={form.active} onChange={event => field('active', event.target.checked)} /><span>Active in customer menu</span></label><ImageField key={selected?.id || 'new'} currentUrl={selected?.image_url || null} onChange={setImage} onError={message => showError('Image could not be prepared', message)} /><button className="primary full" disabled={busy}><Save size={18} /> {busy ? 'Saving…' : selected ? 'Save changes' : 'Add product'}</button></form><p className="admin-image-note"><ImagePlus size={16} /> PNG and JPEG files are converted to WebP before upload.</p></section></div></>}</main>
  </AppShell>
}


