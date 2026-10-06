import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { Product } from '../../shared/types'
import { ProductForm } from './ProductForm'
import type { ProductFormHandle } from './ProductForm'

export function ProductEditDialog({ product, token, onClose, onSaved, onPersisted }: {
  product: Product; token: string; onClose: () => void; onSaved: (product: Product) => void; onPersisted: (product: Product) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<ProductFormHandle>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const element = dialog.current
    const previousOverflow = document.body.style.overflow
    element?.showModal(); document.body.style.overflow = 'hidden'
    element?.querySelector<HTMLInputElement>('input')?.focus()
    return () => {
      if (element?.open) element.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])
  return <dialog ref={dialog} className="admin-edit-dialog" aria-labelledby="admin-edit-title" onCancel={event => { event.preventDefault(); form.current?.cancel() }} onKeyDown={event => {
    if (event.key !== 'Tab') return
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, textarea, select, [tabindex="0"]')).filter(item => !item.matches(':disabled') && item.getClientRects().length > 0)
    const first = items[0], last = items.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }}>
    <div className="admin-dialog-heading"><div><p className="eyebrow">EDIT PRODUCT</p><h2 id="admin-edit-title">{product.name}</h2></div><button className="secondary" type="button" aria-label="Close product editor" onClick={() => form.current?.cancel()}><X size={20} /></button></div>
    <ProductForm ref={form} product={product} token={token} onCancel={onClose} onSaved={onSaved} onPersisted={onPersisted} />
  </dialog>
}
