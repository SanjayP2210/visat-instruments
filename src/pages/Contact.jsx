import { AlertCircle, CheckCircle2, Loader2, MapPin, Navigation, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import SocialLinks from '../components/common/SocialLinks'
import WhatsAppIcon from '../components/common/WhatsAppIcon'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { translate, useT } from '../i18n/LanguageContext'
import { getProducts } from '../services/catalogService'
import { trackEvent } from '../services/analytics'
import { publicApi } from '../utils/publicApi'
import { validateEnquiry } from '../utils/validation'
import { whatsappLink } from '../utils/whatsapp'

const emptyForm = { name: '', phone: '', email: '', interest: '', message: '', website: '' }
const OTHER_OPTIONS = ['contact.optWeighbridge', 'contact.optOther'] // translation keys

// Select values: "product:<slug>", "service:<slug>" or a plain label.
function interestDetails(value, products, services) {
  const [kind, slug] = value.split(':')
  if (kind === 'product') {
    const p = products.find((x) => x.slug === slug)
    return p ? { type: 'product', product: slug, interest: p.name } : { type: 'general' }
  }
  if (kind === 'service') {
    const s = services.find((x) => x.slug === slug)
    return s ? { type: 'service', service: slug, interest: s.title } : { type: 'general' }
  }
  return { type: 'general', ...(value ? { interest: translate('en', value) } : {}) } // stored in English for the admin panel
}

function buildWhatsAppMessage(values, business, t) {
  const lines = [t('wa.hello', { name: business.name }), `${t('contact.name')}: ${values.name.trim()}`, `${t('contact.phone')}: ${values.phone.trim()}`]
  if (values.email.trim()) lines.push(`${t('contact.email')}: ${values.email.trim()}`)
  if (values.interestLabel) lines.push(`${t('contact.interest')}: ${values.interestLabel}`)
  lines.push(`${t('contact.message')}: ${values.message.trim()}`)
  return lines.join('\n')
}

function Field({ id, label, required, error, hint, children }) {
  const t = useT()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label} {required ? <span className="text-accent-600">*</span> : <span className="font-normal text-steel-500">{t('common.optional')}</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {t(error)}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-steel-500">{hint}</p>
      )}
    </div>
  )
}

