import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import FormSummary from '../components/FormSummary'
import { Alert, formatDateTime, Spinner, StatusBadge } from '../components/ui'
import { draftService, EDITABLE_STATUSES } from '../services/draftService'

export default function DraftsPage() {
  const { user } = useAuth()
  const [drafts, setDrafts] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState({ formId: '', draft: null, error: '' })

  useEffect(() => {
    draftService.list().then(setDrafts).catch((err) => setError(err.message))
  }, [])

  const showPreview = async (formId) => {
    if (preview.formId === formId) return setPreview({ formId: '', draft: null, error: '' })
    setPreview({ formId, draft: null, error: '' })
    try {
      setPreview({ formId, draft: await draftService.get(formId), error: '' })
    } catch (err) {
      setPreview({ formId, draft: null, error: err.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Drafts</h1>
          <p className="mt-1 text-sm text-steel-600">
            {user.isOwner ? 'Continue where you left off. Drafts are saved in Google Sheets.' : 'All saved owner drafts (read-only).'}
          </p>
        </div>
        {user.isOwner && (
          <Link to="/owner-information?new=1" className="btn-outline" onClick={(e) => {
            if (drafts?.some((d) => EDITABLE_STATUSES.includes(d.status)) && !window.confirm('Start a separate new form? Your existing draft stays saved.')) e.preventDefault()
          }}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Start a new form
          </Link>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!drafts && !error && <Spinner label="Loading drafts…" />}
      {drafts?.length === 0 && <Alert>No drafts saved yet.</Alert>}

      {drafts?.length > 0 && (
        <ul className="space-y-3">
          {drafts.map((d) => (
            <li key={d.formId} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{d.businessName || 'Untitled form'}</p>
                  <p className="text-xs text-steel-500">
                    {d.productCount} product(s) · updated {formatDateTime(d.updatedAt)}
                    {user.isDeveloper && ` · ${d.ownerEmail}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={d.status} />
                  {user.isOwner && EDITABLE_STATUSES.includes(d.status) ? (
                    <Link to={`/owner-information?form=${d.formId}`} className="btn-navy px-3 py-2 text-xs">
                      Continue
                    </Link>
                  ) : !EDITABLE_STATUSES.includes(d.status) ? (
                    <Link to={`/owner-information/submissions/${d.formId}`} className="btn-outline px-3 py-2 text-xs">
                      View submission
                    </Link>
                  ) : (
                    <button type="button" onClick={() => showPreview(d.formId)} aria-expanded={preview.formId === d.formId} className="btn-outline px-3 py-2 text-xs">
                      {preview.formId === d.formId ? 'Hide' : 'View draft'}
                    </button>
                  )}
                </div>
              </div>
              {preview.formId === d.formId && (
                <div className="mt-4 border-t border-steel-200 pt-4">
                  {preview.error && <Alert tone="error">{preview.error}</Alert>}
                  {!preview.draft && !preview.error && <Spinner />}
                  {preview.draft && <FormSummary form={preview.draft.data} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
