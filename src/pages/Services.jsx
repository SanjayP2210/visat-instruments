import { Info } from 'lucide-react'
import CtaBand from '../components/common/CtaBand'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import ServiceCard from '../components/common/ServiceCard'
import { business } from '../data/business'
import { publishedServices } from '../data/services'
import { usePageTitle } from '../hooks/usePageTitle'

const serviceEnquiry = `Hello ${business.name},\nI would like to enquire about your services (sales / service & maintenance / installation / AMC).\nEquipment: \nLocation: `

export default function Services() {
  usePageTitle('Services')
  return (
    <>
      <PageHero
        eyebrow="Services"
        title="Sales, service, installation & AMC"
        intro="Sales, service and maintenance, installation and Annual Maintenance Contracts for weighbridges."
        crumbs={[{ label: 'Services' }]}
      />

      <section className="section">
        <div className="container-x">
          <div className="flex gap-3 rounded-xl border border-accent-100 bg-accent-50 p-5 text-sm text-navy-800">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden="true" />
            <p>
              Scope, service area and charges depend on your equipment and location. Please call or WhatsApp{' '}
              {business.phone.display} to discuss your requirement.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {publishedServices.map((service, i) => (
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
