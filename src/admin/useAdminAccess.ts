import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Outlet } from 'react-router-dom'
import type { FeedbackPage, Product } from '../../shared/types'
import { api, ApiError } from '../lib/api'
import { authClient } from '../lib/supabaseAuth'
import { productPhoto } from '../lib/productPresentation'
import { AdminDataCache } from './adminDataCache'

type FeedbackState = { data?: FeedbackPage; loading: boolean; error: string | null }
type Access = {
  session: Session | null; checking: boolean; authorized: boolean; products: Product[]
  catalogError: string; feedbackPages: Record<number, FeedbackState>
  category: string | null; setCategory: (value: string | null) => void
  status: string; setStatus: (value: string) => void
  feedbackPage: number; setFeedbackPage: (value: number) => void
  verify: (session: Session | null, force?: boolean) => Promise<void>
  refresh: () => Promise<void>
  loadFeedback: (page: number, force?: boolean) => Promise<void>
  rememberProduct: (product: Product) => void
  registerNavigationGuard: (guard: ((after: () => void) => void) | null) => void
  requestNavigation: (after: () => void) => void
}
const AccessContext = createContext<Access | null>(null)
const message = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'
const authFailure = (error: unknown) => error instanceof ApiError && [401, 403].includes(error.status)

// One provider covers login, catalog and creation. Navigation never remounts it.
export function AdminAccessProvider() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [feedbackPages, setFeedbackPages] = useState<Record<number, FeedbackState>>({})
  const [category, setCategory] = useState<string | null>(null)
  const [status, setStatus] = useState('All')
  const [feedbackPage, setFeedbackPage] = useState(0)
  const cache = useRef(new AdminDataCache())
  const sessionRef = useRef<Session | null>(null)
  const authorizedRef = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(false)
  const warmedImages = useRef(new Set<string>())
  const loadedFeedbackPages = useRef(new Set<number>())
  const feedbackRef = useRef<Record<number, FeedbackState>>({})
  const navigationGuard = useRef<((after: () => void) => void) | null>(null)

  const reset = useCallback(() => {
    generation.current++; cache.current.clear(); authorizedRef.current = false
    feedbackRef.current = {}; warmedImages.current.clear(); loadedFeedbackPages.current.clear()
    setAuthorized(false); setChecking(false); setProducts([]); setFeedbackPages({}); setCatalogError('')
    setCategory(null); setStatus('All'); setFeedbackPage(0)
  }, [])
  const warm = useCallback((items: Product[]) => {
    for (const product of items) {
      const url = productPhoto(product)?.path
      if (url && !warmedImages.current.has(url)) {
        warmedImages.current.add(url)
        try { const image = new Image(); image.src = url } catch { /* Card loading remains available. */ }
      }
    }
  }, [])
  const publishProducts = useCallback((items: Product[]) => {
    setProducts(previous => JSON.stringify(previous) === JSON.stringify(items) ? previous : items)
    warm(items)
  }, [warm])

  const refresh = useCallback(async function refreshCatalog(): Promise<void> {
    const current = sessionRef.current
    if (!current) return
    const owner = generation.current
    try {
      const items = await cache.current.read('products', async () => {
        const data = await api.adminProducts(current.access_token)
        if (!Array.isArray(data.products)) throw new Error('The admin catalog response was invalid.')
        return data.products
      }, true)
      if (!mounted.current || owner !== generation.current) return
      if (current.access_token !== sessionRef.current?.access_token) return refreshCatalog()
      publishProducts(items); authorizedRef.current = true; setAuthorized(true); setCatalogError('')
    } catch (error) {
      if (!mounted.current || owner !== generation.current) throw error
      if (current.access_token !== sessionRef.current?.access_token) return refreshCatalog()
      if (authFailure(error) || !authorizedRef.current) reset()
      else setCatalogError(`Saved catalog is still available. Refresh failed: ${message(error)}`)
      throw error
    } finally { if (mounted.current && owner === generation.current) setChecking(false) }
  }, [publishProducts, reset])

  const verify = useCallback(async (next: Session | null, force = false) => {
    if (!mounted.current) return
    const previous = sessionRef.current
    const sameUser = Boolean(next && previous && (next.user?.id && next.user.id === previous.user?.id || next.access_token === previous.access_token))
    if (!sameUser) reset()
    sessionRef.current = next; setSession(next)
    if (!next) { setChecking(false); return }
    if (sameUser && authorizedRef.current && !force) return
    if (!authorizedRef.current) setChecking(true)
    await refresh()
    if (!authorizedRef.current || sessionRef.current?.user?.id !== next.user?.id) {
      throw new ApiError('Admin access could not be verified. Please sign in again.', 403)
    }
  }, [refresh, reset])

  const loadFeedback = useCallback(async (page: number, force = false) => {
    const current = sessionRef.current
    if (!current || !authorizedRef.current) return
    const existing = feedbackRef.current[page]
    if (!force && existing?.error) return
    const owner = generation.current
    loadedFeedbackPages.current.add(page)
    if (!existing) {
      const state = { loading: true, error: null }
      feedbackRef.current = { ...feedbackRef.current, [page]: state }
      setFeedbackPages(feedbackRef.current)
    }
    try {
      const data = await cache.current.read(`feedback:${page}`, () => api.adminFeedback(current.access_token, page), force)
      if (!mounted.current || owner !== generation.current) return
      if (current.access_token !== sessionRef.current?.access_token) return
      const previous = feedbackRef.current[page]
      if (!previous?.loading && !previous?.error && JSON.stringify(previous?.data) === JSON.stringify(data)) return
      feedbackRef.current = { ...feedbackRef.current, [page]: { data, loading: false, error: null } }
      setFeedbackPages(feedbackRef.current)
    } catch (error) {
      if (!mounted.current || owner !== generation.current || current.access_token !== sessionRef.current?.access_token) return
      if (authFailure(error)) { reset(); return }
      feedbackRef.current = { ...feedbackRef.current, [page]: { data: existing?.data, loading: false, error: message(error) } }
      setFeedbackPages(feedbackRef.current)
    }
  }, [reset])

  const rememberProduct = useCallback((product: Product) => {
    const previous = cache.current.peek<Product[]>('products') || []
    const items = previous.some(item => item.id === product.id) ? previous.map(item => item.id === product.id ? product : item) : [...previous, product]
    items.sort((a, b) => a.name.localeCompare(b.name))
    cache.current.set('products', items); publishProducts(items)
  }, [publishProducts])
  const registerNavigationGuard = useCallback((guard: ((after: () => void) => void) | null) => { navigationGuard.current = guard }, [])
  const requestNavigation = useCallback((after: () => void) => {
    if (navigationGuard.current) navigationGuard.current(after)
    else after()
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!authClient) { setChecking(false); return () => { mounted.current = false } }
    let active = true
    let receivedEvent = false
    const { data: listener } = authClient.auth.onAuthStateChange((event, next) => {
      if (!active) return
      receivedEvent = true
      void verify(next, event === 'TOKEN_REFRESHED').catch(() => {})
    })
    void authClient.auth.getSession().then(({ data }) => {
      if (active && !receivedEvent) void verify(data.session).catch(() => {})
    }).catch(() => { if (active) setChecking(false) })
    return () => { active = false; mounted.current = false; generation.current++; listener.subscription.unsubscribe() }
  }, [verify])

  useEffect(() => {
    if (!authorized) return
    // Warm feedback even when the first protected page is Add product.
    void loadFeedback(0)
    const revalidate = () => {
      if (document.visibilityState !== 'visible') return
      void refresh().catch(() => {})
      for (const page of loadedFeedbackPages.current) void loadFeedback(page, true)
    }
    // Keep the cached UI visible; publish new data only when content changes.
    // This uses protected APIs and works without changing Realtime or RLS policies.
    const timer = window.setInterval(revalidate, 30_000)
    window.addEventListener('focus', revalidate)
    window.addEventListener('online', revalidate)
    document.addEventListener('visibilitychange', revalidate)
    return () => {
      window.clearInterval(timer); window.removeEventListener('focus', revalidate)
      window.removeEventListener('online', revalidate); document.removeEventListener('visibilitychange', revalidate)
    }
  }, [authorized, loadFeedback, refresh])

  return createElement(AccessContext.Provider, { value: {
    session, checking, authorized, products, catalogError, feedbackPages,
    category, setCategory, status, setStatus, feedbackPage, setFeedbackPage,
    verify, refresh, loadFeedback, rememberProduct, registerNavigationGuard, requestNavigation,
  } }, createElement(Outlet))
}

export function useAdminAccess() {
  const access = useContext(AccessContext)
  if (!access) throw new Error('Admin pages must be inside AdminAccessProvider.')
  return access
}
