import { Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { TextInput } from '../components/ui'

// Only same-site admin paths are allowed as the post-login destination.
const safeNext = (next) => (next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin')

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (status === 'signed-in') return <Navigate to={safeNext(params.get('next'))} replace />

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!email.trim()) errs.email = 'Enter your email address.'
    if (!password) errs.password = 'Enter your password.'
    setFieldErrors(errs)
    setError('')
    if (Object.keys(errs).length) return
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(safeNext(params.get('next')), { replace: true })
    } catch (err) {
      setError(err.message)
      setFieldErrors(err.fieldErrors ?? {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-navy-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/images/branding/visat-instruments-logo-160.png" alt="VISAT INSTRUMENTS" className="h-16 w-16 rounded-xl bg-white object-contain p-1" />
          <div>
            <h1 className="text-2xl font-bold text-white">Admin sign in</h1>
            <p className="text-sm text-navy-100/70">VISAT INSTRUMENTS website management</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="card space-y-4 p-6">
          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <TextInput id="login-email" label="Email" type="email" autoComplete="username" value={email} onChange={setEmail} error={fieldErrors.email} required />
          <TextInput id="login-password" label="Password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={fieldErrors.password} required />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
