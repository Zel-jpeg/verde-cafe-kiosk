import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAdmin } from '../server/adminAuth'
import type { VercelRequest } from '@vercel/node'

const getUser = vi.fn()
const maybeSingle = vi.fn()
const eq = vi.fn(() => ({ eq, maybeSingle }))
const select = vi.fn(() => ({ eq }))
const from = vi.fn(() => ({ select }))
vi.mock('../server/supabase', () => ({ serverDb: () => ({ auth: { getUser }, from }) }))
const request = (authorization?: string) => ({ headers: { authorization } }) as VercelRequest

describe('server admin authorization', () => {
  beforeEach(() => { getUser.mockReset(); maybeSingle.mockReset(); from.mockClear() })
  it('rejects missing and expired tokens', async () => {
    await expect(requireAdmin(request())).rejects.toMatchObject({ status: 401 })
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') })
    await expect(requireAdmin(request('Bearer expired'))).rejects.toMatchObject({ status: 401 })
  })
  it('rejects signed-in non-admin users after querying server roles', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(requireAdmin(request('Bearer token'))).rejects.toMatchObject({ status: 403 })
    expect(from).toHaveBeenCalledWith('user_roles')
  })
  it('accepts a verified admin role', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    maybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null })
    await expect(requireAdmin(request('Bearer token'))).resolves.toMatchObject({ userId: 'user-1' })
  })
})
