import { useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'

export type DialogState = {
  kind: 'confirm' | 'success' | 'error'
  title: string
  message: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}

export function useToast() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])
  return { toast, showToast: (message: string) => setToast({ id: Date.now() + Math.random(), message }), clearToast: () => setToast(null) }
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="toast" role="status" aria-live="polite"><Info size={20} aria-hidden="true" /><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={onClose}><X size={18} /></button></div>
}

export function ActionDialog({ dialog, onClose }: { dialog: DialogState | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!dialog) return
    const element = ref.current
    element?.showModal()
    return () => { if (element?.open) element.close() }
  }, [dialog])
  if (!dialog) return null
  const Icon = dialog.kind === 'error' ? CircleAlert : CircleCheck
  return <dialog ref={ref} className={`action-dialog action-dialog--${dialog.kind}`} aria-labelledby="dialog-title" aria-describedby="dialog-message" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="dialog-icon"><Icon size={28} aria-hidden="true" /></div><h2 id="dialog-title">{dialog.title}</h2><p id="dialog-message">{dialog.message}</p>
    <div className="dialog-actions">{dialog.secondaryLabel && <button type="button" className="secondary" onClick={dialog.onSecondary || onClose}>{dialog.secondaryLabel}</button>}<button type="button" className="primary" onClick={dialog.onPrimary}>{dialog.primaryLabel}</button></div>
  </dialog>
}
