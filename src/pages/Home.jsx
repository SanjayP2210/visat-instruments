import { ArrowRight, BadgeCheck, Cable, MapPin, MessageSquareText, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import { OwnerCardCompact } from '../components/common/OwnerCard'
import Reveal from '../components/common/Reveal'
import ReviewsSummary from '../components/common/ReviewsSummary'
import SectionHeading from '../components/common/SectionHeading'
import ServiceCard from '../components/common/ServiceCard'
import WhatsAppIcon from '../components/common/WhatsAppIcon'
import ProductCard from '../components/products/ProductCard'
import { business } from '../data/business'
import { owners } from '../data/owners'
import { services } from '../data/services'
import { usePageTitle } from '../hooks/usePageTitle'
import { getCategories, getFeaturedProducts, getProducts } from '../services/catalogService'
import { generalEnquiryMessage, whatsappLink } from '../utils/whatsapp'

const reasons = [
  {
    icon: Cable,
    title: 'Hardware to software',
    text: 'Platforms, junction boxes, indicators, communication modules and weighbridge software from one supplier.',
  },
  {
    icon: MapPin,
    title: 'Based in Ahmedabad',
    text: 'Located in Chandlodiya, Ahmedabad, so you can visit, call or message us directly.',
  },
  {
    icon: MessageSquareText,
    title: 'Direct communication',
    text: 'Talk to us on the phone or WhatsApp and get answers specific to your requirement.',
  },
  {
    icon: Star,
    title: `Rated ${business.rating.value.toFixed(1)} on Google`,
    text: `Rated ${business.rating.value.toFixed(1)} out of 5 across ${business.rating.count} Google reviews.`,
  },
]

function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <div className="grid-lines absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid gap-12 py-16 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-24">
        <div className="lg:col-span-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-navy-100">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden="true" />
            {business.type} · Ahmedabad, Gujarat
          </p>
          <h1 className="mt-6 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
            Weighing scales &amp; <span className="text-accent-400">weighbridge solutions</span> you can rely on
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-navy-100/80 sm:text-lg">
            {business.name} supplies digital weighing indicators, electronic weighing scales, load cell junction boxes,
            communication modules, weighbridge systems and weighbridge software.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/products" className="btn-primary">
              Explore Products
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href={whatsappLink(generalEnquiryMessage)} target="_blank" rel="noopener noreferrer" className="btn-ghost-light">
              <WhatsAppIcon className="h-4 w-4" />
              WhatsApp Enquiry
            </a>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6">
            <div className="pr-4">
              <dt className="text-xs text-navy-100/60">Google rating</dt>
              <dd className="mt-1 flex items-center gap-1 font-display text-2xl font-bold">
                {business.rating.value.toFixed(1)}
                <Star className="h-4 w-4 fill-accent-400 text-accent-400" aria-hidden="true" />
              </dd>
            </div>
            <div className="px-4">
              <dt className="text-xs text-navy-100/60">Reviews</dt>
              <dd className="mt-1 font-display text-2xl font-bold">{business.rating.count}</dd>
            </div>
            <div className="pl-4">
              <dt className="text-xs text-navy-100/60">Categories</dt>
              <dd className="mt-1 font-display text-2xl font-bold">{getCategories().length}</dd>
            </div>
          </dl>
        </div>

        <div className="relative lg:col-span-6">
          <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
            <img
              src="/images/products/bridge.webp"
              alt="Blue steel weighbridge platform being installed on concrete foundations"
              className="aspect-[4/3] w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy-950/85 to-transparent p-5 pt-16">
              <p className="text-xs font-semibold tracking-widest text-accent-400 uppercase">On site</p>
              <p className="font-display text-xl font-bold">Weighbridge installation</p>
            </div>
          </div>
          <div className="absolute -right-3 -bottom-6 hidden w-40 overflow-hidden rounded-xl bg-white p-1.5 shadow-2xl sm:block lg:-right-6">
            <img
              src="/images/products/kanot.webp"
              alt="Visat instruments digital weighing indicator"
              className="aspect-square w-full rounded-lg object-cover"
            />
            <p className="px-1.5 py-2 text-xs font-bold text-navy-900">Digital Weighing Indicator</p>
          </div>
        </div>
      </div>
      <div className="h-1 bg-accent-500" aria-hidden="true" />
    </section>
  )
}

