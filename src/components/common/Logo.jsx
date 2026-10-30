import { Link } from 'react-router-dom'

export default function Logo({ light = false }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="VISAT INSTRUMENTS home">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-navy-900 ring-1 ring-white/10">
        <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
          <path d="M14 14h9l9 24 9-24h9L37 44h-10z" fill="#fff" />
          <rect x="14" y="48" width="36" height="4" rx="2" fill="#f97316" />
        </svg>
      </span>
      <span className="leading-none">
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
