import { ArrowRight, BadgeCheck, Cable, MapPin, MessageSquareText, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import { OwnerCardCompact } from '../components/common/OwnerCard'
import Reveal from '../components/common/Reveal'
import ReviewsCarousel, { ReviewsCarouselSkeleton } from '../components/common/ReviewsCarousel'
import ReviewsSummary from '../components/common/ReviewsSummary'
import SectionHeading from '../components/common/SectionHeading'
import ServiceCard from '../components/common/ServiceCard'
import WhatsAppIcon from '../components/common/WhatsAppIcon'
import ProductCard, { ProductCardSkeleton } from '../components/products/ProductCard'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'
import { getCategories, getFeaturedProducts, getProducts } from '../services/catalogService'
import { whatsappLink } from '../utils/whatsapp'

// Hero stat label whose link covers the whole stat block (keeps the <dl> markup valid).
const statLink = 'rounded-sm after:absolute after:inset-0 group-hover:text-accent-400 focus-visible:outline-2 focus-visible:outline-accent-400'

// Rating stats scroll to the "What our customers say" section below with an eased animation
// (works on repeat clicks too). Done in JS so it animates even where the browser's own smooth
// scrolling is switched off; scrolling by the user cancels it.
const scrollToReviews = (e) => {
  const target = document.getElementById('customer-reviews')
  if (!target) return
  e.preventDefault()
  const start = window.scrollY
  const offset = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const distance = target.getBoundingClientRect().top - offset
  const duration = Math.min(1200, Math.max(500, Math.abs(distance) * 0.6))
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2) // easeInOutCubic
  let begin = null
  let cancelled = false
  const cancel = () => (cancelled = true)
  const events = ['wheel', 'touchstart', 'keydown']
  events.forEach((ev) => window.addEventListener(ev, cancel, { once: true, passive: true }))
  const step = (now) => {
    begin ??= now
    const p = Math.min(1, (now - begin) / duration)
    if (!cancelled) window.scrollTo({ top: start + distance * ease(p), behavior: 'instant' })
    if (p < 1 && !cancelled) requestAnimationFrame(step)
    else events.forEach((ev) => window.removeEventListener(ev, cancel))
  }
  requestAnimationFrame(step)
}

const reasonsFor = (business, t) => [
  { icon: Cable, title: t('home.why1Title'), text: t('home.why1Text') },
  { icon: MapPin, title: t('home.why2Title'), text: t('home.why2Text') },
  { icon: MessageSquareText, title: t('home.why3Title'), text: t('home.why3Text') },
  ...(business.rating
    ? [
        {
          icon: Star,
          title: t('home.why4Title', { value: business.rating.value.toFixed(1) }),
          text: t('home.why4Text', { value: business.rating.value.toFixed(1), count: business.rating.count }),
          to: '/reviews',
        },
      ]
    : []),
]

