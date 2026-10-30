import { MapPin, Navigation, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { business } from '../../data/business'
import { getCategories } from '../../services/catalogService'
import Logo from '../common/Logo'
import RatingStars from '../common/RatingStars'
import WhatsAppIcon from '../common/WhatsAppIcon'
import { navLinks } from './navigation'

export default function Footer() {
  const categories = getCategories()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy-950 text-navy-100/75">
      <div className="h-1 bg-accent-500" aria-hidden="true" />
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {business.type} in Ahmedabad, offering weighing scales, indicators, junction boxes, weighbridge systems and
            weighbridge software.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm">
            <RatingStars value={business.rating.value} />
            <span className="font-semibold text-white">{business.rating.value.toFixed(1)}</span>
            <span>
              · {business.rating.count} {business.rating.source} reviews
            </span>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">Company</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-accent-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">Products</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link to={`/products?category=${cat.slug}`} className="hover:text-accent-400">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">Contact</h2>
          <address className="mt-4 space-y-4 text-sm not-italic">
            <p className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              <span>{business.address.full}</span>
            </p>
            <a href={`tel:${business.phone.tel}`} className="flex items-center gap-3 font-semibold text-white hover:text-accent-400">
              <Phone className="h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              {business.phone.display}
            </a>
            <a
              href={business.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-accent-400"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0 text-accent-400" />
              Chat on WhatsApp
            </a>
            <a
              href={business.maps.directions}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-accent-400"
            >
              <Navigation className="h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              Get directions
            </a>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {business.name}. All rights reserved.
          </p>
          <p>Product details are indicative. Specifications and prices on enquiry.</p>
        </div>
      </div>
    </footer>
  )
}
