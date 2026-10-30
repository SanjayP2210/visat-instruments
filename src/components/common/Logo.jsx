import { Link } from 'react-router-dom'

const LOGO_ALT = 'VISAT INSTRUMENTS – Weighbridge and Industrial Weighing Solutions'

// Emblem sizes per placement. The artwork is square with a white background,
// so it is always shown whole (object-contain) at a fixed square size.
const sizes = {
  header: 'h-[52px] w-[52px] lg:h-[70px] lg:w-[70px]',
  menu: 'h-[52px] w-[52px]',
  footer: 'h-[72px] w-[72px]',
}

export default function Logo({ variant = 'header' }) {
  const light = variant === 'footer'
  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label="VISAT INSTRUMENTS home">
      <span className={`shrink-0 ${light ? 'rounded-xl bg-white p-1.5' : ''}`}>
        <img
          src="/images/branding/visat-instruments-logo-160.png"
          srcSet="/images/branding/visat-instruments-logo-160.png 160w, /images/branding/visat-instruments-logo-240.png 240w"
          sizes={variant === 'header' ? '(min-width: 1024px) 70px, 52px' : variant === 'menu' ? '52px' : '72px'}
          width="160"
          height="160"
          alt={LOGO_ALT}
          decoding="async"
          fetchPriority={variant === 'header' ? 'high' : undefined}
          loading={variant === 'footer' ? 'lazy' : 'eager'}
          className={`${sizes[variant]} object-contain`}
        />
      </span>
      <span className="leading-none" aria-hidden="true">
        <span className={`block font-display text-xl font-bold tracking-wide ${light ? 'text-white' : 'text-navy-900'}`}>
          VISAT
        </span>
        <span className={`block text-[10px] font-bold tracking-[0.3em] ${light ? 'text-accent-400' : 'text-accent-600'}`}>
          INSTRUMENTS
        </span>
      </span>
    </Link>
  )
}
