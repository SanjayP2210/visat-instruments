import { MessageSquarePlus, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBusiness } from '../../context/SiteData'
import { useT } from '../../i18n/LanguageContext'
import RatingStars from './RatingStars'

// Live summary of the approved, published website Customer Reviews (average and count
// from the API). With no eligible reviews it shows an invitation instead of any rating.
export default function ReviewsSummary() {
  const business = useBusiness()
  const t = useT()
  if (!business.rating) {
    return (
      <div className="card flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <p className="font-display text-lg font-bold text-navy-900">{t('rating.empty')}</p>
          <p className="mt-1 text-sm text-steel-500">{t('rating.emptyText')}</p>
        </div>
        <Link to="/reviews#write" className="btn-outline shrink-0">
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {t('reviews.write')}
        </Link>
      </div>
    )
  }
  const { value, count } = business.rating
  return (
    <div className="card grid gap-8 overflow-hidden p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-navy-900 text-white">
          <span className="font-display text-4xl leading-none font-bold">{value.toFixed(1)}</span>
          <Star className="-mt-3 h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
        </div>
        <div>
          <RatingStars value={value} className="h-5 w-5" />
          <p className="mt-2 text-sm font-semibold text-navy-900">{t('rating.countOn', { count })}</p>
          <p className="text-xs text-steel-500">{t('rating.asListed')}</p>
        </div>
      </div>
      <div className="md:border-l md:border-steel-200 md:pl-8">
        <p className="text-lg leading-relaxed text-navy-800">
          {t('rating.summaryBefore', { name: business.name })} <strong>{t('rating.outOf5', { value: value.toFixed(1) })}</strong>{' '}
          {t('rating.summaryAfter')}
        </p>
      </div>
    </div>
  )
}
