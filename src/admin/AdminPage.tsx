import { useEffect, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { formatPeso } from '../../shared/money'
import type { Product } from '../../shared/types'
import { categoryIcon } from '../lib/productPresentation'
import { ProductThumbnail } from '../components/ProductThumbnail'
import { ProductEditDialog } from './ProductEditDialog'
import { useAdminAccess } from './useAdminAccess'

export function AdminPage() {
  const { session, products, refresh, rememberProduct, category, setCategory, status, setStatus, feedbackPage, setFeedbackPage, feedbackPages, loadFeedback } = useAdminAccess()
  const [selected, setSelected] = useState<Product | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string>(() => typeof location.state?.productMessage === 'string' ? location.state.productMessage : '')
  const feedbackState = feedbackPages[feedbackPage]
  const feedback = feedbackState?.data || { feedback: [], hasMore: false }
  const feedbackLoading = feedbackState?.loading ?? true
  const feedbackError = feedbackState?.error

  useEffect(() => {
    if (location.state?.productMessage) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])
  useEffect(() => {
    void loadFeedback(feedbackPage)
  }, [feedbackPage, loadFeedback])

  function saved(product: Product) {
    setSelected(null); setMessage(`${product.name} was ${product.active ? 'saved' : 'archived'} successfully.`)
    void refresh().catch(() => {})
  }
  const categories = Array.from(new Set(products.map(product => product.category || 'Uncategorized')))
  const visible = products.filter(product => (category === null || (product.category || 'Uncategorized') === category) &&
    (status === 'All' || (status === 'Active' ? product.active : !product.active)))

  return <>
    {selected && session && <ProductEditDialog key={selected.id} product={selected} token={session.access_token} onClose={() => setSelected(null)} onSaved={saved} onPersisted={rememberProduct} />}
    <main className="admin-main" id="main-content">
      <div className="admin-intro"><div><p className="eyebrow">MENU MANAGEMENT</p><h1>Good things start here.</h1><p>Keep your menu fresh and inventory up to date.</p></div><div className="admin-actions"><Link className="primary" to="/admin/products/new"><Plus size={18} aria-hidden="true" /> Add product</Link></div></div>
      {message && <div className="notice" role="status"><span>{message}</span><button type="button" onClick={() => setMessage('')}>Dismiss</button></div>}
      <section className="admin-catalog" aria-labelledby="admin-products-title">
        <div className="admin-catalog-heading"><div><p className="eyebrow">MADE FOR YOUR MOMENT</p><h2 id="admin-products-title">Your products</h2><p>Choose a card to edit its details.</p></div><span>{visible.length} of {products.length} products</span></div>
        <div className="admin-catalog-filters">
          <div className="admin-category-filters" role="group" aria-label="Product category"><button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>All categories</button>{categories.map(item => { const Icon = categoryIcon(item); return <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}><Icon size={16} aria-hidden="true" />{item}</button> })}</div>
          <div className="admin-status-filters" role="group" aria-label="Product status">{['All', 'Active', 'Archived'].map(item => <button type="button" key={item} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}</div>
        </div>
        {visible.length === 0 ? <p className="empty-state">No products match these filters.</p> : <div className="admin-catalog-grid">{visible.map(product => {
          const state = !product.active ? 'Archived' : product.stock_quantity === 0 ? 'Sold out' : 'Active'
          return <button type="button" className="admin-catalog-card" key={product.id} aria-label={`Edit ${product.name}, ${state}, ${product.stock_quantity} in stock, ${formatPeso(product.price_centavos)}`} onClick={() => setSelected(product)}>
            <div className="admin-card-visual"><ProductThumbnail product={product} className="admin-card-image" /><span className={`admin-card-status ${state === 'Archived' ? 'is-archived' : state === 'Sold out' ? 'is-sold-out' : ''}`}>{state}</span></div>
            <div className="admin-card-info"><span className="admin-card-category">{product.category || 'Uncategorized'}</span><h3>{product.name}</h3><p>{product.description || 'No description yet.'}</p><span className="admin-card-stock">{product.stock_quantity.toLocaleString('en-PH')} in stock</span><div className="admin-card-bottom"><strong>{formatPeso(product.price_centavos)}</strong><span className="admin-edit-mark"><Pencil size={18} aria-hidden="true" /><span>Edit</span></span></div></div>
          </button>
        })}</div>}
      </section>
      <section className="admin-feedback" aria-labelledby="admin-feedback-title" aria-busy={feedbackLoading}>
        <div className="admin-feedback-heading"><div><p className="eyebrow">ORDERING EXPERIENCE</p><h2 id="admin-feedback-title">Customer feedback</h2></div><span>Newest first · 20 per page</span></div>
        {feedbackError && <div><p className="field-error" role="alert">{feedbackError}</p><button className="secondary" onClick={() => void loadFeedback(feedbackPage, true)}>Retry feedback loading</button></div>}
        {feedbackLoading ? <p role="status">Loading customer feedback…</p> : feedback.feedback.length === 0 ? !feedbackError && <p className="feedback-note">No customer feedback on this page yet.</p> : <ul className="admin-feedback-list">{feedback.feedback.map(item => <li key={item.id}>
          <div className="admin-feedback-meta"><strong aria-label={`${item.rating} out of 5 stars`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)} <span>{item.rating}/5</span></strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
          <p className="admin-feedback-reference">Order {item.order_reference}</p>
          <p className="admin-feedback-comment">{item.comment || 'No comment provided.'}</p>
        </li>)}</ul>}
        <div className="admin-feedback-pagination"><button className="secondary" disabled={feedbackPage === 0 || feedbackLoading} onClick={() => setFeedbackPage(feedbackPage - 1)}>Previous</button><span>Page {feedbackPage + 1}</span><button className="secondary" disabled={feedbackLoading || Boolean(feedbackError) || !feedback.hasMore} onClick={() => setFeedbackPage(feedbackPage + 1)}>Next</button></div>
      </section>
    </main>
  </>
}


