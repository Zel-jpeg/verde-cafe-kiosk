import { Coffee, Croissant, GlassWater, LayoutGrid, Leaf, Sandwich, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Product } from '../../shared/types'

const menuPhotos: Record<string, { path: string; alt: string }> = {
  'Barako Brew': { path: '/products/barako-brew.jpg', alt: 'Hot black Barako coffee in a white ceramic cup' },
  'Iced Latte': { path: '/products/iced-latte.jpg', alt: 'Iced latte with coffee and milk in a clear glass' },
  'Pandan Cloud': { path: '/products/pandan-cloud.jpg', alt: 'Iced pandan coffee with pale green cream in a clear glass' },
  'Mango Cooler': { path: '/products/mango-cooler.jpg', alt: 'Cold golden mango cooler with ice in a clear glass' },
  'Tuna Melt': { path: '/products/tuna-melt.jpg', alt: 'Toasted tuna melt sandwich with melted cheese on a white plate' },
  'Chicken Pesto Panini': { path: '/products/chicken-pesto-panini.jpg', alt: 'Grilled chicken pesto panini cut in halves on a white plate' },
  'Chocolate Cookie': { path: '/products/chocolate-cookie.jpg', alt: 'Chocolate chip cookie on a white background' },
  'Banana Loaf': { path: '/products/banana-loaf.jpg', alt: 'Slice of banana loaf on a white plate' },
}

export function productPhoto(product: Product) {
  if (product.image_url) return { path: product.image_url, alt: `Photo of ${product.name}` }
  return menuPhotos[product.name] || null
}

const categoryIcons: Record<string, LucideIcon> = {
  All: LayoutGrid,
  Coffee,
  Signature: Sparkles,
  Refreshers: GlassWater,
  Food: Sandwich,
  Pastries: Croissant,
}

export function categoryIcon(category: string | null): LucideIcon {
  return categoryIcons[category || ''] || Leaf
}
