export function formatPeso(centavos: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(centavos / 100)
}

export function parsePeso(input: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(input.trim())) return null
  const [pesos, cents = ''] = input.trim().split('.')
  const value = Number(pesos) * 100 + Number(cents.padEnd(2, '0'))
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function lineSubtotal(priceCentavos: number, quantity: number): number {
  if (!Number.isSafeInteger(priceCentavos) || priceCentavos < 0 || !Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Invalid money or quantity')
  const result = priceCentavos * quantity
  if (!Number.isSafeInteger(result)) throw new Error('Amount exceeds supported range')
  return result
}

export function cartTotal(lines: { price_centavos: number; quantity: number }[]): number {
  const total = lines.reduce((sum, line) => sum + lineSubtotal(line.price_centavos, line.quantity), 0)
  if (!Number.isSafeInteger(total)) throw new Error('Amount exceeds supported range')
  return total
}
