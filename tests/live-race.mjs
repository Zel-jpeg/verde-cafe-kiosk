// Run against a temporary active product with stock 1:
// node tests/live-race.mjs <product-id> <price-centavos> [base-url]
const [productId, priceText, baseUrl = 'http://127.0.0.1:3000'] = process.argv.slice(2)
const price = Number(priceText)
if (!productId || !Number.isSafeInteger(price) || price <= 0) throw new Error('Pass a product UUID and positive centavo price')

async function submit(key) {
  const response = await fetch(`${baseUrl}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      idempotencyKey: key,
      items: [{ product_id: productId, quantity: 1 }],
      paymentMethod: 'qr',
      orderType: 'dine_in',
      expectedTotalCentavos: price,
    }),
  })
  return { status: response.status, body: await response.json() }
}

const keys = [crypto.randomUUID(), crypto.randomUUID()]
const results = await Promise.all(keys.map(submit))
const winnerIndex = results.findIndex(result => result.status === 200)
if (winnerIndex < 0 || results.filter(result => result.status === 200).length !== 1 ||
    !results.some(result => result.status === 409)) {
  throw new Error(`Expected one sale and one conflict: ${JSON.stringify(results)}`)
}
const retry = await submit(keys[winnerIndex])
if (retry.status !== 200 || !results[winnerIndex].body.receipt?.reference ||
    retry.body.receipt?.reference !== results[winnerIndex].body.receipt.reference) {
  throw new Error(`Retry did not return the original receipt: ${JSON.stringify(retry)}`)
}
console.log(JSON.stringify({
  statuses: results.map(result => result.status),
  references: results.map(result => result.body.receipt?.reference ?? null),
  retryStatus: retry.status,
  retryReference: retry.body.receipt.reference,
}))
