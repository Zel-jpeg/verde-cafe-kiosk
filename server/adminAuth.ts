import type { VercelRequest } from '@vercel/node'
import { HttpError } from './http.js'
import { serverDb } from './supabase.js'

export async function requireAdmin(req: VercelRequest) {
  const match = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization ?? ''))
  if (!match) throw new HttpError(401, 'Admin sign-in is required.')
  const db = serverDb()
  const { data: auth, error: authError } = await db.auth.getUser(match[1])
  if (authError || !auth.user) throw new HttpError(401, 'Your session has expired. Sign in again.')
  const { data: role, error: roleError } = await db.from('user_roles').select('role').eq('user_id', auth.user.id).eq('role', 'admin').maybeSingle()
  if (roleError) throw roleError
  if (!role) throw new HttpError(403, 'This account does not have admin access.')
  return { db, userId: auth.user.id }
}
