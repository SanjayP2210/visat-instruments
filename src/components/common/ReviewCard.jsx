import { Quote } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'

/** Star rating; stars pop in one after another (disabled for reduced motion via CSS). */
export function ReviewStars({ rating }) {
  const t = useT()
  if (!rating) return null
  return (
    <p className="flex text-lg leading-none" role="img" aria-label={t('rating.stars', { rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden="true" className={`review-star ${n <= rating ? 'text-accent-500' : 'text-steel-300'}`} style={{ animationDelay: `${n * 70}ms` }}>
          ★
        </span>
      ))}
    </p>
  )
}

/** Customer review card. `compact` clamps long text so cards in a row keep equal height. */
export default function ReviewCard({ review, compact = false }) {
  return (
    <article className="card flex h-full flex-col p-5 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-navy-100 hover:shadow-[0_18px_40px_-22px_rgb(11_31_58/0.45)]">
      <div className="flex items-start justify-between gap-3">
        <ReviewStars rating={review.rating} />
        <Quote className="h-5 w-5 shrink-0 text-navy-100" aria-hidden="true" />
      </div>
      <blockquote className={`mt-3 flex-1 text-sm leading-relaxed whitespace-pre-line text-navy-800 ${compact ? 'line-clamp-6' : ''}`}>
        “{review.message}”
      </blockquote>
      <footer className="mt-4 border-t border-steel-200 pt-3 text-sm">
        <p className="font-bold text-navy-900">{review.name}</p>
        {review.serviceReceived && <p className="text-xs text-steel-500">{review.serviceReceived}</p>}
      </footer>
    </article>
  )
}
