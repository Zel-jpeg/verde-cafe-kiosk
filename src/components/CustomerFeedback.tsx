import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { api } from '../lib/api'

export function CustomerFeedback({ checkoutKey }: { checkoutKey: string }) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const active = useRef(false)
  const pending = useRef(false)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (rating === null || pending.current || status === 'saved') return
    pending.current = true
    setStatus('pending'); setError('')
    try {
      const result = await api.submitFeedback({ checkoutKey, rating, comment })
      if (result.saved !== true) throw new Error('Feedback was not confirmed. Please try again.')
      if (active.current) setStatus('saved')
    } catch (failure) {
      if (active.current) { setError(failure instanceof Error ? failure.message : 'Feedback could not be saved. Please try again.'); setStatus('error') }
    } finally { pending.current = false }
  }

  return <section className="customer-feedback" aria-labelledby="customer-feedback-title">
    <h2 id="customer-feedback-title">How was your ordering experience?</h2>
    {status === 'saved' ? <p className="feedback-thanks" role="status">Thank you! Your feedback has been saved.</p> : <form onSubmit={event => void submit(event)}>
      <p className="feedback-note">Optional — share how ordering went. You can print or start a new transaction anytime.</p>
      <fieldset disabled={status === 'pending'}>
        <legend>Ordering experience rating (required to submit)</legend>
        <div className="feedback-stars">{[1, 2, 3, 4, 5].map(value => <label key={value} className={`feedback-star ${rating !== null && value <= rating ? 'selected' : ''}`}>
          <input type="radio" name="experience-rating" value={value} checked={rating === value} required onChange={() => setRating(value)} aria-label={`${value} ${value === 1 ? 'star' : 'stars'} out of 5`} />
          <span><Star size={27} aria-hidden="true" /><small>{value}</small></span>
        </label>)}</div>
        <label className="feedback-comment" htmlFor="feedback-comment">Comment (optional)</label>
        <textarea id="feedback-comment" rows={3} maxLength={500} value={comment} onChange={event => setComment(event.target.value)} aria-describedby="feedback-count" placeholder="Tell us about using the kiosk…" />
        <small id="feedback-count" className="feedback-count">{comment.length}/500 characters</small>
      </fieldset>
      {status === 'error' && <p className="field-error" role="alert">{error}</p>}
      <button className="primary full" disabled={rating === null || status === 'pending'}>{status === 'pending' ? 'Submitting…' : status === 'error' ? 'Retry feedback' : 'Submit feedback'}</button>
      <span className="feedback-status" role="status">{status === 'pending' ? 'Saving your feedback…' : ''}</span>
    </form>}
  </section>
}
