import { Info } from 'lucide-react'
import CtaBand from '../components/common/CtaBand'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import ServiceCard from '../components/common/ServiceCard'
import { business } from '../data/business'
import { services } from '../data/services'
import { usePageTitle } from '../hooks/usePageTitle'

const serviceEnquiry = `Hello ${business.name},\nI would like to enquire about service (installation / repair / maintenance / calibration) for my weighing equipment.\nEquipment: \nLocation: `

export default function Services() {
  usePageTitle('Services')
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Installation, repair, maintenance & calibration"
        intro="Service support for weighing scales, indicators and weighbridges."
        crumbs={[{ label: 'Services' }]}
      />

      <section className="section">
        <div className="container-x">
          <div className="flex gap-3 rounded-xl border border-accent-100 bg-accent-50 p-5 text-sm text-navy-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
            <p>
              <strong>Please note:</strong> the services below are planned offerings and are{' '}
              <strong>to be confirmed</strong>. Availability, scope, service area and charges depend on your equipment and
              location — please call or WhatsApp {business.phone.display} to confirm before booking.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={i * 70}>
                <ServiceCard service={service} showDetails />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">When to contact us</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Tell us about your equipment</h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">
              To help us respond quickly, share the type of equipment, the issue or service needed, and your location.
              Photos of the equipment and its display are helpful on WhatsApp.
            </p>
          </Reveal>
          <Reveal delay={100} className="grid grid-cols-2 gap-4">
            <img
              src="/images/products/kato.webp"
              alt="Electronic weighing scale"
              className="aspect-square w-full rounded-xl object-cover"
              loading="lazy"
            />
            <img
              src="/images/products/kanot.webp"
              alt="Digital weighing indicator"
              className="aspect-square w-full rounded-xl object-cover"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>

      <CtaBand title="Need service for your weighing equipment?" message={serviceEnquiry} />
    </>
  )
}