function Hero() {
  const site = useSite()
  const { business } = site
  const banner = site.assets['home-banner']?.[0] // uploaded in Branding & Media
  const t = useT()
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <div className="grid-lines absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
        <div className="lg:col-span-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-navy-100">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden="true" />
            {business.type} · {t('home.place')}
          </p>
          <h1 className="mt-6 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
            {t('home.heroA')} <span className="text-accent-400">{t('home.heroB')}</span> {t('home.heroC')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-navy-100/80 sm:text-lg">
            {t('home.heroText', { name: business.name })}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/products" className="btn-primary">
              {t('home.explore')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href={whatsappLink(t('wa.general', { name: business.name }), business)} target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
              <WhatsAppIcon className="h-4 w-4" />
              {t('home.waEnquiry')}
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6">
            {business.rating && (
              <>
                <div className="group relative pr-4">
                  <dt className="text-xs text-navy-100/60">
                    <a href="#customer-reviews" onClick={scrollToReviews} className={statLink}>{t('home.ratingLabel')}</a>
                  </dt>
                  <dd className="mt-1 flex items-center gap-1 font-display text-2xl font-bold transition-colors group-hover:text-accent-400">
                    {business.rating.value.toFixed(1)}
                    <Star className="h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
                  </dd>
                </div>
                <div className="group relative px-4">
                  <dt className="text-xs text-navy-100/60">
                    <a href="#customer-reviews" onClick={scrollToReviews} className={statLink}>{t('home.reviewsLabel')}</a>
                  </dt>
                  <dd className="mt-1 font-display text-2xl font-bold transition-colors group-hover:text-accent-400">{business.rating.count}</dd>
                </div>
              </>
            )}
            <div className="group relative pl-4">
              <dt className="text-xs text-navy-100/60">
                <Link to="/products" className={statLink}>{t('home.categoriesLabel')}</Link>
              </dt>
              <dd className="mt-1 font-display text-2xl font-bold transition-colors group-hover:text-accent-400">{getCategories(site).length}</dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
            <img
              src={banner?.src ?? '/images/products/bridge.webp'}
              alt={banner?.alt || t('home.bannerAlt')}
              className="aspect-[4/3] w-full object-cover"
              fetchPriority="high"
            />
            {!banner && (
              <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy-950/85 to-transparent p-5 pt-16">
                <p className="text-xs font-semibold tracking-widest text-accent-400 uppercase">{t('home.onSite')}</p>
                <p className="font-display text-xl font-bold">{t('home.installation')}</p>
              </div>
            )}
          </div>
          <div className="absolute -right-3 -bottom-6 hidden w-40 overflow-hidden rounded-xl bg-white p-1.5 shadow-2xl sm:block lg:-right-6">
            <img
              src="/images/products/kanot.webp"
              alt={t('home.indicatorAlt')}
              className="aspect-square w-full rounded-lg object-cover"
            />
            <p className="px-1.5 py-2 text-xs font-bold text-navy-900">{t('home.indicator')}</p>
          </div>
        </div>
      </div>
      <div className="h-1 bg-accent-500" aria-hidden="true" />
    </section>
  )
}

function CategoryStrip() {
  const categories = getCategories(useSite())
  const t = useT()
  return (
    <section aria-labelledby="categories-heading" className="border-b border-steel-200 bg-navy-50">
      <div className="container-x py-10">
        <h2 id="categories-heading" className="sr-only">
          {t('home.categoriesHeading')}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat, i) => (
            <Reveal as="li" key={cat.id} delay={i * 60}>
              <Link
                to={`/products?category=${cat.slug}`}
                className="group flex h-full flex-col gap-3 rounded-lg border border-steel-200 bg-white p-4 transition-colors hover:border-navy-900"
              >
                <Icon name={cat.icon} className="h-6 w-6 text-accent-500" />
                <span className="text-sm leading-snug font-bold text-navy-900">{cat.name}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-steel-500 group-hover:text-accent-600">
                  {t('common.view')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Introduction() {
  const site = useSite()
  const { business } = site
  const t = useT()
  return (
    <section className="section">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl border border-steel-200 bg-navy-950">
            <img
              src="/images/products/meter.webp"
              alt={t('home.softwareAlt')}
              className="aspect-[4/3] w-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="absolute -right-2 -bottom-6 rounded-xl bg-accent-500 px-5 py-4 text-white shadow-xl sm:-right-6">
            <p className="font-display text-3xl leading-none font-bold">{getProducts(site).length}</p>
            <p className="mt-1 text-xs font-semibold">{t('home.productLines')}</p>
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <SectionHeading
            eyebrow={t('home.aboutEyebrow', { name: business.name })}
            title={t('home.aboutTitle')}
            intro={t('home.aboutIntro', { name: business.name })}
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[t('home.point1'), t('home.point2'), t('home.point3'), t('home.point4')].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                <BadgeCheck className="h-5 w-5 shrink-0 text-accent-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/about" className="btn-navy mt-8">
            {t('home.moreAbout')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function OwnersPreview() {
  const { business, owners } = useSite()
  const t = useT()
  if (!owners.length) return null
  return (
    <section aria-labelledby="home-owners-heading" className="border-t border-steel-200 py-14 sm:py-16">
      <div className="container-x grid gap-8 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow">{t('home.ownersEyebrow')}</p>
          <h2 id="home-owners-heading" className="mt-3 text-3xl font-bold">
            {t('home.ownersTitle', { name: business.name })}
          </h2>
          <Link
            to="/about#owners"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:underline"
          >
            {t('home.ownersLink')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-8">
          {owners.map((owner, i) => (
            <Reveal key={owner.id} delay={i * 100}>
              <OwnerCardCompact owner={owner} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeaturedProducts() {
  const site = useSite()
  const loading = site.status === 'loading'
  const featured = getFeaturedProducts(site).slice(0, 3)
  const t = useT()
  if (!loading && !featured.length) return null
  return (
    <section className="section bg-navy-50">
      <div className="container-x">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t('home.featuredEyebrow')}
            title={t('home.featuredTitle')}
            intro={t('home.featuredIntro')}
          />
          <Link to="/products" className="btn-outline shrink-0">
            {t('home.viewAllProducts')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, i) => <ProductCardSkeleton key={i} />)
            : featured.map((product, i) => (
                <Reveal key={product.id} delay={i * 80}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  )
}

function WeighbridgeBand() {
  const t = useT()
  const parts = [t('home.part1'), t('home.part2'), t('home.part3'), t('home.part4'), t('home.part5')]
  return (
    <section className="section relative overflow-hidden bg-navy-900 text-white">
      <div className="grid-lines absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeading
            light
            eyebrow={t('nav.weighbridge')}
            title={t('home.wbTitle')}
            intro={t('home.wbIntro')}
          />
          <ol className="mt-8 space-y-3">
            {parts.map((part, i) => (
              <li key={part} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="font-display text-lg font-bold text-accent-400">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm font-semibold">{part}</span>
              </li>
            ))}
          </ol>
          <Link to="/weighbridge-solutions" className="btn-primary mt-8">
            {t('home.wbExplore')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
        <Reveal className="grid grid-cols-2 gap-4" delay={120}>
          <img
            src="/images/products/socket.webp"
            alt={t('home.jbAlt')}
            className="row-span-2 h-full w-full rounded-xl bg-white object-cover"
            loading="lazy"
          />
          <img
            src="/images/products/kanot.webp"
            alt={t('home.indicator')}
            className="aspect-square w-full rounded-xl object-cover"
            loading="lazy"
          />
          <img
            src="/images/products/adapter.webp"
            alt={t('home.moduleAlt')}
            className="aspect-square w-full rounded-xl object-cover"
            loading="lazy"
          />
        </Reveal>
      </div>
    </section>
  )
}

function ServicesPreview() {
  const { services, status } = useSite()
  const t = useT()
  if (status !== 'loading' && !services.length) return null
  return (
    <section className="section">
      <div className="container-x">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t('nav.services')}
            title={t('services.title')}
            intro={t('home.servicesIntro')}
          />
          <Link to="/services" className="btn-outline shrink-0">
            {t('home.allServices')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, i) => (
            <Reveal key={service.id} delay={i * 70}>
              <ServiceCard service={service} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhyChooseUs() {
  const { business } = useSite()
  const t = useT()
  const reasons = reasonsFor(business, t)
  return (
    <section className="section bg-navy-50">
      <div className="container-x">
        <SectionHeading align="center" eyebrow={t('home.whyEyebrow')} title={t('home.whyTitle', { name: business.name })} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ icon: ReasonIcon, title, text, to }, i) => (
            <Reveal key={title} delay={i * 70} className={to ? 'card group relative p-6 transition-shadow hover:shadow-md' : 'card p-6'}>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-50 text-accent-600">
                <ReasonIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold">
                {to ? (
                  <Link to={to} className="after:absolute after:inset-0 group-hover:text-accent-600">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// Approved + published reviews (with consent) from the reviews API, in a carousel.
function CustomerReviews() {
  const { status, testimonials: reviews } = useSite()
  const t = useT()
  if (status === 'loading') return <ReviewsCarouselSkeleton />
  if (status === 'offline') return <p className="text-center text-sm text-steel-600">{t('reviews.loadError')}</p>
  if (!reviews.length) return <p className="text-center text-sm text-steel-600">{t('reviews.none')}</p>
  return <ReviewsCarousel reviews={reviews} />
}

function Reviews() {
  const t = useT()
  return (
    <section id="customer-reviews" className="section scroll-mt-16 lg:scroll-mt-[88px]">
      <div className="container-x">
        <SectionHeading align="center" eyebrow={t('reviews.eyebrow')} title={t('reviews.homeTitle')} className="mb-12" />
        <Reveal className="mb-12">
          <CustomerReviews />
        </Reveal>
        <Reveal className="mx-auto max-w-4xl">
          <ReviewsSummary />
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/reviews" className="btn-outline">
              {t('reviews.read')}
            </Link>
            <Link to="/reviews#write" className="btn-primary">
              {t('reviews.write')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function Home() {
  usePageTitle(undefined, { page: 'home' })
  return (
    <>
      <Hero />
      <CategoryStrip />
      <Introduction />
      <OwnersPreview />
      <FeaturedProducts />
      <WeighbridgeBand />
      <ServicesPreview />
      <WhyChooseUs />
      <Reviews />
      <CtaBand />
    </>
  )
}
