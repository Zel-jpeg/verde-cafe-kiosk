import { readFileSync } from 'node:fs'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseFeedback, submitFeedback } from '../server/feedback'
import feedbackHandler from '../api/feedback'
import adminHandler from '../api/admin/feedback'

const checkoutKey = '20000000-0000-4000-8000-000000000001'
const transactionId = '30000000-0000-4000-8000-000000000001'
const input = { checkoutKey, rating: 4, comment: 'Easy to order.' }
let order: Record<string, unknown> | null
let saved: { transaction_id: string; rating: number; comment: string | null } | null
let adminRole: boolean
let databaseFailure: boolean
let rows: Record<string, unknown>[]
const insert = vi.fn()
const from = vi.fn()
const range = vi.fn()
const sort = vi.fn()
const getUser = vi.fn()
vi.mock('../server/supabase', () => ({ serverDb: () => ({ from, auth: { getUser } }) }))

function request(method = 'POST', body: unknown = input, authorization?: string, page?: unknown) {
  return { method, body, headers: { authorization }, query: { page } } as unknown as VercelRequest
}
function response() {
  const res = { setHeader: vi.fn(), status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
  order = { id: transactionId, total_centavos: 4500, paid_centavos: 5000, change_centavos: 500, transaction_items: [{ id: 1 }] }
  saved = null; adminRole = false; databaseFailure = false; rows = []
  getUser.mockImplementation(async (token: string) => ({ data: { user: token === 'valid' ? { id: 'user-1' } : null }, error: null }))
  insert.mockImplementation(async (value: typeof saved) => {
    if (databaseFailure) return { error: { code: '42P01', message: 'private database details' } }
    if (saved) return { error: { code: '23505' } }
    saved = value
    return { error: null }
  })
  range.mockImplementation(async () => ({ data: rows, error: databaseFailure ? { message: 'private details' } : null }))
  from.mockImplementation((table: string) => {
    const filters: Record<string, unknown> = {}
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn((key: string, value: unknown) => { filters[key] = value; return query }),
      maybeSingle: vi.fn(async () => ({
        data: table === 'transactions' ? (filters.idempotency_key === checkoutKey ? order : null) :
          table === 'user_roles' ? (adminRole ? { role: 'admin' } : null) : saved,
        error: databaseFailure && table !== 'user_roles' ? { message: 'private details' } : null,
      })),
      insert,
      order: sort.mockImplementation(() => query),
      range,
    }
    return query
  })
})

describe('feedback validation and completed-order capability', () => {
  it('accepts 1–5 only, integer ratings, and at most 500 comment characters', () => {
    for (const rating of [1, 2, 3, 4, 5]) expect(parseFeedback({ ...input, rating }).rating).toBe(rating)
    for (const rating of [0, 6, 1.5, '5', null, undefined, NaN]) expect(() => parseFeedback({ ...input, rating })).toThrow()
    expect(parseFeedback({ ...input, comment: 'a'.repeat(500) }).comment).toHaveLength(500)
    expect(() => parseFeedback({ ...input, comment: 'a'.repeat(501) })).toThrow()
    expect(parseFeedback({ checkoutKey, rating: 1 }).comment).toBeNull()
    expect(parseFeedback({ ...input, comment: '  ' }).comment).toBeNull()
    for (const extra of [{ orderId: transactionId }, { name: 'Customer' }, { email: 'a@example.com' }]) {
      expect(() => parseFeedback({ ...input, ...extra })).toThrow()
    }
  })
  it('rejects invalid proof, public reference, order UUID, and another checkout key', async () => {
    for (const proof of ['', 'VC-RECEIPT', transactionId, '20000000-0000-4000-8000-000000000002']) {
      await expect(submitFeedback({ ...input, checkoutKey: proof })).rejects.toThrow()
    }
    expect(insert).not.toHaveBeenCalled()
  })
  it('rejects missing, unpaid, inconsistent, or incomplete orders', async () => {
    for (const invalid of [null, { ...order, paid_centavos: 4000 }, { ...order, total_centavos: 0 }, { ...order, change_centavos: 10 }, { ...order, transaction_items: [] }]) {
      order = invalid
      await expect(submitFeedback(input)).rejects.toMatchObject({ status: 403 })
    }
    expect(insert).not.toHaveBeenCalled()
  })
  it('saves only rating, normalized comment, and the verified transaction relationship', async () => {
    await expect(submitFeedback({ ...input, comment: '  Easy to order.  ' })).resolves.toEqual({ saved: true })
    expect(insert).toHaveBeenCalledWith({ transaction_id: transactionId, rating: 4, comment: 'Easy to order.' })
  })
})

