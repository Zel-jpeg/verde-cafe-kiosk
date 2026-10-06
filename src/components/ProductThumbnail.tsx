import type { Product } from '../../shared/types'
import { categoryIcon, productPhoto } from '../lib/productPresentation'

export function ProductThumbnail({ product, className = '' }: { product: Product; className?: string }) {
  const Icon = categoryIcon(product.category)
  const photo = productPhoto(product)
  return <div className={`product-thumbnail ${className}`}>
    {photo ? <img src={photo.path} alt={photo.alt} /> : <Icon size={28} strokeWidth={1.6} aria-hidden="true" />}
  </div>
}
