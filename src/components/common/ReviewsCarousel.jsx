// Customer reviews carousel: one horizontal row (5 / 3 / 2 / 1 cards by screen width),
// advances a group every 5 s with a seamless loop, arrows, dots and swipe/drag.
// Pauses on hover/focus, while dragging and when the tab is hidden; respects reduced motion.
//
// Seamless loop: when there are more reviews than fit in view, the track renders the last
// `perView` reviews before the list and the first `perView` after it. After sliding onto
// those copies the position snaps (without animation) to the matching real card, so there
// is no visible jump. Copies are aria-hidden/inert; with few reviews nothing is copied.
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n/LanguageContext'
import ReviewCard from './ReviewCard'

const BREAKPOINTS = [
  [1024, 5], // desktop
  [768, 3], // tablet
  [640, 2], // small tablet
]
const SWIPE_THRESHOLD = 50

const perViewFor = (width) => BREAKPOINTS.find(([min]) => width >= min)?.[1] ?? 1

function usePerView() {
  const [perView, setPerView] = useState(() => (typeof window === 'undefined' ? 5 : perViewFor(window.innerWidth)))
  useEffect(() => {
    const update = () => setPerView(perViewFor(window.innerWidth))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return perView
}

function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return reduced
}

function usePageHidden() {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const onChange = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return hidden
}

export default function ReviewsCarousel({ reviews, interval = 5000 }) {
  const t = useT()
  const perView = usePerView()
  const reduced = useReducedMotion()
  const pageHidden = usePageHidden()
  const count = reviews.length
  const loop = count > perView

  const [pos, setPos] = useState(0) // index of the first visible real review (may briefly leave 0..count-1)
  const [animate, setAnimate] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [drag, setDrag] = useState(null) // { startX, dx }
  const moving = useRef(false)

  // Start over when the layout or the number of reviews changes.
  useEffect(() => {
    moving.current = false
    setAnimate(false)
    setPos(0)
  }, [perView, count])

  const safety = useRef(null)
  useEffect(() => () => clearTimeout(safety.current), [])

  const move = useCallback(
    (to, from) => {
      if (!loop || moving.current || to === from) return
      moving.current = !reduced // with reduced motion there is no transition to wait for
      setAnimate(!reduced)
      setPos(to)
      // If transitionend never arrives (e.g. interrupted), don't stay stuck.
      clearTimeout(safety.current)
      safety.current = setTimeout(() => moving.current && normalizeRef.current(), 1200)
    },
    [loop, reduced],
  )

  // Snap from a copy back to the matching real card (no animation).
  const normalizeRef = useRef(() => {})
  const normalize = useCallback(() => {
    moving.current = false
    setPos((p) => {
      if (p >= count || p < 0) {
        setAnimate(false)
        return ((p % count) + count) % count
      }
      return p
    })
  }, [count])
  normalizeRef.current = normalize

  useEffect(() => {
    if (!animate && loop && (pos >= count || pos < 0)) normalize() // reduced motion: no transitionend
  }, [animate, loop, pos, count, normalize])

  // Re-enable the slide animation two frames after a snap, so the snap itself is invisible.
  useEffect(() => {
    if (animate || reduced || !loop) return undefined
    let inner
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setAnimate(true))
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
    }
  }, [animate, reduced, loop])

  // Autoplay. Restarts whenever the position changes, so manual navigation resets the timer.
  const paused = hovered || focused || pageHidden || drag !== null
  useEffect(() => {
    if (!loop || reduced || paused) return undefined
    const timer = setTimeout(() => move(pos + perView, pos), interval)
    return () => clearTimeout(timer)
  }, [loop, reduced, paused, pos, perView, interval, move])

  /* ---------- swipe / drag ---------- */
  const onPointerDown = (e) => {
    if (!loop || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ startX: e.clientX, dx: 0 })
  }
  const onPointerMove = (e) => drag && setDrag((d) => (d ? { ...d, dx: e.clientX - d.startX } : d))
  const endDrag = () => {
    if (!drag) return
    const { dx } = drag
    setDrag(null)
    if (dx <= -SWIPE_THRESHOLD) move(pos + perView, pos)
    else if (dx >= SWIPE_THRESHOLD) move(pos - perView, pos)
  }

  const slides = loop
    ? [
        ...reviews.slice(-perView).map((r) => ({ review: r, key: `head-${r.id}`, clone: true })),
        ...reviews.map((r) => ({ review: r, key: r.id, clone: false })),
        ...reviews.slice(0, perView).map((r) => ({ review: r, key: `tail-${r.id}`, clone: true })),
      ]
    : reviews.map((r) => ({ review: r, key: r.id, clone: false }))

  const offset = loop ? pos + perView : 0
  const transform = loop ? `translateX(calc(${(-offset * 100) / perView}% + ${drag?.dx ?? 0}px))` : undefined
  const pages = Math.ceil(count / perView)
  const activePage = loop ? Math.floor((((pos % count) + count) % count) / perView) : 0
  const firstVisible = ((pos % count) + count) % count

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={t('reviews.carousel')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
      data-testid="reviews-carousel"
      data-paused={paused ? 'true' : 'false'}
    >
      <div
        className={`overflow-hidden py-2 ${loop ? 'cursor-grab touch-pan-y select-none active:cursor-grabbing' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-testid="reviews-viewport"
      >
        <ul
          className={`flex items-stretch ${loop ? '' : 'justify-center'} ${animate && !drag ? 'carousel-track' : ''}`}
          style={{ transform }}
          onTransitionEnd={(e) => e.target === e.currentTarget && e.propertyName === 'transform' && normalize()}
        >
          {slides.map(({ review, key, clone }, i) => {
            const realIndex = loop ? i - perView : i
            return (
              <li
                key={key}
                className="flex shrink-0 grow-0 px-2.5"
                style={{ flexBasis: `${100 / perView}%` }}
                aria-hidden={clone || undefined}
                inert={clone || undefined}
                data-testid="review-slide"
                data-clone={clone ? 'true' : 'false'}
                aria-roledescription={clone ? undefined : 'slide'}
                aria-label={clone ? undefined : t('reviews.slide', { n: realIndex + 1, count })}
              >
                <div className="review-slide-enter flex w-full" style={{ animationDelay: `${Math.max(0, realIndex) % perView * 80}ms` }}>
                  <ReviewCard review={review} compact />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {loop && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button type="button" onClick={() => move(pos - perView, pos)} className="grid h-10 w-10 place-items-center rounded-full border border-steel-200 bg-white text-navy-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-900 hover:shadow-md active:scale-95" aria-label={t('reviews.previous')}>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2" role="group" aria-label={t('reviews.choose')}>
            {Array.from({ length: pages }, (_, p) => (
              <button
                key={p}
                type="button"
                onClick={() => move(p * perView, pos)}
                aria-label={t('reviews.showRange', { from: p * perView + 1, to: Math.min((p + 1) * perView, count) })}
                aria-current={p === activePage ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all duration-500 ease-out ${p === activePage ? 'w-7 bg-accent-500' : 'w-2.5 bg-steel-300 hover:bg-steel-500'}`}
              />
            ))}
          </div>
          <button type="button" onClick={() => move(pos + perView, pos)} className="grid h-10 w-10 place-items-center rounded-full border border-steel-200 bg-white text-navy-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy-900 hover:shadow-md active:scale-95" aria-label={t('reviews.next')}>
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {loop ? t('reviews.showing', { from: firstVisible + 1, to: Math.min(firstVisible + perView, count), count }) : ''}
      </p>
    </div>
  )
}

/** Placeholder while reviews load (same height as a row of cards, so the page does not jump). */
export function ReviewsCarouselSkeleton() {
  const perView = usePerView()
  return (
    <ul className="flex py-2" aria-hidden="true">
      {Array.from({ length: perView }, (_, i) => (
        <li key={i} className="flex shrink-0 px-2.5" style={{ flexBasis: `${100 / perView}%` }}>
          <div className="card h-56 w-full animate-pulse bg-navy-50" />
        </li>
      ))}
    </ul>
  )
}
