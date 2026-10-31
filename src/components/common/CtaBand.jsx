import { useBusiness } from '../../context/SiteData'
import { useT } from '../../i18n/LanguageContext'
import ContactButtons from './ContactButtons'
import Reveal from './Reveal'

export default function CtaBand({ title, text, message }) {
  const business = useBusiness()
  const t = useT()
  title ??= t('cta.bandTitle')
  text ??= t('cta.bandText', { name: business.name })
  message ??= t('wa.general', { name: business.name })
  return (
    <section className="section bg-white">
      <div className="container-x">
        <Reveal className="relative overflow-hidden rounded-2xl bg-navy-900 px-6 py-12 sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div className="grid-lines absolute inset-0" aria-hidden="true" />
          <div className="absolute top-0 left-0 h-full w-1.5 bg-accent-500" aria-hidden="true" />
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
            <p className="mt-3 text-navy-100/80">{text}</p>
          </div>
          <ContactButtons message={message} callVariant="btn-ghost-light" className="relative mt-8 shrink-0 lg:mt-0" />
        </Reveal>
      </div>
    </section>
  )
}
