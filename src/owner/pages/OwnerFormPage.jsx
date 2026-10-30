import { ArrowLeft, ArrowRight, CheckCircle2, CloudOff, Loader2, Save, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import FormSummary from '../components/FormSummary'
import BusinessStep from '../components/steps/BusinessStep'
import ImagesStep from '../components/steps/ImagesStep'
import ProductsStep from '../components/steps/ProductsStep'
import { FeedbackStep, HighlightsStep, WeighbridgeStep } from '../components/steps/SectionSteps'
import ServicesStep from '../components/steps/ServicesStep'
import SpecificationsStep from '../components/steps/SpecificationsStep'
import { Alert, formatDateTime, Spinner } from '../components/ui'
import { useDraftSync } from '../hooks/useDraftSync'
import { emptyForm, newId } from '../model/form'
import { STEPS, validateAll, validateStep } from '../model/validation'
import { draftService, EDITABLE_STATUSES } from '../services/draftService'
import { checkImageFile, IMAGE_RULES, imageService } from '../services/imageService'
import { submissionService } from '../services/submissionService'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function SaveStatus({ state, onSave, onReload }) {
  const { status, lastSavedAt, error } = state
  let content
  if (status === 'saving') content = <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Saving to cloud…</>
  else if (status === 'saved') content = <><CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" /> Saved to cloud · {formatDateTime(lastSavedAt)}</>
  else if (status === 'dirty') content = <>Unsaved changes{lastSavedAt && ` · last saved ${formatDateTime(lastSavedAt)}`}</>
  else if (status === 'new') content = <>Not saved yet</>
  else content = <><CloudOff className="h-4 w-4 text-red-600" aria-hidden="true" /> <span className="text-red-700">{error}</span></>

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-steel-200 bg-white px-4 py-3 text-sm">
      <p className="flex items-center gap-2 text-steel-600" role="status" aria-live="polite">
        {content}
      </p>
      {status === 'conflict' ? (
        <button type="button" onClick={onReload} className="btn-outline px-3 py-2 text-xs">
          Reload latest version
        </button>
      ) : (
        status !== 'locked' && (
          <button type="button" onClick={onSave} disabled={status === 'saving'} className="btn-outline px-3 py-2 text-xs">
            <Save className="h-3.5 w-3.5" aria-hidden="true" />
            Save draft
          </button>
        )
      )}
    </div>
  )
}

