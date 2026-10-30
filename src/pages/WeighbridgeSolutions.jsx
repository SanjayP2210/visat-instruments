import { ArrowRight, Check, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import ContactButtons from '../components/common/ContactButtons'
import CtaBand from '../components/common/CtaBand'
import Icon from '../components/common/Icon'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import SectionHeading from '../components/common/SectionHeading'
import { business } from '../data/business'
import { weighbridgeSolutions } from '../data/services'
import { usePageTitle } from '../hooks/usePageTitle'

const weighbridgeEnquiry = `Hello ${business.name},\nI would like to enquire about a weighbridge solution (platform, electronics and software).\nPlease share details.`

export default function WeighbridgeSolutions() {
  usePageTitle('Weighbridge Solutions')
  const { components, softwareFeatures, steps } = weighbridgeSolutions

  return (
    <>
      <PageHero
        eyebrow="Weighbridge solutions"
        title="Weighbridge hardware, electronics and software"
        intro="Everything needed to weigh vehicles and keep a record of every weighment — planned around your site."
        crumbs={[{ label: 'Weighbridge Solutions' }]}
      />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-steel-200">
              <img
                src="/images/products/bridge.webp"
                alt="Blue steel weighbridge platform with guard rails installed on concrete foundations"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <SectionHeading
              eyebrow="Weighbridge systems"
              title="Steel weighbridge platforms"
              intro="Our weighbridge platforms are steel-deck structures with side guard rails, installed on prepared concrete foundations. The platform, its size and the foundation are planned around your site and the vehicles you weigh."
            />
            <ul className="mt-6 space-y-2 text-sm text-navy-800">
              {['Steel deck with side guard rails', 'Installed on concrete foundations', 'Sized to your site and vehicles'].map(
                (t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
                    {t}
                  </li>
                ),
              )}
            </ul>
            <p className="mt-6 flex gap-2 rounded-lg bg-accent-50 p-4 text-sm text-navy-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
              Platform sizes, capacities and load cell configurations are confirmed on enquiry.
            </p>
            <ContactButtons message={weighbridgeEnquiry} className="mt-8" />
          </Reveal>
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="System components"
            title="What makes up a weighbridge"
            intro="Each part of the system is available from us."
          />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {components.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 70} className="card relative flex flex-col p-5">
                <span className="absolute top-4 right-4 font-display text-sm font-bold text-steel-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-900 text-accent-400">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-steel-600">{c.text}</p>
                <Link
                  to={`/products/${c.productSlug}`}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-accent-600 hover:underline"
                >
                  View product <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section relative overflow-hidden bg-navy-900 text-white">
        <div className="grid-lines absolute inset-0" aria-hidden="true" />
        <div className="container-x relative grid gap-12 lg:grid-cols-12 lg:items-center">
          <Reveal className="lg:col-span-5">
            <SectionHeading
              light
              eyebrow="Weighbridge software"
              title="Record every weighment on your PC"
              intro={`${business.name} weighbridge software runs on a Windows PC and records each vehicle weighment. Features shown on the actual software screen include:`}
            />
            <ul className="mt-6 grid gap-2.5">
              {softwareFeatures.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-navy-100">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/products/weighbridge-software" className="btn-primary mt-8">
              Software details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal className="lg:col-span-7" delay={120}>
            <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-white/10">
              <img
                src="/images/products/meter.webp"
                alt="VISAT INSTRUMENTS weighbridge software showing weight display, ticket and vehicle fields, and function buttons"
                className="aspect-[4/3] w-full object-contain"
                loading="lazy"
              />
            </div>
            <p className="mt-3 text-xs text-navy-100/60">Actual screen of the weighbridge software.</p>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <SectionHeading align="center" eyebrow="How it works" title="From enquiry to a working weighbridge" />
          <ol className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map((step, i) => (
              <Reveal as="li" key={step.title} delay={i * 80} className="relative border-t-2 border-navy-900 pt-6">
                <span className="absolute -top-3.5 left-0 grid h-7 w-7 place-items-center rounded-full bg-accent-500 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-steel-600">{step.text}</p>
              </Reveal>
            ))}
          </ol>
          <p className="mt-10 text-center text-xs text-steel-500">
            Process shown for guidance. Scope and timelines are confirmed for each project.
          </p>
        </div>
      </section>

      <CtaBand title="Planning a weighbridge?" message={weighbridgeEnquiry} />
    </>
  )
}
