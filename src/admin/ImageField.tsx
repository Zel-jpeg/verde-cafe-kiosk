import { useEffect, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { convertToWebp } from '../lib/convertToWebp'

export function ImageField({ currentUrl, onChange, onError }: { currentUrl: string | null; onChange: (blob: Blob | null) => void; onError: (message: string) => void }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [size, setSize] = useState(0)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  async function selected(file?: File) {
    if (!file) return
    try {
      const blob = await convertToWebp(file)
      setPreview(URL.createObjectURL(blob)); setSize(blob.size); onChange(blob)
    } catch (e) { onError((e as Error).message); onChange(null); setPreview(null) }
  }
  return <div className="image-field"><label htmlFor="product-image">Product image (PNG or JPEG)</label><label htmlFor="product-image" className="image-drop"><div className="image-preview">{preview || currentUrl ? <img src={preview || currentUrl || ''} alt="Product preview" /> : <ImagePlus size={34} />}</div><div><strong>Choose an image</strong><span>Converted to WebP · max 1 MiB output</span>{preview && <small>Ready to upload · {(size / 1024).toFixed(0)} KiB</small>}</div></label><input id="product-image" type="file" accept="image/png,image/jpeg" onChange={e => void selected(e.target.files?.[0])} /></div>
}
