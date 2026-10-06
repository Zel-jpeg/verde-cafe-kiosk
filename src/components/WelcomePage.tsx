import { ArrowRight, Settings2, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OrderType } from '../../shared/types'
import { BrandArtwork } from './BrandArtwork'

export function WelcomePage({ onChoose }: { onChoose: (type: OrderType) => void }) {
  return <main className="welcome-screen" id="main-content">
    <section className="welcome-card" aria-labelledby="welcome-title">
      <div className="welcome-brand"><BrandArtwork variant="wordmark" /></div>
      <p className="eyebrow">FRESH MOMENTS, MADE SIMPLE</p>
      <h1 id="welcome-title">Welcome to Verde Coffee</h1>
      <p className="welcome-intro">How would you like to enjoy your order today?</p>
      <div className="welcome-choices">
        <button type="button" onClick={() => onChoose('dine_in')}><UtensilsCrossed size={30} /><span><strong>Dine In</strong><small>Stay and enjoy your coffee here</small></span><ArrowRight size={21} /></button>
        <button type="button" onClick={() => onChoose('take_out')}><ShoppingBag size={30} /><span><strong>Take Out</strong><small>Pick up and take it with you</small></span><ArrowRight size={21} /></button>
      </div>
      <Link className="welcome-admin" to="/admin/login"><Settings2 size={18} /> Login as Admin</Link>
    </section>
  </main>
}
