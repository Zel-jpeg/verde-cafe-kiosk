import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ZodError } from 'zod'

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

export function method(req: VercelRequest, allowed: string) {
  if (req.method !== allowed) throw new HttpError(405, 'Method not allowed')
}

export function handleError(res: VercelResponse, error: unknown) {
  const status = error instanceof HttpError ? error.status : error instanceof ZodError ? 400 : 500
  const message = error instanceof HttpError ? error.message : error instanceof ZodError ? 'Please check the submitted fields.' : 'A server error occurred. Please try again.'
  if (status === 500) console.error(error)
  return res.status(status).json({ error: message })
}
