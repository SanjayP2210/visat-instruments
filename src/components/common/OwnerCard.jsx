import { ArrowRight, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import OwnerPhoto from './OwnerPhoto'
import WhatsAppIcon from './WhatsAppIcon'

// Full profile card for the About page.
export function OwnerCard({ owner }) {
  return (
    <article className="group card flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[0_18px_40px_-20px_rgb(11_31_58/0.35)]">
      <div className="relative">
        <OwnerPhoto photo={owner.photo} />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-accent-500" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-accent-600 uppercase">{owner.role}</p>
        <h3 className="mt-1 text-3xl font-bold text-navy-900">{owner.name}</h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-steel-600">{owner.intro}</p>
        <div className="mt-6 flex flex-col gap-3 border-t border-steel-200 pt-6 sm:flex-row sm:flex-wrap">
          <a href={`tel:${owner.phone.tel}`} className="btn-navy" aria-label={`Call ${owner.name} on ${owner.phone.display}`}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            {owner.phone.display}
          </a>
          {owner.whatsapp && (
            <a
              href={owner.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
              aria-label={`Chat with ${owner.name} on WhatsApp`}
            >
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

// Compact profile for the home page; links to the full profiles on About Us.
export function OwnerCardCompact({ owner }) {
  return (
    <Link
      to="/about#owners"
      className="group card flex items-center gap-5 overflow-hidden p-4 transition-colors hover:border-navy-900 sm:p-5"
    >
      <OwnerPhoto photo={owner.photo} className="h-24 w-24 shrink-0 rounded-lg sm:h-28 sm:w-28" />
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-widest text-accent-600 uppercase">{owner.role}</span>
        <span className="mt-0.5 block font-display text-2xl font-bold text-navy-900">{owner.name}</span>
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-steel-500 group-hover:text-accent-600">
          View profile <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </span>
      </span>
    </Link>
  )
}
