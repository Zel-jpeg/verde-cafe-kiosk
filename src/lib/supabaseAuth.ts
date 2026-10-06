import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const authClient = url && key && !url.includes('YOUR_PROJECT') && !key.startsWith('YOUR_')
  ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true } })
  : null
