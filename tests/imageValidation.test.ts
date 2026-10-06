import { describe, expect, it } from 'vitest'
import { imageObjectPath, isWebp, validateWebp } from '../server/imageValidation'

function minimalWebp() {
  return Uint8Array.from([82,73,70,70,4,0,0,0,87,69,66,80])
}
describe('server image validation', () => {
  it('checks MIME, RIFF/WEBP signature, and declared length', () => {
    const image = minimalWebp()
    expect(isWebp(image)).toBe(true)
    expect(() => validateWebp(image, 'image/webp')).not.toThrow()
    expect(() => validateWebp(image, 'image/png')).toThrow()
    expect(() => validateWebp(new Uint8Array(20), 'image/webp')).toThrow()
    expect(() => validateWebp(Uint8Array.from([...image, 1]), 'image/webp')).toThrow()
    expect(() => validateWebp(new Uint8Array(1024 * 1024 + 1), 'image/webp')).toThrow()
  })
  it('generates only product-scoped WebP paths', () => {
    const id = '10000000-0000-4000-8000-000000000001'
    expect(imageObjectPath(id, id)).toBe(`products/${id}/${id}.webp`)
    expect(() => imageObjectPath('../escape', id)).toThrow()
  })
})
