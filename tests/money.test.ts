import { describe, expect, it } from 'vitest'
import { cartTotal, formatPeso, lineSubtotal, parsePeso } from '../shared/money'

describe('integer-centavo money', () => {
  it('keeps subtotals and totals exact', () => {
    expect(lineSubtotal(4500, 2)).toBe(9000)
    expect(cartTotal([{ price_centavos: 4500, quantity: 2 }, { price_centavos: 5000, quantity: 1 }, { price_centavos: 3500, quantity: 1 }])).toBe(17500)
    expect(formatPeso(17500)).toContain('175.00')
  })
  it('parses only nonnegative peso amounts with at most two decimals', () => {
    expect(parsePeso('200')).toBe(20000)
    expect(parsePeso('140.50')).toBe(14050)
    for (const value of ['', '-1', 'abc', '1.234', '1e3', 'Infinity']) expect(parsePeso(value)).toBeNull()
  })
})
