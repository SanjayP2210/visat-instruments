import { ArrowRight, Building2, Layers, MapPin, Phone, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import { OwnerCard } from '../components/common/OwnerCard'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import SectionHeading from '../components/common/SectionHeading'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'
import { getCategories } from '../services/catalogService'

export default function About() {
  const t = useT()
  usePageTitle(t('nav.about'), { page: 'about' })
  const site = useSite()
  const { business, owners } = site
  const categories = getCategories(site)
  const aboutImage = site.assets['about-image']?.[0] ?? { src: '/images/products/bridge.webp', alt: t('about.imageAlt') }

  const highlights = [
    ...(owners.length ? [{ icon: Users, label: owners.length > 1 ? t('about.coOwners') : t('about.owner'), value: owners.map((o) => o.name).join(' & ') }] : []),
    { icon: Building2, label: t('about.businessType'), value: business.type },
    { icon: MapPin, label: t('about.location'), value: t('about.locationValue') },
    ...(business.rating ? [{ icon: Star, label: t('home.ratingLabel'), value: t('about.ratingValue', { value: business.rating.value.toFixed(1), count: business.rating.count }), to: '/reviews' }] : []),
    { icon: Layers, label: t('home.categoriesHeading'), value: t('about.categoriesValue', { count: categories.length }), to: '/products' },
  ]

  return (
    <>
      <PageHero
        eyebrow={t('nav.about')}
        title={t('about.title', { name: business.name })}
        intro={t('about.intro')}
        crumbs={[{ label: t('nav.about') }]}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-7">
            <SectionHeading eyebrow={t('about.whoEyebrow')} title={t('about.whoTitle')} />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-steel-600">
              <p>
                {t('about.p1', { name: business.name, type: business.type.toLowerCase(), owners: owners.map((o) => o.name).join(t('common.and')) })}
              </p>
              <p>
                {t('about.p2')}
              </p>
              <p>
                {t('about.p3')}
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/products" className="btn-navy">
                {t('notFound.products')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href={`tel:${business.phone.tel}`} className="btn-outline">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {business.phone.display}
              </a>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={120}>
            <div className="card overflow-hidden">
              <img
                src={aboutImage.src}
                alt={aboutImage.alt}
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
              <dl className="divide-y divide-steel-200">
                {highlights.map(({ icon: HighlightIcon, label, value, to }) => (
                  <div key={label} className={`flex items-center gap-4 px-5 py-4${to ? ' group relative transition-colors hover:bg-steel-50' : ''}`}>
                    <HighlightIcon className="h-5 w-5 shrink-0 text-accent-500" aria-hidden="true" />
                    <dt className="text-sm text-steel-500">
                      {to ? (
                        <Link to={to} className="after:absolute after:inset-0 group-hover:text-accent-600">
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                    </dt>
                    <dd className="ml-auto text-right text-sm font-bold text-navy-900 group-hover:text-accent-600">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="owners" aria-labelledby="owners-heading" className="section scroll-mt-16 border-t border-steel-200 lg:scroll-mt-[88px]">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">{t('about.leadership')}</p>
            <h2 id="owners-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
              {t('about.meetOwners')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">
              {t('about.ownersText', { name: business.name, owners: owners.map((o) => o.name).join(t('common.and')) })}
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2 lg:gap-8">
            {owners.map((owner, i) => (
              <Reveal key={owner.id} delay={i * 100}>
                <OwnerCard owner={owner} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow={t('about.expertiseEyebrow')}
            title={t('about.expertiseTitle')}
            intro={t('about.expertiseIntro')}
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat, i) => (
              <Reveal key={cat.id} delay={(i % 3) * 80}>
                <Link
                  to={`/products?category=${cat.slug}`}
                  className="group card flex h-full gap-4 p-6 transition-colors hover:border-navy-900"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-navy-900 text-accent-400">
                    <Icon name={cat.icon} className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold text-navy-900 group-hover:text-accent-600">
                      {cat.name}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-steel-600">{cat.description}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {[
            { title: t('about.v1Title'), text: t('about.v1Text') },
            { title: t('about.v2Title'), text: t('about.v2Text') },
            { title: t('about.v3Title'), text: t('about.v3Text') },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 80} className="border-l-2 border-accent-500 pl-6">
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand title={t('about.cta')} />
    </>
  )
}
