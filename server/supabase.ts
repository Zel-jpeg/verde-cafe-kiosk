import { createClient } from '@supabase/supabase-js'
import { HttpError } from './http.js'

export function serverDb() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key || url.includes('YOUR_PROJECT') || key.startsWith('YOUR_')) throw new HttpError(503, 'Supabase server configuration is missing.')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function imageUrl(path: string | null): string | null {
  if (!path) return null
  const url = process.env.SUPABASE_URL
  if (!url) return null
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/product-images/${path.split('/').map(encodeURIComponent).join('/')}`
}