function EnquiryForm() {
  const site = useSite()
  const { business, services } = site
  const t = useT()
  const [searchParams] = useSearchParams()
  const preselected = searchParams.get('product') ? `product:${searchParams.get('product')}` : searchParams.get('service') ? `service:${searchParams.get('service')}` : ''
  const [values, setValues] = useState({ ...emptyForm, interest: preselected })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | error
  const [sendError, setSendError] = useState('')

  const products = getProducts(site)

  const update = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validateEnquiry(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`enquiry-${firstInvalid}`)?.focus()
      return
    }
    const details = interestDetails(values.interest, products, services)
    setStatus('sending')
    try {
      await publicApi.submitEnquiry({
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        website: values.website,
        ...details,
      })
      trackEvent('enquiry_submit', 'contact-form')
      setSubmitted({ ...values, interestLabel: details.interest ?? '' })
      setValues(emptyForm)
      setStatus('idle')
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setSendError(err.status === 429 ? t('contact.tooMany') : err.status === 0 ? t('form.network') : t('contact.sendFailed'))
      setStatus('error')
    }
  }

  const inputProps = (name) => ({
    id: `enquiry-${name}`,
    name,
    value: values[name],
    onChange: update,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `enquiry-${name}-error` : undefined,
    className: `field-input ${errors[name] ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`,
  })

  if (submitted) {
    return (
      <div className="animate-fade-in" role="status">
        <CheckCircle2 className="h-12 w-12 text-[#1fa855]" aria-hidden="true" />
        <h3 className="mt-4 text-2xl font-bold">{t('contact.thanks', { name: submitted.name.trim().split(' ')[0] })}</h3>
        <p className="mt-3 text-sm text-steel-600">
          {t('contact.received', { phone: submitted.phone.trim() })}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappLink(buildWhatsAppMessage(submitted, business, t), business)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            <WhatsAppIcon className="h-4 w-4" />
            {t('contact.alsoWhatsApp')}
          </a>
          <a href={`tel:${business.phone.tel}`} className="btn-outline">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t('cta.callNumber', { number: business.phone.display })}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-6 text-sm font-semibold text-steel-600 underline-offset-4 hover:text-navy-900 hover:underline"
        >
          {t('contact.again')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      {status === 'error' && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">
          {sendError}
        </p>
      )}
      <Field id="enquiry-name" label={t('contact.fullName')} required error={errors.name}>
        <input type="text" autoComplete="name" placeholder={t('contact.yourName')} {...inputProps('name')} />
      </Field>
      <Field id="enquiry-phone" label={t('contact.phoneNumber')} required error={errors.phone}>
        <input type="tel" autoComplete="tel" inputMode="tel" placeholder="98765 43210" {...inputProps('phone')} />
      </Field>
      <Field id="enquiry-email" label={t('contact.email')} error={errors.email}>
        <input type="email" autoComplete="email" placeholder="you@example.com" {...inputProps('email')} />
      </Field>
      <Field id="enquiry-interest" label={t('contact.interest')} error={errors.interest}>
        <select {...inputProps('interest')}>
          <option value="">{t('contact.select')}</option>
          <optgroup label={t('nav.products')}>
            {products.map((p) => (
              <option key={p.id} value={`product:${p.slug}`}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('nav.services')}>
            {services.map((s) => (
              <option key={s.id} value={`service:${s.slug}`}>
                {s.title}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('contact.other')}>
            {OTHER_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {t(o)}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      {/* Spam trap: hidden from people, often filled in by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="enquiry-website">Website</label>
        <input id="enquiry-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={update} />
      </div>
      <div className="sm:col-span-2">
        <Field id="enquiry-message" label={t('contact.message')} required error={errors.message} hint={t('contact.messageHint')}>
          <textarea rows={5} placeholder={t('contact.messagePlaceholder')} {...inputProps('message')} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-steel-500">{t('contact.privacy')}</p>
        <button type="submit" className="btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {status === 'sending' ? t('form.sending') : t('contact.submit')}
        </button>
      </div>
    </form>
  )
}

export default function Contact() {
  const t = useT()
  usePageTitle(t('nav.contact'), { page: 'contact' })
  const { business } = useSite()

  const cards = [
    {
      icon: <Phone className="h-5 w-5" aria-hidden="true" />,
      title: t('contact.callUs'),
      body: `${business.phone.display} · ${business.contactPerson}`,
      href: `tel:${business.phone.tel}`,
      action: t('contact.tapToCall'),
    },
    {
      icon: <WhatsAppIcon className="h-5 w-5" />,
      title: 'WhatsApp',
      body: `${business.phone.display} · ${business.contactPerson}`,
      href: business.whatsapp.url,
      action: t('contact.startChat'),
      external: true,
    },
    {
      icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
      title: t('contact.visitUs'),
      body: business.address.full,
      href: business.maps.directions,
      action: t('cta.directions'),
      external: true,
    },
  ]

  return (
    <>
      <PageHero
        eyebrow={t('nav.contact')}
        title={t('contact.title')}
        intro={t('contact.intro')}
        crumbs={[{ label: t('nav.contact') }]}
      />

      <section className="section">
        <div className="container-x">
          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card, i) => (
              <Reveal key={card.title} delay={i * 70}>
                <a
                  href={card.href}
                  {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group card flex h-full flex-col p-6 transition-colors hover:border-navy-900"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-navy-900 text-accent-400">{card.icon}</span>
                  <h2 className="mt-4 text-xl font-bold">{card.title}</h2>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-steel-600">{card.body}</p>
                  <span className="mt-4 text-sm font-bold text-accent-600 group-hover:underline">{card.action} →</span>
                </a>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-12">
            <Reveal className="card p-6 sm:p-8 lg:col-span-7">
              <h2 className="text-2xl font-bold sm:text-3xl">{t('contact.formTitle')}</h2>
              <p className="mt-2 mb-6 text-sm text-steel-600">
                {t('form.requiredBefore')} <span className="text-accent-600">*</span> {t('form.requiredAfter')}
              </p>
              <EnquiryForm />
            </Reveal>

            <Reveal className="flex flex-col gap-4 lg:col-span-5" delay={100}>
              <div className="card min-h-80 flex-1 overflow-hidden">
                <iframe
                  title={t('contact.map', { name: business.name })}
                  src={business.maps.embed}
                  className="h-full min-h-80 w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="card p-5">
                <h2 className="text-lg font-bold">{business.name}</h2>
                <address className="mt-2 text-sm leading-relaxed text-steel-600 not-italic">
                  {business.address.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a href={business.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-navy mt-4 w-full">
                  <Navigation className="h-4 w-4" aria-hidden="true" />
                  {t('contact.directionsMaps')}
                </a>
                {business.socialLinks?.length > 0 && (
                  <div className="mt-5 border-t border-steel-200 pt-4">
                    <h3 className="text-sm font-bold tracking-wider text-navy-900 uppercase">{t('social.followUs')}</h3>
                    <SocialLinks links={business.socialLinks} className="mt-3" />
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