function CategoryStrip() {
  const categories = getCategories()
  return (
    <section aria-labelledby="categories-heading" className="border-b border-steel-200 bg-navy-50">
      <div className="container-x py-10">
        <h2 id="categories-heading" className="sr-only">
          Product categories
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
                  View <ArrowRight className="h-3 w-3" aria-hidden="true" />
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
  return (
    <section className="section">
      <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl border border-steel-200 bg-navy-950">
            <img
              src="/images/products/meter.webp"
              alt="VISAT INSTRUMENTS weighbridge software screen"
              className="aspect-[4/3] w-full object-contain"
              loading="lazy"
            />
          </div>
          <div className="absolute -right-2 -bottom-6 rounded-xl bg-accent-500 px-5 py-4 text-white shadow-xl sm:-right-6">
            <p className="font-display text-3xl leading-none font-bold">{getProducts().length}</p>
            <p className="mt-1 text-xs font-semibold">product lines</p>
          </div>
        </Reveal>
        <Reveal className="order-1 lg:order-2">
          <SectionHeading
            eyebrow="About VISAT INSTRUMENTS"
            title="Complete weighing solutions from Ahmedabad"
            intro={`${business.name} is a weighing scale supplier in Chandlodiya, Ahmedabad. We work across the weighing chain — from table-top scales and digital indicators to load cell junction boxes, weighbridge platforms and the software that records every weighment.`}
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              'Digital weighing indicators',
              'Electronic weighing scales',
              'Weighbridge platforms',
              'Weighbridge PC software',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-semibold text-navy-800">
                <BadgeCheck className="h-5 w-5 shrink-0 text-accent-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/about" className="btn-navy mt-8">
            More about us
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

function OwnersPreview() {
  return (
    <section aria-labelledby="home-owners-heading" className="border-t border-steel-200 py-14 sm:py-16">
      <div className="container-x grid gap-8 lg:grid-cols-12 lg:items-center">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow">Meet our owners</p>
          <h2 id="home-owners-heading" className="mt-3 text-3xl font-bold">
            The people behind {business.name}
          </h2>
          <Link
            to="/about#owners"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:underline"
          >
            Meet our owners on About Us
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
  const featured = getFeaturedProducts().slice(0, 3)
  return (
    <section className="section bg-navy-50">
      <div className="container-x">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Featured products"
            title="Our product range"
            intro="Actual products from VISAT INSTRUMENTS. Specifications and prices are shared on enquiry."
          />
          <Link to="/products" className="btn-outline shrink-0">
            View all products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product, i) => (
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
  const parts = ['Steel platform', 'Load cell junction box', 'Digital indicator', 'Communication module', 'PC software']
  return (
    <section className="section relative overflow-hidden bg-navy-900 text-white">
      <div className="grid-lines absolute inset-0" aria-hidden="true" />
      <div className="container-x relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <SectionHeading
            light
            eyebrow="Weighbridge solutions"
            title="One complete weighbridge, hardware to report"
            intro="A weighbridge is more than a platform. We bring together the platform, electronics and software so every vehicle weighment is recorded."
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
            Explore weighbridge solutions
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Reveal>
        <Reveal className="grid grid-cols-2 gap-4" delay={120}>
          <img
            src="/images/products/socket.webp"
            alt="Orange load cell junction boxes"
            className="row-span-2 h-full w-full rounded-xl bg-white object-cover"
            loading="lazy"
          />
          <img
            src="/images/products/kanot.webp"
            alt="Digital weighing indicator"
            className="aspect-square w-full rounded-xl object-cover"
            loading="lazy"
          />
          <img
            src="/images/products/adapter.webp"
            alt="Wireless serial communication module"
            className="aspect-square w-full rounded-xl object-cover"
            loading="lazy"
          />
        </Reveal>
      </div>
    </section>
  )
}

function ServicesPreview() {
  return (
    <section className="section">
      <div className="container-x">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Services"
            title="Support for your weighing equipment"
            intro="Service offerings are being finalised. Contact us to confirm availability for your equipment and location."
          />
          <Link to="/services" className="btn-outline shrink-0">
            All services
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
  return (
    <section className="section bg-navy-50">
      <div className="container-x">
        <SectionHeading align="center" eyebrow="Why choose us" title={`Why customers choose ${business.name}`} />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ icon: ReasonIcon, title, text }, i) => (
            <Reveal key={title} delay={i * 70} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent-50 text-accent-600">
                <ReasonIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Reviews() {
  return (
    <section className="section">
      <div className="container-x">
        <SectionHeading align="center" eyebrow="Reviews" title="What our customers say" className="mb-12" />
        <Reveal className="mx-auto max-w-4xl">
          <ReviewsSummary />
        </Reveal>
      </div>
    </section>
  )
}

export default function Home() {
  usePageTitle()
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
