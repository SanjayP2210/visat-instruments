import { Star } from 'lucide-react'

export default function RatingStars({ value, className = 'h-4 w-4' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${className} ${i < Math.round(value) ? 'fill-accent-500 text-accent-500' : 'text-steel-300'}`}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}
