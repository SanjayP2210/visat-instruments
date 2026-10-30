import { ArrowRight, Building2, Layers, MapPin, Phone, Star, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import SectionHeading from '../components/common/SectionHeading'
import WhatsAppIcon from '../components/common/WhatsAppIcon'
import { business } from '../data/business'
import { usePageTitle } from '../hooks/usePageTitle'
import { getCategories } from '../services/catalogService'

const highlights = [
  { icon: UserRound, label: business.owner.role, value: business.owner.name },
  { icon: Building2, label: 'Business type', value: business.type },
  { icon: MapPin, label: 'Location', value: 'Chandlodiya, Ahmedabad' },
  { icon: Star, label: 'Google rating', value: `${business.rating.value.toFixed(1)} / 5 (${business.rating.count} reviews)` },
  { icon: Layers, label: 'Product categories', value: `${getCategories().length} categories` },
]

export default function About() {
  usePageTitle('About Us')
  const categories = getCategories()

  return (
    <>
      <PageHero
        eyebrow="About us"
        title={`About ${business.name}`}
        intro="A weighing scale supplier in Ahmedabad, working across weighing scales, weighing electronics and weighbridge systems."
        crumbs={[{ label: 'About Us' }]}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:items-start">
          <Reveal className="lg:col-span-7">
            <SectionHeading eyebrow="Who we are" title="Weighing solutions, from the scale to the software" />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-steel-600">
              <p>
                {business.name} is a {business.type.toLowerCase()} based in Chandlodiya, Ahmedabad, Gujarat, owned by{' '}
                {business.owner.name}. We supply weighing equipment for shops, workshops, industries and sites that need to
                weigh vehicles.
              </p>
              <p>
                Our range covers table-top electronic weighing scales and digital weighing indicators, along with the
                parts that make larger systems work — load cell junction boxes and communication modules.
              </p>
              <p>
                For vehicle weighing, we work on electronic weighbridges and provide our own weighbridge software, which
                records tickets, vehicles, materials and gross, tare and net weights on a PC.
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/products" className="btn-navy">
                View products
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href={`tel:${business.phone.tel}`} className="btn-outline">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {business.phone.display}
              </a>
            </div>

            <div className="mt-10 flex flex-col gap-5 rounded-xl border border-steel-200 bg-navy-50 p-6 sm:flex-row sm:items-center">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-xl font-bold text-white"
                aria-hidden="true"
              >
                {business.owner.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold tracking-widest text-accent-600 uppercase">{business.owner.role}</p>
                <p className="font-display text-2xl font-bold text-navy-900">{business.owner.name}</p>
                <p className="text-sm text-steel-600">{business.name}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${business.phone.tel}`}
                  className="grid h-11 w-11 place-items-center rounded-md bg-navy-900 text-white hover:bg-navy-700"
                  aria-label={`Call ${business.owner.name}`}
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </a>
                <a
                  href={business.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid h-11 w-11 place-items-center rounded-md bg-[#1fa855] text-white hover:bg-[#178a45]"
                  aria-label={`WhatsApp ${business.owner.name}`}
                >
                  <WhatsAppIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal className="lg:col-span-5" delay={120}>
            <div className="card overflow-hidden">
              <img
                src="/images/products/bridge.webp"
                alt="Weighbridge platform installation by VISAT INSTRUMENTS"
                className="aspect-[16/10] w-full object-cover"
                loading="lazy"
              />
              <dl className="divide-y divide-steel-200">
                {highlights.map(({ icon: HighlightIcon, label, value }) => (
                  <div key={label} className="flex items-center gap-4 px-5 py-4">
                    <HighlightIcon className="h-5 w-5 shrink-0 text-accent-500" aria-hidden="true" />
                    <dt className="text-sm text-steel-500">{label}</dt>
                    <dd className="ml-auto text-right text-sm font-bold text-navy-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="Our expertise"
            title="What we work with"
            intro="Our expertise spans every part of a weighing setup."
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
            {
              title: 'Hardware and software together',
              text: 'From weighbridge platforms and junction boxes to our own PC software, the full weighing chain is covered.',
            },
            {
              title: 'Requirement-first approach',
              text: 'Capacities, sizes and configurations are discussed with you before anything is quoted.',
            },
            {
              title: 'Local and reachable',
              text: 'Based in Chandlodiya, Ahmedabad, and reachable directly by phone and WhatsApp.',
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 80} className="border-l-2 border-accent-500 pl-6">
              <h3 className="text-2xl font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-600">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand title="Let's talk about your weighing requirement" />
    </>
  )
}
