import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useT } from '../../i18n/LanguageContext'

export default function Lightbox({ items, index, onClose, onChange }) {
  const t = useT()
  const closeRef = useRef(null)
  const item = items[index]
  const count = items.length

  const prev = useCallback(() => onChange((index - 1 + count) % count), [index, count, onChange])
  const next = useCallback(() => onChange((index + 1) % count), [index, count, onChange])

  useEffect(() => {
    const previouslyFocused = document.activeElement
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  if (!item) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('lightbox.preview', { title: item.title })}
      className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-navy-950/95"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
        <p className="text-sm font-semibold">
          {index + 1} / {count}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10"
          aria-label={t('lightbox.close')}
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
        <img
          key={item.src}
          src={item.src}
          alt={item.alt}
          className="animate-zoom-in max-h-full max-w-full rounded-md object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
              aria-label={t('lightbox.previous')}
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
              aria-label={t('lightbox.next')}
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <div className="px-4 py-5 text-center text-white sm:px-6" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-xl font-bold">{item.title}</p>
        <p className="mt-1 text-sm text-navy-100/75">{item.caption}</p>
      </div>
    </div>
  )
}
