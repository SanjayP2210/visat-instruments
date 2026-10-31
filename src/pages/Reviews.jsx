import { CheckCircle2, Loader2, MessageSquareQuote, Send, Star } from 'lucide-react'
import { useState } from 'react'
import PageHero from '../components/common/PageHero'
import Reveal from '../components/common/Reveal'
import ReviewCard from '../components/common/ReviewCard'
import ReviewsSummary from '../components/common/ReviewsSummary'
import SectionHeading from '../components/common/SectionHeading'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'
import { useSite } from '../context/SiteData'
import { trackEvent } from '../services/analytics'
import { publicApi } from '../utils/publicApi'

const OTHER = 'other' // "Other work" option
const empty = { name: '', rating: 0, serviceReceived: '', otherService: '', message: '', consent: false, website: '' }

function StarRating({ value, onChange, error }) {
  const t = useT()
  const [hover, setHover] = useState(0)
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">
        {t('reviewForm.rating')} <span className="text-accent-600">*</span>
      </legend>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
            <input type="radio" name="rating" value={n} checked={value === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={t(n > 1 ? 'reviewForm.stars' : 'reviewForm.star', { n })} />
            <Star className={`h-8 w-8 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent-500 ${(hover || value) >= n ? 'fill-accent-500 text-accent-500' : 'text-steel-300'}`} aria-hidden="true" />
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{t(error)}</p>}
    </fieldset>
  )
}

function ReviewForm() {
  const [values, setValues] = useState(empty)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const { services } = useSite()
  const t = useT()
  const serviceOptions = services.map((s) => s.title)

  const validate = () => {
    const e = {}
    if (values.name.trim().length < 2) e.name = 'val.nameRequired'
    if (!values.rating) e.rating = 'reviewForm.ratingRequired'
    if (!values.serviceReceived) e.serviceReceived = 'reviewForm.serviceRequired'
    if (values.serviceReceived === OTHER && values.otherService.trim().length < 2) e.otherService = 'reviewForm.otherRequired'
    if (values.message.trim().length < 20) e.message = 'reviewForm.messageShort'
    if (!values.consent) e.consent = 'reviewForm.consentRequired'
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
      trackEvent('review_submit', 'reviews-page')
      setStatus('sent')
      setValues(empty)
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      setMessage(err.status === 429 ? t('reviewForm.tooMany') : err.status === 0 ? t('form.network') : err.message)
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-[#1fa855]" aria-hidden="true" />
        <h3 className="mt-4 text-2xl font-bold">{t('reviewForm.thanks')}</h3>
        <p className="mt-2 text-sm text-steel-600">{t('reviewForm.received')}</p>
        <button type="button" className="btn-outline mt-6" onClick={() => setStatus('idle')}>
          {t('reviewForm.another')}
        </button>
      </div>
    )
  }

  const field = 'field-input'
  const err = (k) => errors[k] && <p className="mt-1.5 text-xs font-medium text-red-600">{t(errors[k])}</p>
  return (
    <form onSubmit={submit} noValidate className="card grid gap-5 p-6 sm:p-8">
      {status === 'error' && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {message}
        </p>
      )}
      <div>
        <label htmlFor="review-name" className="mb-1.5 block text-sm font-semibold text-navy-900">
          {t('reviewForm.name')} <span className="text-accent-600">*</span>
        </label>
        <input id="review-name" className={field} autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={100} aria-invalid={Boolean(errors.name)} />
        {err('name')}
      </div>
      <StarRating value={values.rating} onChange={(v) => set('rating', v)} error={errors.rating} />
      <div>
        <label htmlFor="review-service" className="mb-1.5 block text-sm font-semibold text-navy-900">
          {t('reviewForm.service')} <span className="text-accent-600">*</span>
        </label>
        <select id="review-service" className={field} value={values.serviceReceived} onChange={(e) => set('serviceReceived', e.target.value)} aria-invalid={Boolean(errors.serviceReceived)}>
          <option value="">{t('reviewForm.select')}</option>
          {serviceOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={OTHER}>{t('reviewForm.otherWork')}</option>
        </select>
        {err('serviceReceived')}
        {values.serviceReceived === OTHER && (
          <>
            <input aria-label={t('reviewForm.describe')} className={`${field} mt-2`} placeholder={t('reviewForm.describePlaceholder')} value={values.otherService} onChange={(e) => set('otherService', e.target.value)} maxLength={150} />
            {err('otherService')}
          </>
        )}
      </div>
      <div>
        <label htmlFor="review-message" className="mb-1.5 block text-sm font-semibold text-navy-900">
          {t('reviewForm.review')} <span className="text-accent-600">*</span>
        </label>
        <textarea id="review-message" rows={5} className={field} value={values.message} onChange={(e) => set('message', e.target.value)} maxLength={1500} aria-invalid={Boolean(errors.message)} placeholder={t('reviewForm.reviewPlaceholder')} />
        <p className="mt-1 text-xs text-steel-500">{values.message.length}/1500 · {t('reviewForm.noLinks')}</p>
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
            {t('reviewForm.consent')} <span className="text-accent-600">*</span>
          </span>
        </label>
        {err('consent')}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-steel-500">{t('reviewForm.checked')}</p>
        <button type="submit" className="btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {status === 'sending' ? t('form.sending') : t('reviewForm.submit')}
        </button>
      </div>
    </form>
  )
}

function ReviewList() {
  const site = useSite()
  const t = useT()
  const state = { loading: site.status === 'loading', error: site.status === 'offline', reviews: site.testimonials }

  if (state.loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-steel-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {t('reviews.loading')}
      </p>
    )
  }
  if (state.error) return <p className="rounded-lg border border-steel-200 bg-white p-5 text-sm text-steel-600">{t('reviews.loadError')}</p>
  if (!state.reviews.length) {
    return (
      <div className="rounded-lg border border-dashed border-steel-300 bg-white p-8 text-center text-sm text-steel-600">
        <MessageSquareQuote className="mx-auto mb-2 h-8 w-8 text-steel-300" aria-hidden="true" />
        {t('reviews.none')}
      </div>
    )
  }
  return (
    <ul className="grid gap-5 md:grid-cols-2">
      {state.reviews.map((r, i) => (
        <Reveal as="li" key={r.id} delay={(i % 2) * 80} className="flex">
          <ReviewCard review={r} />
        </Reveal>
      ))}
    </ul>
  )
}

export default function Reviews() {
  const t = useT()
  usePageTitle(t('reviews.pageTitle'), { description: t('reviews.pageDescription') })
  return (
    <>
      <PageHero eyebrow={t('reviews.eyebrow')} title={t('reviews.pageTitle')} intro={t('reviews.pageIntro')} crumbs={[{ label: t('reviews.eyebrow') }]} />
      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeading eyebrow={t('reviews.whatSay')} title={t('reviews.approved')} />
            <div className="mt-8">
              <ReviewList />
            </div>
            <div className="mt-10">
              <ReviewsSummary />
            </div>
          </div>
          <div id="write" className="scroll-mt-24 lg:col-span-5">
            <SectionHeading eyebrow={t('reviews.share')} title={t('reviews.write')} />
            <div className="mt-8">
              <ReviewForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
