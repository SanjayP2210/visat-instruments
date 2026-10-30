import { CheckCircle2, Loader2, MessageSquareQuote, Send, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import ReviewsSummary from '../components/common/ReviewsSummary'
import SectionHeading from '../components/common/SectionHeading'
import { publishedServices } from '../data/services'
import { usePageTitle } from '../hooks/usePageTitle'
import { publicApi } from '../utils/publicApi'

const OTHER = 'Other work'
const empty = { name: '', rating: 0, serviceReceived: '', otherService: '', message: '', consent: false, website: '' }

function StarRating({ value, onChange, error }) {
  const [hover, setHover] = useState(0)
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">
        Your rating <span className="text-accent-600">*</span>
      </legend>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={`${n} star${n > 1 ? 's' : ''}`} />
            <Star className={`h-8 w-8 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent-500 ${(hover || value) >= n ? 'fill-accent-500 text-accent-500' : 'text-steel-300'}`} aria-hidden="true" />
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  )
}

function ReviewForm() {
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const serviceOptions = [...publishedServices.map((s) => s.title), OTHER]

  const validate = () => {
    const e = {}
    if (values.name.trim().length < 2) e.name = 'Please enter your name.'
    if (!values.rating) e.rating = 'Please choose a rating from 1 to 5 stars.'
    if (!values.serviceReceived) e.serviceReceived = 'Please choose the service or work you received.'
    if (values.serviceReceived === OTHER && values.otherService.trim().length < 2) e.otherService = 'Please describe the work you received.'
    if (values.message.trim().length < 20) e.message = 'Please write at least 20 characters.'
    if (!values.consent) e.consent = 'Please agree to your review being published.'
    return e
  }

  const submit = async (event) => {
    event.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setStatus('sending')
    try {
      await publicApi.submitReview({
        name: values.name.trim(),
        rating: values.rating,
        serviceReceived: values.serviceReceived === OTHER ? values.otherService.trim() : values.serviceReceived,
        message: values.message.trim(),
        consent: values.consent,
        website: values.website,
      })
      setStatus('sent')
      setValues(empty)
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setMessage(err.status === 429 ? 'You have sent several reviews recently. Please try again later.' : err.message)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#1fa855]" aria-hidden="true" />
        <h3 className="mt-4 text-2xl font-bold">Thank you for your review</h3>
        <p className="mt-2 text-sm text-steel-600">Your review has been received. It will appear on this page after it has been checked and approved.</p>
        <button type="button" className="btn-outline mt-6" onClick={() => setStatus('idle')}>
          Write another review
        </button>
      </div>
    )
  }

  const field = 'field-input'
  const err = (k) => errors[k] && <p className="mt-1.5 text-xs font-medium text-red-600">{errors[k]}</p>
  return (
    <form onSubmit={submit} noValidate className="card grid gap-5 p-6 sm:p-8">
      {status === 'error' && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </p>
      )}
      <div>
        <label htmlFor="review-name" className="mb-1.5 block text-sm font-semibold text-navy-900">
          Your name <span className="text-accent-600">*</span>
        </label>
        <input id="review-name" className={field} autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={100} aria-invalid={Boolean(errors.name)} />
        {err('name')}
      </div>
      <StarRating value={values.rating} onChange={(v) => set('rating', v)} error={errors.rating} />
      <div>
        <label htmlFor="review-service" className="mb-1.5 block text-sm font-semibold text-navy-900">
          Service / work received <span className="text-accent-600">*</span>
        </label>
        <select id="review-service" className={field} value={values.serviceReceived} onChange={(e) => set('serviceReceived', e.target.value)} aria-invalid={Boolean(errors.serviceReceived)}>
          <option value="">Select…</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {err('serviceReceived')}
        {values.serviceReceived === OTHER && (
          <>
            <input aria-label="Describe the work you received" className={`${field} mt-2`} placeholder="e.g. Weighbridge repair" value={values.otherService} onChange={(e) => set('otherService', e.target.value)} maxLength={150} />
            {err('otherService')}
          </>
        )}
      </div>
      <div>
        <label htmlFor="review-message" className="mb-1.5 block text-sm font-semibold text-navy-900">
          Your review <span className="text-accent-600">*</span>
        </label>
        <textarea id="review-message" rows={5} className={field} value={values.message} onChange={(e) => set('message', e.target.value)} maxLength={1500} aria-invalid={Boolean(errors.message)} placeholder="Tell others about the work and service you received." />
        <p className="mt-1 text-xs text-steel-500">{values.message.length}/1500 · Links are not allowed.</p>
        {err('message')}
      </div>
      {/* Spam trap: hidden from people, often filled in by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="review-website">Website</label>
        <input id="review-website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm text-navy-800">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-accent-500" checked={values.consent} onChange={(e) => set('consent', e.target.checked)} aria-invalid={Boolean(errors.consent)} />
          <span>
            I agree that my name, rating and review may be published on the VISAT INSTRUMENTS website. <span className="text-accent-600">*</span>
          </span>
        </label>
        {err('consent')}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-steel-500">Reviews are checked before they appear on the website.</p>
        <button type="submit" className="btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {status === 'sending' ? 'Sending…' : 'Submit review'}
        </button>
      </div>
    </form>
  )
}

function ReviewList() {
  const [state, setState] = useState({ loading: true, reviews: [], error: false })
  useEffect(() => {
    publicApi
      .site()
      .then((site) => setState({ loading: false, reviews: site.testimonials ?? [], error: false }))
      .catch(() => setState({ loading: false, reviews: [], error: true }))
  }, [])

  if (state.loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-steel-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading reviews…
      </p>
    )
  }
  if (state.error) return <p className="rounded-lg border border-steel-200 bg-white p-5 text-sm text-steel-600">Customer reviews are not available right now. Please check back later.</p>
  if (!state.reviews.length) {
    return (
      <div className="rounded-lg border border-dashed border-steel-300 bg-white p-8 text-center text-sm text-steel-600">
        <MessageSquareQuote className="mx-auto mb-2 h-8 w-8 text-steel-300" aria-hidden="true" />
        No customer reviews published yet. Be the first to share your experience.
      </div>
    )
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {state.reviews.map((r, i) => (
        <Reveal as="li" key={r.id} delay={(i % 2) * 80} className="card flex flex-col p-6">
          {r.rating && (
            <p className="text-lg text-accent-500" aria-label={`${r.rating} out of 5 stars`}>
              {'★'.repeat(r.rating)}
              <span className="text-steel-300">{'★'.repeat(5 - r.rating)}</span>
            </p>
          )}
          <blockquote className="mt-3 flex-1 text-sm leading-relaxed whitespace-pre-line text-navy-800">“{r.message}”</blockquote>
          <footer className="mt-4 border-t border-steel-200 pt-3 text-sm">
            <p className="font-bold text-navy-900">{r.name}</p>
            {r.serviceReceived && <p className="text-xs text-steel-500">{r.serviceReceived}</p>}
          </footer>
        </Reveal>
      ))}
    </ul>
  )
}

export default function Reviews() {
  usePageTitle('Customer Reviews')
  return (
    <>
      <PageHero eyebrow="Reviews" title="Customer reviews" intro="Read what customers say about our work and services, or share your own experience." crumbs={[{ label: 'Reviews' }]} />
      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading eyebrow="What customers say" title="Approved customer reviews" />
            <div className="mt-8">
              <ReviewList />
            </div>
            <div className="mt-10">
              <ReviewsSummary />
            </div>
          </div>
          <div id="write" className="scroll-mt-24 lg:col-span-5">
            <SectionHeading eyebrow="Share your experience" title="Write a review" />
            <div className="mt-8">
              <ReviewForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
