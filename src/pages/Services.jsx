import { Info } from 'lucide-react'
import CtaBand from '../components/common/CtaBand'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import ServiceCard from '../components/common/ServiceCard'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'

export default function Services() {
  const t = useT()
  usePageTitle(t('nav.services'), { page: 'services' })
  const { business, services, status } = useSite()
  const serviceEnquiry = `${t('wa.hello', { name: business.name })}\n${t('wa.services', { services: services.map((s) => s.title).join(' / ') })}`
  return (
    <>
      <PageHero
        eyebrow={t('nav.services')}
        title={t('services.title')}
        intro={t('services.intro')}
        crumbs={[{ label: t('nav.services') }]}
      />

      <section className="section">
        <div className="container-x">
          <div className="flex gap-3 rounded-xl border border-accent-100 bg-accent-50 p-5 text-sm text-navy-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
            <p>
              {t('services.note', { number: business.phone.display })}
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy={status === 'loading'}>
            {status === 'loading'
              ? Array.from({ length: 4 }, (_, i) => <div key={i} className="card h-72 animate-pulse bg-navy-50" aria-hidden="true" />)
              : services.map((service, i) => (
                  <Reveal key={service.id} delay={i * 70}>
                    <ServiceCard service={service} showDetails showEnquiry />
                  </Reveal>
                ))}
          </div>
          {status !== 'loading' && services.length === 0 && (
            <p className="mt-6 text-center text-sm text-steel-600">{t('services.none')}</p>
          )}
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">{t('services.whenEyebrow')}</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t('services.whenTitle')}</h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">{t('services.whenText')}</p>
          </Reveal>
          <Reveal delay={100} className="grid grid-cols-2 gap-4">
            <img
              src="/images/products/kato.webp"
              alt={t('services.scaleAlt')}
              className="aspect-square w-full rounded-xl object-cover"
              loading="lazy"
            />
            <img
              src="/images/products/kanot.webp"
              alt={t('home.indicator')}
              className="aspect-square w-full rounded-xl object-cover"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>

      <CtaBand title={t('services.cta')} message={serviceEnquiry} />
    </>
  )
}
