import { useEffect, useRef, useState } from 'react'
import { LogOut, Menu, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { BrandArtwork } from './BrandArtwork'
import { categoryIcon } from '../lib/productPresentation'

type Props = {
  children: React.ReactNode
  categories?: string[]
  activeCategory?: string
  onCategory?: (category: string) => void
  onSignOut?: () => void
}

export function AppShell({ children, categories, activeCategory, onCategory, onSignOut }: Props) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!open) return
    (firstItemRef.current || document.querySelector<HTMLElement>('#main-sidebar button'))?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggleRef.current?.focus() }
      if (event.key === 'Tab') {
        const items = Array.from(document.querySelectorAll<HTMLElement>('#main-sidebar a[href], #main-sidebar button:not([disabled])'))
        const first = items[0], last = items.at(-1)
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const closeSidebar = () => { setOpen(false); toggleRef.current?.focus() }
  return <div className="app-shell">
    <div className="mobile-bar"><button ref={toggleRef} className="sidebar-toggle" type="button" aria-label="Open navigation" aria-controls="main-sidebar" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={25} /></button><BrandArtwork variant="wordmark" /></div>
    {open && <button type="button" tabIndex={-1} className="sidebar-scrim" aria-label="Close navigation overlay" onClick={closeSidebar} />}
    <aside id="main-sidebar" className={`sidebar ${open ? 'sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="sidebar-brand"><BrandArtwork variant="wordmark" /><button className="sidebar-close" type="button" aria-label="Close navigation" onClick={closeSidebar}><X size={21} /></button><p>Fresh moments, made simple.</p></div>
      {categories && onCategory && <nav className="sidebar-categories" aria-label="Menu categories"><span className="sidebar-label">BROWSE MENU</span>{categories.map((item, index) => { const Icon = categoryIcon(item); return <button ref={index === 0 ? firstItemRef : undefined} key={item} type="button" className={`sidebar-item ${activeCategory === item ? 'active' : ''}`} aria-pressed={activeCategory === item} onClick={() => { onCategory(item); document.getElementById('menu-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (open) closeSidebar() }}><Icon size={18} aria-hidden="true" /> {item}</button> })}</nav>}
      <div className="sidebar-bottom">{onSignOut && <button className="sidebar-item sign-out" type="button" onClick={onSignOut}><LogOut size={19} /> Sign out</button>}<small>VERDE COFFEE · POS</small></div>
    </aside>
    <div className="app-content" inert={open}>{children}</div>
  </div>
}
