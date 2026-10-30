import { ArrowLeft, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import FormSummary from '../components/FormSummary'
import { Alert, formatDateTime, Spinner, StatusBadge } from '../components/ui'
import { REVIEW_ACTIONS, STATUS_LABELS, submissionService } from '../services/submissionService'

function ReviewPanel({ submission, onUpdated }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const actions = REVIEW_ACTIONS[submission.status] ?? []
  if (!actions.length) return null

  const apply = async (status) => {
    if (status === 'CHANGES_REQUESTED' && !note.trim()) {
      setError('Describe the changes needed so the owner knows what to fix.')
      return
    }
    setBusy(status)
    setError('')
    try {
      await submissionService.setStatus(submission.formId, status, note.trim())
      setNote('')
      onUpdated()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="card p-5" aria-labelledby="review-title">
      <h2 id="review-title" className="text-xl font-bold">
        Review
      </h2>
      <label htmlFor="review-note" className="mt-3 block text-sm font-semibold">
        Note to the owner
      </label>
      <textarea id="review-note" rows={3} className="field-input mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Required when requesting changes" />
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((status) => (
          <button
            key={status}
            type="button"
            disabled={Boolean(busy)}
            onClick={() => apply(status)}
            className={status === 'APPROVED' ? 'btn-primary' : status === 'CHANGES_REQUESTED' ? 'btn-outline text-red-700' : 'btn-navy'}
          >
            {busy === status ? 'Saving…' : `Mark as ${STATUS_LABELS[status].toLowerCase()}`}
          </button>
        ))}
      </div>
    </section>
  )
}

export default function SubmissionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [submission, setSubmission] = useState(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    submissionService
      .get(id)
      .then((s) => active && setSubmission(s))
      .catch((err) => active && setError(err.message))
    return () => {
      active = false
    }
  }, [id, reloadKey])

  if (error) return <Alert tone="error" title="Could not load this submission">{error}</Alert>
  if (!submission) return <Spinner label="Loading submission…" />

  return (
    <div className="space-y-6">
      <Link to="/owner-information/submissions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-steel-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All submissions
      </Link>

      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-bold tracking-widest text-accent-600 uppercase">Submission</p>
          <h1 className="text-3xl font-bold">{submission.reference}</h1>
          <p className="mt-1 text-sm text-steel-600">
            Version {submission.version} · submitted {formatDateTime(submission.submittedAt)}
            {user.isDeveloper && ` · ${submission.ownerEmail}`}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {submission.status === 'CHANGES_REQUESTED' && (
        <Alert tone="warning" title="Changes requested">
          <p className="whitespace-pre-line">{submission.reviewNote}</p>
          {user.isOwner && (
            <Link to={`/owner-information?form=${submission.formId}`} className="btn-navy mt-3 px-3 py-2 text-xs">
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit and resubmit
            </Link>
          )}
        </Alert>
      )}
      {submission.status === 'APPROVED' && <Alert tone="success">Approved by the developer. Thank you!</Alert>}

      {user.isDeveloper && <ReviewPanel submission={submission} onUpdated={() => setReloadKey((k) => k + 1)} />}

      <section className="card p-5" aria-labelledby="history-title">
        <h2 id="history-title" className="text-xl font-bold">
          History
        </h2>
        <ol className="mt-3 space-y-3 border-l-2 border-steel-200 pl-4">
          {submission.history.map((h, i) => (
            <li key={i} className="text-sm">
              <p className="font-semibold">
                {STATUS_LABELS[h.status] ?? h.status} <span className="font-normal text-steel-500">· v{h.version} · {formatDateTime(h.at)}</span>
              </p>
              <p className="text-xs text-steel-500">{h.by}</p>
              {h.note && <p className="mt-1 whitespace-pre-line text-steel-600">{h.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      <FormSummary form={submission.data} />
    </div>
  )
}
