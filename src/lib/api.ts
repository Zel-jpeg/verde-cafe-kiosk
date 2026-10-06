import type { FeedbackPage, Product, Receipt } from '../../shared/types'

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError' }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(path, init) }
  catch { throw new Error('Cannot reach the kiosk server. Check your connection and try again.') }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The API is unavailable. Start the full app with vercel dev and configure Supabase.')
  }
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new ApiError(body.error || `Request failed (${response.status}).`, response.status)
  return body as T
}

export const api = {
  products: () => request<{ products: Product[] }>('/api/products'),
  checkout: (body: unknown) => request<{ receipt: Receipt }>('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  submitFeedback: (body: { checkoutKey: string; rating: number; comment: string }) => request<{ saved: true }>('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  adminFeedback: (token: string, page = 0) => request<FeedbackPage>(`/api/admin/feedback?page=${page}`, { headers: { Authorization: `Bearer ${token}` } }),
  adminProducts: (token: string) => request<{ products: Product[] }>('/api/admin/products', { headers: { Authorization: `Bearer ${token}` } }),
  saveProduct: (token: string, product: unknown, id?: string) => request<{ product: Product }>('/api/admin/products', {
    method: id ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(id ? { id, ...product as object } : product),
  }),
  uploadImage: (token: string, productId: string, image: Blob) => request<{ image_path: string; image_url: string }>('/api/admin/images?productId=' + encodeURIComponent(productId), {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/webp' }, body: image,
  }),
}
