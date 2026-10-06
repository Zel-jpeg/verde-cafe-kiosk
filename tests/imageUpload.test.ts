import { PassThrough } from 'node:stream'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../api/admin/images'
import { HttpError } from '../server/http'

const productId = '10000000-0000-4000-8000-000000000001'
const previousPath = `products/${productId}/previous.webp`
const authorize = vi.fn(), upload = vi.fn(), remove = vi.fn(), update = vi.fn()
let updateResult: { data: { id: string; image_path: string } | null; error: Error | null }
vi.mock('../server/adminAuth', () => ({ requireAdmin: () => authorize() }))
vi.mock('../server/supabase', () => ({ imageUrl: (path: string) => `https://storage.example/${path}` }))

function webp(size = 24) {
  const bytes = Buffer.alloc(size, 0xff)
  bytes.write('RIFF', 0); bytes.writeUInt32LE(size - 8, 4); bytes.write('WEBP', 8)
  return bytes
}
function request(chunks: Buffer[], mime = 'image/webp') {
  const restoredBody = new PassThrough()
  for (const chunk of chunks) restoredBody.write(chunk)
  restoredBody.end()
  // Model Vercel's helper-restored events with an already-ended original stream.
  const req = {
    method: 'POST', query: { productId }, headers: { 'content-type': mime },
    on: restoredBody.on.bind(restoredBody),
    async *[Symbol.asyncIterator]() { /* The original body has already been consumed. */ },
  }
  return req as unknown as VercelRequest
}
function response() {
  const res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res); res.json.mockReturnValue(res)
  return res as unknown as VercelResponse & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

beforeEach(() => {
  vi.clearAllMocks()
  upload.mockResolvedValue({ error: null }); remove.mockResolvedValue({ error: null })
  updateResult = { data: { id: productId, image_path: 'new.webp' }, error: null }
  const replacement = {
    eq: vi.fn(() => replacement), is: vi.fn(() => replacement), select: vi.fn(() => replacement),
    maybeSingle: vi.fn(async () => updateResult),
  }
  update.mockReturnValue(replacement)
  const product = { select: () => product, eq: () => product, maybeSingle: async () => ({ data: { id: productId, image_path: previousPath }, error: null }), update }
  authorize.mockResolvedValue({ db: { from: () => product, storage: { from: () => ({ upload, remove }) } } })
})

describe('image upload transport and replacement', () => {
  it('reads binary bytes from helper-restored events rather than an ended async iterator', async () => {
    const bytes = webp(), res = response()
    await handler(request([bytes.subarray(0, 7), bytes.subarray(7)]), res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/\.webp$/), bytes, { contentType: 'image/webp', upsert: false })
    expect(update).toHaveBeenCalledWith({ image_path: expect.any(String) })
    expect(remove).toHaveBeenCalledWith([previousPath])
    expect(upload.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0])
    expect(update.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0])
  })
  it('accepts the 1 MiB boundary and rejects anything larger before Storage', async () => {
    const accepted = response()
    await handler(request([webp(1024 * 1024)]), accepted)
    expect(accepted.status).toHaveBeenCalledWith(200)
    upload.mockClear(); update.mockClear(); remove.mockClear()
    const rejected = response()
    await handler(request([webp(1024 * 1024 + 1)]), rejected)
    expect(rejected.status).toHaveBeenCalledWith(413)
    expect(upload).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled()
  })
  it('reports an empty body accurately rather than as an oversized image', async () => {
    const res = response()
    await handler(request([]), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('No image data') })
    expect(upload).not.toHaveBeenCalled()
  })
  it('still rejects wrong MIME, corrupt signatures and malformed lengths', async () => {
    for (const [bytes, mime] of [[webp(), 'image/png'], [Buffer.alloc(20), 'image/webp'], [Buffer.concat([webp(), Buffer.from([1])]), 'image/webp']] as const) {
      const res = response()
      await handler(request([bytes], mime), res)
      expect(res.status).toHaveBeenCalledWith(415)
    }
    expect(upload).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled()
  })
  it('keeps the previous image if Storage fails', async () => {
    upload.mockResolvedValue({ error: new HttpError(503, 'Storage unavailable.') })
    const res = response()
    await handler(request([webp()]), res)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(update).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled()
  })
  it('cleans only the new upload when a concurrent replacement wins', async () => {
    updateResult = { data: null, error: null }
    const res = response()
    await handler(request([webp()]), res)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0][0]])
    expect(remove).not.toHaveBeenCalledWith([previousPath])
  })
  it('requires verified admin access before reading or uploading the body', async () => {
    authorize.mockRejectedValue(new HttpError(403, 'Admin access required.'))
    const res = response()
    await handler(request([webp()]), res)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(upload).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled()
  })
})
