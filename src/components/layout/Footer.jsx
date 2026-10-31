import { MapPin, Navigation, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../../context/SiteData'
import { useT } from '../../i18n/LanguageContext'
import { openConsentSettings } from '../../services/analytics'
import { getCategories } from '../../services/catalogService'
import Logo from '../common/Logo'
import RatingStars from '../common/RatingStars'
import SocialLinks from '../common/SocialLinks'
import WhatsAppIcon from '../common/WhatsAppIcon'
import { navLinks } from './navigation'

export default function Footer() {
  const site = useSite()
  const { business } = site
  const t = useT()
  const categories = getCategories(site)
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy-950 text-navy-100/75">
      <div className="h-1 bg-accent-500" aria-hidden="true" />
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo variant="footer" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed">
            {t('footer.about', { type: business.type })}
          </p>
          {business.rating && (
            <Link to="/reviews" className="group mt-5 flex w-fit items-center gap-2 text-sm">
              <RatingStars value={business.rating.value} />
              <span className="font-semibold text-white">{business.rating.value.toFixed(1)}</span>
              <span className="group-hover:text-accent-400">
                · {t('rating.count', { count: business.rating.count })}
              </span>
            </Link>
          )}
          {business.socialLinks?.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">{t('social.followUs')}</h2>
              <SocialLinks links={business.socialLinks} variant="footer" className="mt-3" />
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">{t('footer.company')}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-accent-400">
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">{t('nav.products')}</h2>
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
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">{t('footer.contact')}</h2>
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
              {t('cta.chatWhatsApp')}
            </a>
            <a
              href={business.maps.directions}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 hover:text-accent-400"
            >
              <Navigation className="h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
              {t('cta.directions')}
            </a>
          </address>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('footer.rights', { year, name: business.name })}
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{t('footer.note')}</span>
            <button type="button" onClick={openConsentSettings} className="font-semibold underline-offset-2 hover:text-white hover:underline">
              {t('consent.settings')}
            </button>
          </p>
        </div>
      </div>
    </footer>
  )
}
