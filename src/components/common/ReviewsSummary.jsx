import { ExternalLink, Star } from 'lucide-react'
import { business } from '../../data/business'
import RatingStars from './RatingStars'

// Shows the verified Google rating summary. Individual review texts are not
// reproduced here; visitors are linked to Google to read them first-hand.
export default function ReviewsSummary() {
  const { value, count, source } = business.rating
  return (
    <div className="card grid gap-8 overflow-hidden p-6 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
      <div className="flex items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-navy-900 text-white">
          <span className="font-display text-4xl leading-none font-bold">{value.toFixed(1)}</span>
          <Star className="-mt-3 h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
        </div>
        <div>
          <RatingStars value={value} className="h-5 w-5" />
          <p className="mt-2 text-sm font-semibold text-navy-900">
            {count} reviews on {source}
          </p>
          <p className="text-xs text-steel-500">Rating as listed on {source}</p>
        </div>
      </div>
      <div className="md:border-l md:border-steel-200 md:pl-8">
        <p className="text-lg leading-relaxed text-navy-800">
          Customers have rated {business.name} <strong>{value.toFixed(1)} out of 5</strong> on {source}. Read their
          reviews first-hand, or leave your own after working with us.
        </p>
        <a href={business.maps.view} target="_blank" rel="noopener noreferrer" className="btn-outline mt-5">
          Read reviews on Google
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