function Stepper({ current, onSelect, stepHasErrors }) {
  return (
    <nav aria-label="Form progress">
      <p className="mb-2 text-xs font-semibold text-steel-500">
        Step {current + 1} of {STEPS.length}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-steel-200">
        <div className="h-full bg-accent-500 transition-all" style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
      </div>
      <ol className="mt-3 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {STEPS.map((step, i) => (
          <li key={step.key} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={i === current ? 'step' : undefined}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold whitespace-nowrap ${
                i === current ? 'bg-navy-900 text-white' : 'text-steel-600 hover:bg-white'
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                  stepHasErrors(step.key) ? 'bg-red-500 text-white' : i === current ? 'bg-accent-500 text-white' : 'bg-steel-200 text-navy-800'
                }`}
              >
                {i + 1}
              </span>
              {step.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function FormEditor({ initial }) {
  const { formId } = initial
  const auth = useAuth()
  const [form, setForm] = useState(initial.data)
  const [step, setStep] = useState(0)
  const [shownErrors, setShownErrors] = useState({})
  const [uploads, setUploads] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitted, setSubmitted] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const formRef = useRef(form)
  const uploadsRef = useRef(uploads)
  const submitRequestId = useRef(crypto.randomUUID())
  formRef.current = form
  uploadsRef.current = uploads

  const sync = useDraftSync({
    formId,
    form,
    initialRevision: initial.revision,
    initialSavedAt: initial.updatedAt,
    enabled: !submitted,
    authReady: !auth.expired,
  })

  useEffect(() => {
    if (initial.status !== 'CHANGES_REQUESTED') return
    submissionService.get(formId).then((s) => setReviewNote(s.reviewNote || '')).catch(() => {})
  }, [formId, initial.status])

  const stepKey = STEPS[step].key
  const errorsFor = useCallback((key) => (shownErrors[key] ? validateStep(key, form) : {}), [shownErrors, form])
  const stepHasErrors = (key) => shownErrors[key] && Object.keys(validateStep(key, form)).length > 0

  const goTo = (i) => {
    setStep(i)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const next = () => {
    if (Object.keys(validateStep(stepKey, form)).length) {
      setShownErrors((s) => ({ ...s, [stepKey]: true }))
      return
    }
    goTo(Math.min(step + 1, STEPS.length - 1))
  }

  /* ---------- photo uploads (one at a time) ---------- */
  const addFiles = (product, files, existingCount) => {
    const rejected = []
    const accepted = []
    files.forEach((file) => {
      const problem = checkImageFile(file)
      if (problem) rejected.push(`${file.name}: ${problem}`)
      else if (existingCount + accepted.length >= IMAGE_RULES.maxPerProduct) rejected.push(`${file.name}: limit of ${IMAGE_RULES.maxPerProduct} photos reached.`)
      else accepted.push({ localId: crypto.randomUUID(), productId: product.id, file, previewUrl: URL.createObjectURL(file), status: 'queued', error: '' })
    })
    if (accepted.length) setUploads((u) => [...u, ...accepted])
    return { rejected }
  }

  const finishUpload = (localId, patch) =>
    setUploads((list) => {
      if (patch) return list.map((u) => (u.localId === localId ? { ...u, ...patch } : u))
      const done = list.find((u) => u.localId === localId)
      if (done) URL.revokeObjectURL(done.previewUrl)
      return list.filter((u) => u.localId !== localId)
    })

  useEffect(() => {
    if (uploads.some((u) => u.status === 'uploading')) return
    const job = uploads.find((u) => u.status === 'queued')
    if (!job) return
    finishUpload(job.localId, { status: 'uploading', error: '' })
    ;(async () => {
      try {
        if (sync.revisionRef.current === 0) await sync.saveNow({ force: true }) // the draft must exist first
        const product = formRef.current.products.find((p) => p.id === job.productId)
        if (!product) return finishUpload(job.localId)
        const ref = await imageService.upload({ formId, product, file: job.file })
        const image = { fileId: ref.fileId, name: ref.name, mimeType: ref.mimeType, sizeBytes: ref.sizeBytes, sha256: ref.sha256 }
        setForm((f) => ({
          ...f,
          products: f.products.map((p) =>
            p.id === job.productId && !p.images.some((i) => i.fileId === image.fileId) ? { ...p, images: [...p.images, image] } : p,
          ),
        }))
        finishUpload(job.localId)
      } catch (err) {
        finishUpload(job.localId, { status: 'error', error: err.message })
      }
    })()
  }, [uploads, formId, sync])

  const removeStored = async (productId, fileId) => {
    await imageService.remove(fileId) // only update the form once the server confirms
    setForm((f) => ({
      ...f,
      products: f.products.map((p) => (p.id === productId ? { ...p, images: p.images.filter((i) => i.fileId !== fileId) } : p)),
    }))
  }

  /* ---------- submit ---------- */
  const allErrors = useMemo(() => validateAll(form), [form])

  const submit = async () => {
    setSubmitError(null)
    if (Object.keys(allErrors).length) {
      setShownErrors(Object.fromEntries(STEPS.map((s) => [s.key, true])))
      setSubmitError({ message: 'Please complete the highlighted steps before submitting.' })
      return
    }
    setSubmitting(true)
    try {
      // Upload any pending photos first, retrying failed ones once.
      setUploads((list) => list.map((u) => (u.status === 'error' ? { ...u, status: 'queued', error: '' } : u)))
      await wait(50)
      while (uploadsRef.current.some((u) => u.status === 'queued' || u.status === 'uploading')) await wait(300)
      if (uploadsRef.current.length) {
        throw Object.assign(new Error('Some photos could not be uploaded. Retry or discard them on the Product photos step.'), { code: 'PENDING_UPLOADS' })
      }
      if (sync.inFlight.current) await sync.inFlight.current.catch(() => {})
      const finalForm = formRef.current
      const result = await submissionService.submit(formId, sync.revisionRef.current, finalForm, submitRequestId.current)
      sync.markSaved(finalForm)
      setSubmitted(result)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSubmitError({ message: err.message, details: err.details?.errors ?? err.details?.files })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold">Information submitted</h1>
        <p className="mt-2 text-steel-600">Your information is saved in Google Sheets and Drive. The developer has been given access to review it.</p>
        <dl className="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-2 text-left text-sm">
          <dt className="text-steel-500">Reference</dt>
          <dd className="font-bold">{submitted.reference}</dd>
          <dt className="text-steel-500">Version</dt>
          <dd className="font-bold">{submitted.version}</dd>
          <dt className="text-steel-500">Submitted</dt>
          <dd className="font-bold">{formatDateTime(submitted.submittedAt)}</dd>
        </dl>
        <Link to={`/owner-information/submissions/${formId}`} className="btn-navy mt-8">
          View submission status
        </Link>
      </div>
    )
  }

  const locked = sync.state.status === 'locked'
  const stepProps = { form, setForm, errors: errorsFor(stepKey) }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <Stepper current={step} onSelect={goTo} stepHasErrors={stepHasErrors} />
      </aside>

      <div className="min-w-0 space-y-5">
        <SaveStatus state={sync.state} onSave={() => sync.saveNow({ force: true }).catch(() => {})} onReload={() => window.location.assign(`/owner-information?form=${formId}`)} />
        {initial.status === 'CHANGES_REQUESTED' && (
          <Alert tone="warning" title="Changes requested">
            {reviewNote || 'The developer asked for changes.'} Update the form and submit it again.
          </Alert>
        )}

        <div>
          <h1 className="text-3xl font-bold">{STEPS[step].title}</h1>
        </div>

        <fieldset disabled={locked} className="min-w-0">
          {stepKey === 'business' && <BusinessStep {...stepProps} />}
          {stepKey === 'products' && <ProductsStep {...stepProps} />}
          {stepKey === 'specifications' && <SpecificationsStep {...stepProps} />}
          {stepKey === 'images' && (
            <ImagesStep
              form={form}
              uploads={uploads}
              onAddFiles={addFiles}
              onRetry={(id) => finishUpload(id, { status: 'queued', error: '' })}
              onDiscard={(id) => finishUpload(id)}
              onRemoveStored={removeStored}
              locked={locked}
            />
          )}
          {stepKey === 'services' && <ServicesStep {...stepProps} />}
          {stepKey === 'weighbridge' && <WeighbridgeStep {...stepProps} />}
          {stepKey === 'highlights' && <HighlightsStep {...stepProps} />}
          {stepKey === 'feedback' && <FeedbackStep {...stepProps} />}
          {stepKey === 'review' && (
            <div className="space-y-4">
              {Object.keys(allErrors).length > 0 && (
                <Alert tone="error" title="Some required information is missing">
                  <ul className="list-disc pl-4">
                    {Object.keys(allErrors).map((key) => (
                      <li key={key}>
                        <button type="button" className="font-semibold underline" onClick={() => {
                          setShownErrors((s) => ({ ...s, [key]: true }))
                          goTo(STEPS.findIndex((s) => s.key === key))
                        }}>
                          {STEPS.find((s) => s.key === key).title}
                        </button>
                        : {Object.values(allErrors[key])[0]}
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}
              <FormSummary form={form} onEditStep={(key) => goTo(STEPS.findIndex((s) => s.key === key))} />
            </div>
          )}
        </fieldset>

        {submitError && (
          <Alert tone="error" title="Not submitted">
            {submitError.message}
            {submitError.details?.length > 0 && (
              <ul className="mt-2 list-disc pl-4">
                {submitError.details.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-steel-200 pt-5">
          <button type="button" onClick={() => goTo(Math.max(step - 1, 0))} disabled={step === 0} className="btn-outline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          {stepKey === 'review' ? (
            <button type="button" onClick={submit} disabled={submitting || locked} className="btn-primary">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Submitting…' : 'Submit information'}
            </button>
          ) : (
            <button type="button" onClick={next} className="btn-navy">
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OwnerFormPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const requested = params.get('form')
  const startNew = params.get('new') === '1'
  const [loaded, setLoaded] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.isOwner) return
    let active = true
    setLoaded(null)
    setError('')
    ;(async () => {
      try {
        let draft
        if (requested) {
          draft = await draftService.get(requested)
          if (!EDITABLE_STATUSES.includes(draft.status)) {
            navigate(`/owner-information/submissions/${requested}`, { replace: true })
            return
          }
        } else if (!startNew) {
          const latest = (await draftService.list()).find((d) => EDITABLE_STATUSES.includes(d.status))
          if (latest) draft = await draftService.get(latest.formId)
        }
        if (!active) return
        setLoaded(draft ?? { formId: newId('FRM'), revision: 0, status: 'DRAFT', updatedAt: '', data: emptyForm() })
      } catch (err) {
        if (active) setError(err.message)
      }
    })()
    return () => {
      active = false
    }
  }, [requested, startNew, user, navigate])

  if (user && !user.isOwner) return <Navigate to="/owner-information/submissions" replace />
  if (error) {
    return (
      <Alert tone="error" title="Could not load your draft">
        {error}{' '}
        <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
          Try again
        </button>
      </Alert>
    )
  }
  if (!loaded) return <Spinner label="Loading your saved draft…" />
  return <FormEditor key={loaded.formId} initial={loaded} />
}
