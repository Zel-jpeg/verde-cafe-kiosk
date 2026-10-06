import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProductForm } from './ProductForm'
import type { ProductFormHandle } from './ProductForm'
import { useAdminAccess } from './useAdminAccess'

export function AddProductPage() {
  const { session, rememberProduct, refresh, registerNavigationGuard } = useAdminAccess()
  const navigate = useNavigate()
  const form = useRef<ProductFormHandle>(null)
  const back = () => navigate('/admin')
  useEffect(() => {
    registerNavigationGuard(after => form.current?.cancel(after))
    return () => registerNavigationGuard(null)
  }, [registerNavigationGuard])
  return <>
    <main className="admin-main admin-add-main" id="main-content">
      {session && <>
        <button className="back-link" type="button" onClick={() => form.current?.cancel(back)}><ArrowLeft size={18} /> Back to products</button>
        <section className="admin-add-panel"><p className="eyebrow">MENU MANAGEMENT</p><h1>Add a product</h1><p>Prepare a new favorite for the Verde Coffee menu.</p>
          <ProductForm ref={form} token={session.access_token} onCancel={back} onPersisted={rememberProduct} onSaved={product => {
            rememberProduct(product); void refresh().catch(() => {})
            navigate('/admin', { replace: true, state: { productMessage: `${product.name} was created successfully.` } })
          }} />
        </section>
      </>}
    </main>
  </>
}
