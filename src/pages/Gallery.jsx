import { Maximize2 } from 'lucide-react'
import { useState } from 'react'
import CtaBand from '../components/common/CtaBand'
import Lightbox from '../components/common/Lightbox'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'

export default function Gallery() {
  const t = useT()
  usePageTitle(t('nav.gallery'), { page: 'gallery' })
  const { gallery, status } = useSite()
  const [active, setActive] = useState(null)

  return (
    <>
      <PageHero
        eyebrow={t('nav.gallery')}
        title={t('gallery.title')}
        intro={t('gallery.intro')}
        crumbs={[{ label: t('nav.gallery') }]}
      />

      <section className="section">
        <div className="container-x">
          {status !== 'loading' && gallery.length === 0 && (
            <p className="rounded-lg border border-dashed border-steel-300 p-8 text-center text-sm text-steel-600">{t('gallery.none')}</p>
          )}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={status === 'loading'}>
            {status === 'loading' &&
              Array.from({ length: 6 }, (_, i) => <li key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-navy-50" aria-hidden="true" />)}
            {status !== 'loading' && gallery.map((item, i) => (
              <Reveal as="li" key={item.id} delay={(i % 3) * 80}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className="group relative block w-full overflow-hidden rounded-xl border border-steel-200 bg-navy-50 text-left"
                  aria-label={t('gallery.open', { title: item.title })}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-linear-to-t from-navy-950/85 via-navy-950/10 to-transparent opacity-90 transition-opacity group-hover:opacity-100" />
                  {item.tag && (
                    <span className="absolute top-3 left-3 rounded bg-white/90 px-2 py-1 text-[11px] font-bold text-navy-900">
                      {item.tag}
                    </span>
                  )}
                  <span className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Maximize2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <span className="block font-display text-xl font-bold">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-navy-100/80">{item.caption}</span>
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand title={t('gallery.ctaTitle')} text={t('gallery.ctaText')} />

      {active !== null && (
        <Lightbox items={gallery} index={active} onClose={() => setActive(null)} onChange={setActive} />
      )}
    </>
  )
}
