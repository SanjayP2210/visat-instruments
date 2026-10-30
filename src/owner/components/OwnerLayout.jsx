import { LogOut, ShieldCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isOwnerIntegrationConfigured, ownerConfig } from '../config'
import { Alert, Spinner } from './ui'

function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    const previousTitle = document.title
    document.title = 'Owner Information | VISAT INSTRUMENTS'
    return () => {
      meta.remove()
      document.title = previousTitle
    }
  }, [])
}

function GoogleButton() {
  const { renderButton, gisReady } = useAuth()
  const ref = useRef(null)
  useEffect(() => renderButton(ref.current), [renderButton])
  return (
    <div className="min-h-11">
      <div ref={ref} />
      {!gisReady && <Spinner label="Loading Google Sign-In…" />}
    </div>
  )
}

function Shell({ children, header }) {
  return (
    <div className="min-h-screen bg-navy-50">
      <header className="border-b border-steel-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3" aria-label="VISAT INSTRUMENTS website">
            <img src="/images/branding/visat-instruments-logo-160.png" alt="" className="h-11 w-11 object-contain" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold text-navy-900">VISAT INSTRUMENTS</span>
              <span className="block text-xs font-semibold text-accent-600">Owner information</span>
            </span>
          </Link>
          {header}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}

function SetupPending() {
  return (
    <Shell>
      <div className="card mx-auto max-w-2xl p-8">
        <h1 className="text-3xl font-bold">Owner information – setup pending</h1>
        <p className="mt-3 text-steel-600">
          This private form saves to Google Sheets and Google Drive through a secured Google Apps Script API. It is not
          connected yet, so nothing can be saved or submitted here.
        </p>
        <Alert tone="warning" title="Missing configuration" className="mt-6">
          <ul className="list-disc pl-4">
            {!ownerConfig.googleClientId && <li>VITE_GOOGLE_CLIENT_ID (Google OAuth web client ID)</li>}
            {!ownerConfig.apiUrl && <li>VITE_OWNER_API_URL (deployed Apps Script web app URL, https)</li>}
          </ul>
        </Alert>
        <p className="mt-6 text-sm text-steel-600">
          Follow <code className="rounded bg-navy-50 px-1">docs/owner-information/SETUP.md</code> in the project to create the
          Google resources and set these values.
        </p>
      </div>
    </Shell>
  )
}

function SignInCard() {
  const { status, error } = useAuth()
  return (
    <Shell>
      <div className="card mx-auto max-w-md p-8 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-navy-900" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-bold">Private owner area</h1>
        <p className="mt-2 text-sm text-steel-600">Sign in with an authorised Google account to continue.</p>
        {error && (
          <Alert tone={status === 'forbidden' ? 'error' : 'warning'} className="mt-6 text-left">
            {error}
          </Alert>
        )}
        <div className="mt-6 flex justify-center">
          <GoogleButton />
        </div>
      </div>
    </Shell>
  )
}

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-semibold ${isActive ? 'bg-navy-900 text-white' : 'text-steel-600 hover:bg-navy-50 hover:text-navy-900'}`

export default function OwnerLayout() {
  useNoIndex()
  const auth = useAuth()

  if (!isOwnerIntegrationConfigured) return <SetupPending />
  if (!auth.user) {
    if (auth.status === 'verifying') {
      return (
        <Shell>
          <Spinner label="Checking your access…" />
        </Shell>
      )
    }
    return <SignInCard />
  }

  const { user } = auth
  return (
    <Shell
      header={
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Owner information" className="flex flex-wrap gap-1">
            {user.isOwner && (
              <NavLink to="/owner-information" end className={navClass}>
                Form
              </NavLink>
            )}
            <NavLink to="/owner-information/drafts" className={navClass}>
              Drafts
            </NavLink>
            <NavLink to="/owner-information/submissions" className={navClass}>
              Submissions
            </NavLink>
          </nav>
          <span className="hidden text-xs text-steel-500 md:inline" title={user.email}>
            {user.email} · {user.isOwner ? 'Owner' : 'Developer'}
          </span>
          <button type="button" onClick={auth.signOut} className="btn-outline px-3 py-2 text-xs">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      }
    >
      <Outlet />
      {auth.expired && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="expired-title">
          <div className="card w-full max-w-sm p-6 text-center">
            <h2 id="expired-title" className="text-2xl font-bold">
              Session expired
            </h2>
            <p className="mt-2 text-sm text-steel-600">
              Sign in again as <strong>{user.email}</strong> to keep saving. Your unsaved changes are kept on this page.
            </p>
            <div className="mt-5 flex justify-center">
              <GoogleButton />
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
