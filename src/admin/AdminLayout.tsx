import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { authClient } from '../lib/supabaseAuth'
import { useAdminAccess } from './useAdminAccess'

export function AdminLayout() {
  const { checking, authorized, session, catalogError, refresh, requestNavigation } = useAdminAccess()
  const navigate = useNavigate()
  if (!checking && (!session || !authorized)) return <Navigate to="/admin/login" replace />
  return <AppShell onAdminNavigate={path => requestNavigation(() => navigate(path))} onSignOut={session ? () => requestNavigation(() => void authClient?.auth.signOut()) : undefined}>
    {checking ? <main className="admin-main" id="main-content"><div className="flow-card"><p role="status">Checking admin access…</p></div></main> : <>
      {catalogError && <div className="admin-sync-notice error-banner" role="alert"><span>{catalogError}</span><button type="button" onClick={() => void refresh().catch(() => {})}>Retry refresh</button></div>}
      <Outlet />
    </>}
  </AppShell>
}
