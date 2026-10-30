import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, formatDateTime, Spinner, StatusBadge } from '../components/ui'
import { submissionService } from '../services/submissionService'

export default function SubmissionsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    submissionService.list().then(setItems).catch((err) => setError(err.message))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Submissions</h1>
        <p className="mt-1 text-sm text-steel-600">
          {user.isDeveloper ? 'Review submitted owner information.' : 'Track the review status of your submitted information.'}
        </p>
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {!items && !error && <Spinner label="Loading submissions…" />}
      {items?.length === 0 && <Alert>No submissions yet.</Alert>}
      {items?.length > 0 && (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.formId}>
              <Link to={`/owner-information/submissions/${s.formId}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-navy-900">
                <span className="min-w-0">
                  <span className="block font-display text-lg font-bold">{s.reference}</span>
                  <span className="block text-xs text-steel-500">
                    {s.businessName} · version {s.version} · submitted {formatDateTime(s.submittedAt)}
                    {user.isDeveloper && ` · ${s.ownerEmail}`}
                  </span>
                </span>
                <StatusBadge status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
