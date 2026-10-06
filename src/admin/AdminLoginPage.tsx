import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandArtwork } from '../components/BrandArtwork'
import { ActionDialog } from '../components/Feedback'
import type { DialogState } from '../components/Feedback'
import { authClient } from '../lib/supabaseAuth'
import { useAdminAccess } from './useAdminAccess'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const { authorized, verify } = useAdminAccess()

  useEffect(() => {
    if (authorized && !busy && !dialog) navigate('/admin', { replace: true })
  }, [authorized, busy, dialog, navigate])

  async function signIn(event: React.FormEvent) {
    event.preventDefault()
    if (!authClient) return
    setBusy(true)
    try {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('No session was returned. Please try again.')
      await verify(data.session)
      setPassword('')
      setDialog({ kind: 'success', title: 'Welcome back', message: 'Your Verde Coffee menu is ready to manage.', primaryLabel: 'Manage products', onPrimary: () => { setDialog(null); navigate('/admin', { replace: true }) } })
    } catch (error) {
      await authClient.auth.signOut()
      setDialog({ kind: 'error', title: 'Admin sign-in failed', message: (error as Error).message, primaryLabel: 'Try again', onPrimary: () => setDialog(null) })
    } finally { setBusy(false) }
  }

  return <main className="admin-login-page" id="main-content">
    <ActionDialog dialog={dialog} onClose={() => setDialog(null)} />
    <div className="admin-login-top"><BrandArtwork variant="wordmark" /><Link to="/"><ArrowLeft size={18} /> Back to kiosk</Link></div>
    <section className="admin-login-panel" aria-labelledby="admin-login-title">
      <div className="admin-symbol"><ShieldCheck size={32} /></div>
      <p className="eyebrow">VERDE COFFEE · STAFF ONLY</p>
      <h1 id="admin-login-title">Admin login</h1>
      <p className="muted">Sign in with your assigned account to manage the menu.</p>
      {!authClient ? <p className="error-banner">Supabase browser configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.</p> : <form onSubmit={event => void signIn(event)}>
        <label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
        <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={18} /></>}</button>
      </form>}
      <p className="login-note">Admin accounts are created privately. There is no public registration.</p>
    </section>
  </main>
}