describe('feedback retries and HTTP boundary', () => {
  it('handles identical simultaneous submissions without creating another row', async () => {
    await expect(Promise.all([submitFeedback(input), submitFeedback(input)])).resolves.toEqual([{ saved: true }, { saved: true }])
    expect(saved).toEqual({ transaction_id: transactionId, rating: 4, comment: input.comment })
  })
  it('confirms the saved submission on retry after a lost response', async () => {
    await submitFeedback(input) // response discarded by customer
    await expect(submitFeedback(input)).resolves.toEqual({ saved: true })
    expect(saved?.rating).toBe(4)
  })
  it('rejects changes to accepted rating or comment', async () => {
    await submitFeedback(input)
    await expect(submitFeedback({ ...input, rating: 5 })).rejects.toMatchObject({ status: 409 })
    await expect(submitFeedback({ ...input, comment: 'Different' })).rejects.toMatchObject({ status: 409 })
    expect(saved?.comment).toBe(input.comment)
  })
  it('does not report saved on a database failure and allows retry', async () => {
    databaseFailure = true
    await expect(submitFeedback(input)).rejects.toMatchObject({ status: 503 })
    expect(saved).toBeNull()
    databaseFailure = false
    await expect(submitFeedback(input)).resolves.toEqual({ saved: true })
  })
  it('does not acknowledge a failed insert even with a valid completed order', async () => {
    insert.mockResolvedValueOnce({ error: { code: '42P01', message: 'Table unavailable' } })
    await expect(submitFeedback(input)).rejects.toMatchObject({ status: 503 })
    expect(saved).toBeNull()
    await expect(submitFeedback(input)).resolves.toEqual({ saved: true })
  })
  it('does not acknowledge duplicates unless the original row can be verified', async () => {
    await submitFeedback(input)
    const originalFrom = from.getMockImplementation()!
    from.mockImplementation((table: string) => {
      const query = originalFrom(table)
      if (table === 'order_feedback') query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Read unavailable' } })
      return query
    })
    await expect(submitFeedback(input)).rejects.toMatchObject({ status: 503 })
  })
  it('blocks public GET/list access and requires a valid proof for POST', async () => {
    const get = response()
    await feedbackHandler(request('GET'), get)
    expect(get.status).toHaveBeenCalledWith(405)
    expect(from).not.toHaveBeenCalled()
    const post = response()
    await feedbackHandler(request('POST', { rating: 4 }), post)
    expect(post.status).toHaveBeenCalledWith(400)
    expect(post.json).not.toHaveBeenCalledWith({ saved: true })
    expect(post.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
  })
})

describe('admin-only feedback review', () => {
  it.each(['PGRST205', '42P01'])('explains the missing feedback migration for %s without exposing database details', async code => {
    adminRole = true
    range.mockResolvedValueOnce({ data: null, error: { code, message: 'private database details' } })
    const res = response()
    await adminHandler(request('GET', undefined, 'Bearer valid'), res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ error: 'Customer feedback is not set up yet. Apply the order-feedback migration in Supabase, then retry.' })
  })
  it('rejects anonymous, expired, and ordinary authenticated users before reading feedback', async () => {
    for (const [token, status] of [[undefined, 401], ['Bearer expired', 401], ['Bearer valid', 403]] as const) {
      const res = response()
      await adminHandler(request('GET', undefined, token), res)
      expect(res.status).toHaveBeenCalledWith(status)
    }
    expect(from.mock.calls.some(([table]) => table === 'order_feedback')).toBe(false)
  })
  it('returns a bounded page, newest first, without capability keys', async () => {
    adminRole = true
    rows = Array.from({ length: 21 }, (_, id) => ({ id: String(id), rating: 5, comment: '<script>plain text</script>', created_at: '2026-10-07T00:00:00Z', transactions: { reference: 'VC-TEST' } }))
    const res = response()
    await adminHandler(request('GET', undefined, 'Bearer valid', '2'), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(range).toHaveBeenCalledWith(40, 60)
    expect(sort.mock.calls).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]])
    const body = res.json.mock.calls[0][0]
    expect(body.feedback).toHaveLength(20)
    expect(body.hasMore).toBe(true)
    expect(body.feedback[0].order_reference).toBe('VC-TEST')
    expect(JSON.stringify(body)).not.toContain(checkoutKey)
    expect(JSON.stringify(body)).not.toContain('idempotency_key')
  })
  it('provides empty pages, rejects bad page numbers and writes, and surfaces read failures', async () => {
    adminRole = true
    const empty = response()
    await adminHandler(request('GET', undefined, 'Bearer valid'), empty)
    expect(empty.json).toHaveBeenCalledWith({ feedback: [], hasMore: false })
    for (const page of ['-1', '1.5', 'all', ['0', '1'], '100001']) {
      const res = response()
      await adminHandler(request('GET', undefined, 'Bearer valid', page), res)
      expect(res.status).toHaveBeenCalledWith(400)
    }
    const write = response()
    await adminHandler(request('POST', undefined, 'Bearer valid'), write)
    expect(write.status).toHaveBeenCalledWith(405)
    databaseFailure = true
    const failed = response()
    await adminHandler(request('GET', undefined, 'Bearer valid'), failed)
    expect(failed.status).toHaveBeenCalledWith(503)
  })
})

it('migration restricts browser access and enforces uniqueness and field bounds', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20261007000000_order_feedback.sql', import.meta.url), 'utf8')
  expect(sql).toContain('enable row level security')
  expect(sql).toContain('revoke all on public.order_feedback from public, anon, authenticated')
  expect(sql).toContain('grant select, insert on public.order_feedback to service_role')
  expect(sql).not.toContain('create policy')
  expect(sql).toContain('transaction_id uuid not null unique references public.transactions(id)')
  expect(sql).toContain('rating integer not null check (rating between 1 and 5)')
  expect(sql).toContain('char_length(comment) <= 500')
  expect(sql).toContain('created_at timestamptz not null default now()')
})
