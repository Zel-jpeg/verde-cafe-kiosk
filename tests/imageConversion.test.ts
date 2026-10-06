/// <reference lib="dom" />
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { convertToWebp } from '../src/lib/convertToWebp'

function webp(size = 24, mime = 'image/webp') {
  const bytes = new Uint8Array(size)
  bytes.set([82, 73, 70, 70], 0); bytes.set([87, 69, 66, 80], 8)
  new DataView(bytes.buffer).setUint32(4, size - 8, true)
  return new Blob([bytes], { type: mime })
}
const close = vi.fn()
const decode = vi.fn()
const encode = vi.fn()
const draw = vi.fn()
let canvases: { width: number; height: number }[]

describe('image conversion safeguards (browser format support is checked separately)', () => {
  beforeEach(() => {
    canvases = []; close.mockReset(); draw.mockReset(); decode.mockReset(); encode.mockReset()
    decode.mockResolvedValue({ width: 2400, height: 1600, close })
    encode.mockImplementation((callback: (output: Blob) => void) => callback(webp()))
    vi.stubGlobal('createImageBitmap', decode)
    vi.stubGlobal('document', { createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: draw }), toBlob: encode }
      canvases.push(canvas); return canvas
    } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('decodes bytes even with missing or inaccurate MIME and requests EXIF orientation', async () => {
    for (const mime of ['', 'application/octet-stream', 'image/jpeg', 'image/avif']) {
      const result = await convertToWebp(new File(['raster bytes'], 'photo.data', { type: mime }))
      expect(result.type).toBe('image/webp')
      expect(result.size).toBeLessThanOrEqual(1024 * 1024)
      expect(decode.mock.calls.at(-1)?.[0].type).toBe('')
      expect(decode.mock.calls.at(-1)?.[1]).toEqual({ imageOrientation: 'from-image' })
    }
    expect(close).toHaveBeenCalledTimes(4)
  })
  it('rejects empty and oversized sources before decoding', async () => {
    await expect(convertToWebp(new File([], 'empty.png'))).rejects.toThrow('empty')
    await expect(convertToWebp(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png'))).rejects.toThrow('10 MiB')
    expect(decode).not.toHaveBeenCalled()
  })
  it('rejects SVG from content, extension, or MIME before decoding', async () => {
    for (const file of [new File(['<svg xmlns="http://www.w3.org/2000/svg" />'], 'hidden.bin'), new File(['<svg/>'], 'hidden.bin'), new File(['<s:svg/>'], 'hidden.bin'), new File(['data'], 'drawing.svg'), new File(['data'], 'drawing.bin', { type: 'image/svg+xml' })]) {
      await expect(convertToWebp(file)).rejects.toThrow('Export the artwork')
    }
    expect(decode).not.toHaveBeenCalled()
  })
  it('does not mistake SVG text in PNG metadata for an SVG file', async () => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), 'tEXtSource\0<svg xmlns="http://www.w3.org/2000/svg"/>'], 'export.png', { type: 'image/png' })
    expect((await convertToWebp(file)).type).toBe('image/webp')
    expect(decode).toHaveBeenCalledOnce()
  })
  it('uses raster bytes instead of inaccurate SVG MIME or filename hints', async () => {
    for (const file of [
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'export.png', { type: 'image/svg+xml' }),
      new File([new Uint8Array([255, 216, 255]), '<svg/>'], 'export.svg'),
    ]) expect((await convertToWebp(file)).type).toBe('image/webp')
    expect(decode).toHaveBeenCalledTimes(2)
  })
  it('rejects actual SVG content renamed to PNG before decoding', async () => {
    const file = new File(['<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'], 'export.png', { type: 'image/png' })
    await expect(convertToWebp(file)).rejects.toThrow('Export the artwork')
    expect(decode).not.toHaveBeenCalled()
  })
  it('still requires the browser to decode a file with a raster header', async () => {
    decode.mockRejectedValue(new Error('Truncated PNG'))
    await expect(convertToWebp(new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'broken.png'))).rejects.toThrow('Export it as JPEG or PNG')
  })
  it('gives actionable decode failure instructions for unsupported or corrupt files', async () => {
    decode.mockRejectedValue(new Error('decode failure'))
    await expect(convertToWebp(new File(['bad'], 'photo.heic'))).rejects.toThrow('Export it as JPEG or PNG')
  })
  it('fits the image within 1200 pixels, preserves aspect ratio, and releases resources', async () => {
    await convertToWebp(new File(['raster'], 'photo.png'))
    expect(draw.mock.calls[0].slice(1)).toEqual([0, 0, 1200, 800])
    expect(close).toHaveBeenCalledOnce()
    expect(canvases[0]).toMatchObject({ width: 0, height: 0 })
  })
  it('does not upscale small images', async () => {
    decode.mockResolvedValue({ width: 90, height: 60, close })
    await convertToWebp(new File(['raster'], 'photo.png'))
    expect(draw.mock.calls[0].slice(1)).toEqual([0, 0, 90, 60])
  })
  it('reduces quality and then dimensions to satisfy the upload limit', async () => {
    let attempts = 0
    encode.mockImplementation((callback: (output: Blob) => void) => callback(webp(++attempts <= 4 ? 1024 * 1024 + 1 : 100)))
    const result = await convertToWebp(new File(['raster'], 'photo.png'))
    expect(result.size).toBe(100)
    expect(encode.mock.calls.slice(0, 4).map(call => call[2])).toEqual([0.82, 0.7, 0.55, 0.4])
    expect(draw.mock.calls[1].slice(1)).toEqual([0, 0, 900, 600])
    expect(canvases.every(canvas => canvas.width === 0 && canvas.height === 0)).toBe(true)
  })
  it('reports conversion progress', async () => {
    const progress = vi.fn()
    await convertToWebp(new File(['raster'], 'photo.png'), progress)
    expect(progress.mock.calls.flat()).toEqual(['Decoding image…', 'Preparing WebP · 1200 × 800 pixels…'])
  })
  it('rejects an encoder fallback to a non-WebP MIME', async () => {
    encode.mockImplementation((callback: (output: Blob) => void) => callback(webp(24, 'image/png')))
    await expect(convertToWebp(new File(['raster'], 'photo.png'))).rejects.toThrow('could not create WebP')
    expect(close).toHaveBeenCalledOnce()
  })
  it('rejects false WebP signatures and mismatched RIFF lengths', async () => {
    for (const output of [new Blob(['not really webp'], { type: 'image/webp' }), new Blob([await webp().arrayBuffer(), 'extra'], { type: 'image/webp' })]) {
      encode.mockImplementation((callback: (output: Blob) => void) => callback(output))
      await expect(convertToWebp(new File(['raster'], 'photo.png'))).rejects.toThrow('valid WebP')
    }
    expect(close).toHaveBeenCalledTimes(2)
  })
  it('releases the bitmap if no canvas context is available', async () => {
    vi.stubGlobal('document', { createElement: () => ({ width: 1, height: 1, getContext: () => null }) })
    await expect(convertToWebp(new File(['raster'], 'photo.png'))).rejects.toThrow('unavailable')
    expect(close).toHaveBeenCalledOnce()
  })
  it('never returns an output above the upload limit', async () => {
    encode.mockImplementation((callback: (output: Blob) => void) => callback(webp(1024 * 1024 + 1)))
    await expect(convertToWebp(new File(['raster'], 'photo.png'))).rejects.toThrow('still over 1 MiB')
    expect(close).toHaveBeenCalledOnce()
  })
})
