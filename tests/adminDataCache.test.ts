import { describe, expect, it, vi } from 'vitest'
import { AdminDataCache } from '../src/admin/adminDataCache'

function deferred<T>() {
  let resolve!: (data: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

describe('admin data cache', () => {
  it('shares in-flight preloading and navigation requests, then reuses loaded data', async () => {
    const cache = new AdminDataCache(), request = deferred<string[]>()
    const load = vi.fn(() => request.promise)
    const preload = cache.read('products', load)
    const navigation = cache.read('products', load)
    request.resolve(['Coffee'])
    expect(await preload).toEqual(['Coffee'])
    expect(await navigation).toEqual(['Coffee'])
    expect(await cache.read('products', load)).toEqual(['Coffee'])
    expect(load).toHaveBeenCalledOnce()
  })
  it('refreshes explicitly while keeping the previous snapshot available', async () => {
    const cache = new AdminDataCache(), request = deferred<string[]>()
    cache.set('products', ['Old name'])
    const refresh = cache.read('products', () => request.promise, true)
    expect(cache.peek('products')).toEqual(['Old name'])
    request.resolve(['Updated name'])
    expect(await refresh).toEqual(['Updated name'])
    expect(cache.peek('products')).toEqual(['Updated name'])
  })
  it('keeps a saved product and image when an older refresh finishes', async () => {
    const cache = new AdminDataCache(), request = deferred<{ image: string }[]>()
    cache.set('products', [{ image: 'previous.webp' }])
    const refresh = cache.read('products', () => request.promise, true)
    cache.set('products', [{ image: 'replacement.webp' }])
    request.resolve([{ image: 'previous.webp' }])
    expect(await refresh).toEqual([{ image: 'replacement.webp' }])
    expect(cache.peek('products')).toEqual([{ image: 'replacement.webp' }])
  })
  it('prevents an old account request repopulating the cache after sign-out', async () => {
    const cache = new AdminDataCache(), request = deferred<string[]>()
    const oldRequest = cache.read('products', () => request.promise)
    cache.clear()
    request.resolve(['Private archived product'])
    await oldRequest
    expect(cache.peek('products')).toBeUndefined()
    expect(await cache.read('products', async () => ['New account'])).toEqual(['New account'])
  })
  it('does not overwrite a different account cache with an old response', async () => {
    const cache = new AdminDataCache(), request = deferred<string[]>()
    const oldRequest = cache.read('products', () => request.promise)
    cache.clear(); cache.set('products', ['New account product'])
    request.resolve(['Old account product']); await oldRequest
    expect(cache.peek('products')).toEqual(['New account product'])
  })
  it('preserves data on a failed refresh and allows a retry', async () => {
    const cache = new AdminDataCache()
    cache.set('feedback:0', ['Review'])
    await expect(cache.read('feedback:0', async () => { throw new Error('Network unavailable') }, true)).rejects.toThrow('Network unavailable')
    expect(cache.peek('feedback:0')).toEqual(['Review'])
    expect(await cache.read('feedback:0', async () => ['New review'], true)).toEqual(['New review'])
  })
  it('invalidates feedback pages without discarding visible data or the catalog', async () => {
    const cache = new AdminDataCache()
    cache.set('products', ['Coffee']); cache.set('feedback:0', ['Old review']); cache.set('feedback:1', ['Older review'])
    cache.invalidate('feedback:')
    expect(cache.peek('feedback:0')).toEqual(['Old review'])
    const load = vi.fn(async () => ['New review'])
    expect(await cache.read('feedback:0', load)).toEqual(['New review'])
    expect(load).toHaveBeenCalledOnce()
    expect(await cache.read('products', async () => [])).toEqual(['Coffee'])
  })
})
