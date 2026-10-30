import { ArrowRight, Building2, Layers, MapPin, Phone, Star, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import { OwnerCard } from '../components/common/OwnerCard'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import SectionHeading from '../components/common/SectionHeading'
import { business } from '../data/business'
import { owners } from '../data/owners'
import { usePageTitle } from '../hooks/usePageTitle'
import { getCategories } from '../services/catalogService'

const ownerNames = owners.map((o) => o.name).join(' & ')

const highlights = [
  { icon: Users, label: 'Co-owners', value: ownerNames },
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
                {business.name} is a {business.type.toLowerCase()} based in Chandlodiya, Ahmedabad, Gujarat, co-owned by{' '}
                {owners.map((o) => o.name).join(' and ')}. We supply weighing equipment for shops, workshops, industries and
                sites that need to weigh vehicles.
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

      <section id="owners" aria-labelledby="owners-heading" className="section scroll-mt-16 border-t border-steel-200 lg:scroll-mt-[88px]">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow justify-center">Leadership</p>
            <h2 id="owners-heading" className="mt-3 text-3xl font-bold sm:text-4xl">
              Meet Our Owners
            </h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">
              {business.name} is run by its two co-owners, {owners.map((o) => o.name).join(' and ')}.
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
