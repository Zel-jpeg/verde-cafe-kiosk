type Artwork = 'wordmark' | 'icon' | 'mascot'

export function BrandArtwork({ variant, className = '' }: { variant: Artwork; className?: string }) {
  const label = variant === 'wordmark' ? 'Verde Coffee wordmark' : variant === 'icon' ? 'Verde Coffee leaf logo' : 'Verde Coffee mascot waving'
  return <span className={`brand-art brand-art--${variant} ${className}`} role="img" aria-label={label}>
    <img src={variant === 'wordmark' ? '/branding/verde-logo-txt.png' : variant === 'icon' ? '/branding/verde-logo-icon.png' : '/branding/verde-coffee-board.png'} alt="" aria-hidden="true" />
  </span>
}
