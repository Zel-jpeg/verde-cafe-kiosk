import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { convertToWebp } from '../lib/convertToWebp'

type Props = {
  currentUrl: string | null
  disabled?: boolean
  onChange: (blob: Blob | null) => void
  onPending: (pending: boolean) => void
}

export function ImageField({ currentUrl, disabled, onChange, onPending }: Props) {
  const id = useId()
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState(0)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const version = useRef(0)
  const previewUrl = useRef<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => {
    version.current++
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  function clearPreview() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = null; setPreview(null); setSize(0)
  }
  function discard() {
    version.current++; clearPreview(); setProgress(''); setError('')
    onChange(null); onPending(false)
    if (input.current) input.current.value = ''
  }
  async function selected(file?: File) {
    if (!file) return
    const selection = ++version.current
    clearPreview(); onChange(null); onPending(true); setError(''); setProgress('Reading image…')
    try {
      const blob = await convertToWebp(file, message => { if (selection === version.current) setProgress(message) })
      if (selection !== version.current) return
      const url = URL.createObjectURL(blob)
      previewUrl.current = url; setPreview(url); setSize(blob.size); onChange(blob)
    } catch (e) {
      if (selection === version.current) setError(e instanceof Error ? e.message : 'Image could not be prepared.')
    } finally {
      if (selection === version.current) { setProgress(''); onPending(false) }
    }
  }
  return <div className="image-field" aria-busy={Boolean(progress)}>
    <label htmlFor={id}>Product image</label>
    <label htmlFor={id} className="image-drop">
      <span className="image-preview">{preview || currentUrl ? <img src={preview || currentUrl || ''} alt={preview ? 'Converted WebP preview' : 'Current product image'} /> : <ImagePlus size={34} />}</span>
      <span><strong>Choose an image</strong><span>WebP output · maximum 1 MiB</span>{preview && <small>Ready to upload · {(size / 1024).toFixed(1)} KiB</small>}</span>
    </label>
    <input ref={input} id={id} type="file" accept="image/*" disabled={disabled} aria-describedby={`${id}-help ${id}-status`} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; void selected(file) }} />
    <p id={`${id}-help`} className="admin-image-help">Choose a raster image this browser can open, such as JPEG, PNG, WebP, GIF, BMP or AVIF. Maximum source size: 10 MiB. Resized to at most 1200 pixels without upscaling. Animated images use the first frame. SVG is not supported; export unsupported formats as JPEG or PNG.</p>
    <p id={`${id}-status`} role={error ? 'alert' : 'status'} className={error ? 'field-error' : 'admin-image-help'}>{error || progress}</p>
    {(preview || progress) && <button type="button" className="secondary" disabled={disabled} onClick={discard}>{currentUrl ? 'Discard replacement · keep current image' : 'Discard selected image'}</button>}
  </div>
}
