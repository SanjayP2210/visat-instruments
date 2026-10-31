import { Check, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n/LanguageContext'
import Icon from './Icon'
import PendingBadge from './PendingBadge'

export default function ServiceCard({ service, showDetails = false, showEnquiry = false }) {
  const t = useT()
  return (
    <article className="card flex h-full flex-col overflow-hidden transition-colors hover:border-navy-100">
      {service.image && <img src={service.image.src} alt={service.image.alt} loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" />}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-lg bg-navy-900 text-accent-400">
            <Icon name={service.icon} className="h-6 w-6" />
          </span>
          {service.status === 'to-be-confirmed' && <PendingBadge>{t('common.toBeConfirmed')}</PendingBadge>}
        </div>
        <h3 className="mt-5 text-2xl font-bold">{service.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-steel-600">{service.summary}</p>
        {showDetails && service.details.length > 0 && (
          <ul className="mt-5 space-y-2 border-t border-steel-200 pt-5 text-sm text-navy-800">
            {service.details.map((d) => (
              <li key={d} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
                {d}
              </li>
            ))}
          </ul>
        )}
        {showEnquiry && (
          <div className="mt-auto pt-6">
            <Link to={`/contact?service=${service.slug}`} className="btn-outline w-full px-3 py-2.5 text-xs" aria-label={t('services.enquireAbout', { title: service.title })}>
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {t('services.enquire')}
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
