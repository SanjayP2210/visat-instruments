import { AlertCircle, CheckCircle2, MapPin, Navigation, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import WhatsAppIcon from '../components/common/WhatsAppIcon'
import { business } from '../data/business'
import { usePageTitle } from '../hooks/usePageTitle'
import { getProductBySlug, getProducts } from '../services/catalogService'
import { validateEnquiry } from '../utils/validation'
import { whatsappLink } from '../utils/whatsapp'

const emptyForm = { name: '', phone: '', email: '', interest: '', message: '' }

function buildWhatsAppMessage(values) {
  const lines = [`Hello ${business.name},`, `Name: ${values.name.trim()}`, `Phone: ${values.phone.trim()}`]
  if (values.email.trim()) lines.push(`Email: ${values.email.trim()}`)
  if (values.interest) lines.push(`Interested in: ${values.interest}`)
  lines.push(`Message: ${values.message.trim()}`)
  return lines.join('\n')
}

function Field({ id, label, required, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label} {required ? <span className="text-accent-600">*</span> : <span className="font-normal text-steel-500">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-steel-500">{hint}</p>
      )}
    </div>
  )
}

function EnquiryForm() {
  const [searchParams] = useSearchParams()
  const preselected = getProductBySlug(searchParams.get('product') ?? '')
  const [values, setValues] = useState({ ...emptyForm, interest: preselected?.name ?? '' })
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(null)

  const products = getProducts()

  const update = (e) => {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (errors[name]) setErrors((err) => ({ ...err, [name]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const found = validateEnquiry(values)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`enquiry-${firstInvalid}`)?.focus()
      return
    }
    // Phase 1: no backend. The enquiry is NOT stored or sent anywhere.
    // Phase 2: POST to /api/enquiries here.
    setSubmitted(values)
    setValues(emptyForm)
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
        <h3 className="mt-4 text-2xl font-bold">Thanks, {submitted.name.trim().split(' ')[0]}!</h3>
        <p className="mt-3 rounded-lg border border-accent-100 bg-accent-50 p-4 text-sm text-navy-800">
          <strong>Demo form:</strong> this website does not yet store or send form submissions, so your enquiry has{' '}
          <strong>not</strong> been delivered. To reach us, send it on WhatsApp or call us directly.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsappLink(buildWhatsAppMessage(submitted))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Send this enquiry on WhatsApp
          </a>
          <a href={`tel:${business.phone.tel}`} className="btn-outline">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call {business.phone.display}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="mt-6 text-sm font-semibold text-steel-600 underline-offset-4 hover:text-navy-900 hover:underline"
        >
          Fill the form again
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
      <Field id="enquiry-name" label="Full name" required error={errors.name}>
        <input type="text" autoComplete="name" placeholder="Your name" {...inputProps('name')} />
      </Field>
      <Field id="enquiry-phone" label="Phone number" required error={errors.phone}>
        <input type="tel" autoComplete="tel" inputMode="tel" placeholder="98765 43210" {...inputProps('phone')} />
      </Field>
      <Field id="enquiry-email" label="Email" error={errors.email}>
        <input type="email" autoComplete="email" placeholder="you@example.com" {...inputProps('email')} />
      </Field>
      <Field id="enquiry-interest" label="Interested in" error={errors.interest}>
        <select {...inputProps('interest')}>
          <option value="">Select a product or service</option>
          <optgroup label="Products">
            {products.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other">
            <option value="Complete weighbridge solution">Complete weighbridge solution</option>
            <option value="Service (sales / service & maintenance / installation / AMC)">
              Service (sales / service & maintenance / installation / AMC)
            </option>
            <option value="Other">Other</option>
          </optgroup>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="enquiry-message" label="Message" required error={errors.message} hint="Tell us what you need, quantity and location.">
          <textarea rows={5} placeholder="Describe your requirement" {...inputProps('message')} />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-steel-500">Demo form — submissions are not stored or sent.</p>
        <button type="submit" className="btn-primary">
          <Send className="h-4 w-4" aria-hidden="true" />
          Submit enquiry
        </button>
      </div>
    </form>
  )
}

export default function Contact() {
  usePageTitle('Contact Us')

  const cards = [
    {
      icon: <Phone className="h-5 w-5" aria-hidden="true" />,
      title: 'Call us',
      body: `${business.phone.display} · ${business.contactPerson}`,
      href: `tel:${business.phone.tel}`,
      action: 'Tap to call',
    },
    {
      icon: <WhatsAppIcon className="h-5 w-5" />,
      title: 'WhatsApp',
      body: `${business.phone.display} · ${business.contactPerson}`,
      href: business.whatsapp.url,
      action: 'Start a chat',
      external: true,
    },
    {
      icon: <MapPin className="h-5 w-5" aria-hidden="true" />,
      title: 'Visit us',
      body: business.address.full,
      href: business.maps.directions,
      action: 'Get directions',
      external: true,
    },
  ]

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="Get in touch"
        intro="Call, WhatsApp or visit us in Chandlodiya, Ahmedabad. Tell us your requirement and we will help."
        crumbs={[{ label: 'Contact Us' }]}
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
              <h2 className="text-2xl font-bold sm:text-3xl">Send an enquiry</h2>
              <p className="mt-2 mb-6 text-sm text-steel-600">
                Fields marked <span className="text-accent-600">*</span> are required.
              </p>
              <EnquiryForm />
            </Reveal>

            <Reveal className="flex flex-col gap-4 lg:col-span-5" delay={100}>
              <div className="card min-h-80 flex-1 overflow-hidden">
                <iframe
                  title={`Map showing ${business.name} location`}
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
                  Get directions on Google Maps
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  )
}
