import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, callApi, configureApiAuth } from '../api/client'
import { ownerConfig } from '../config'

// Google Identity Services issues a signed ID token. The browser only decodes it to
// show the name and know when it expires; the server verifies it on every request.
const STORAGE_KEY = 'visat-owner-session'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const EXPIRY_MARGIN_MS = 60 * 1000

const AuthContext = createContext(null)

function decodeJwt(token) {
  const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function toSession(credential) {
  const claims = decodeJwt(credential)
  return { credential, exp: claims.exp * 1000, email: String(claims.email || '').toLowerCase(), name: claims.name || '' }
}

const isLive = (s) => Boolean(s && s.exp - EXPIRY_MARGIN_MS > Date.now())

function restoreSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    return isLive(s) ? s : null
  } catch {
    return null
  }
}

function persistSession(s) {
  try {
    if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode): the session just won't survive a reload.
  }
}

let gisPromise
function loadGis() {
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) return resolve(window.google)
      const script = document.createElement('script')
      script.src = GIS_SRC
      script.async = true
      script.onload = () => resolve(window.google)
      script.onerror = () => {
        gisPromise = null
        reject(new Error('Could not load Google Sign-In. Check your connection and try again.'))
      }
      document.head.appendChild(script)
    })
  }
  return gisPromise
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(restoreSession)
  const [user, setUser] = useState(null) // server-confirmed identity and role
  const [status, setStatus] = useState(session ? 'verifying' : 'signed-out')
  const [error, setError] = useState('')
  const [expired, setExpired] = useState(false)
  const [gisReady, setGisReady] = useState(false)
  const sessionRef = useRef(session)
  const userRef = useRef(user)

  useEffect(() => {
    sessionRef.current = session
    persistSession(session)
  }, [session])
  useEffect(() => {
    userRef.current = user
  }, [user])

  const expire = useCallback(() => {
    if (userRef.current) setExpired(true)
    else {
      setSession(null)
      setStatus('signed-out')
    }
  }, [])

  useEffect(() => {
    configureApiAuth({
      getToken: () => (isLive(sessionRef.current) ? sessionRef.current.credential : null),
      onUnauthenticated: expire,
    })
  }, [expire])

  // Mark the session expired shortly before the token does.
  useEffect(() => {
    if (!session) return undefined
    const timer = setTimeout(expire, Math.max(0, session.exp - EXPIRY_MARGIN_MS - Date.now()))
    return () => clearTimeout(timer)
  }, [session, expire])

  const handleCredential = useCallback((response) => {
    try {
      const next = toSession(response.credential)
      const current = userRef.current
      if (current && current.email !== next.email) {
        // A different account signed in: drop the previous identity entirely.
        setUser(null)
        setStatus('verifying')
      } else if (!current) {
        setStatus('verifying')
      }
      setError('')
      setExpired(false)
      setSession(next)
    } catch {
      setError('Google sign-in returned an unreadable response. Please try again.')
    }
  }, [])

  useEffect(() => {
    if (!ownerConfig.googleClientId) return
    let cancelled = false
    loadGis()
      .then((google) => {
        if (cancelled) return
        google.accounts.id.initialize({
          client_id: ownerConfig.googleClientId,
          callback: handleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
        })
        setGisReady(true)
      })
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [handleCredential])

  // Confirm identity and role with the server for each new token.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    callApi('whoami', {}, { retries: 1 })
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.code === 'FORBIDDEN') {
          setStatus('forbidden')
          setError(err.message)
          setUser(null)
          setSession(null)
        } else if (err.code !== 'UNAUTHENTICATED') {
          setStatus(userRef.current ? 'ready' : 'error')
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const signOut = useCallback(() => {
    window.google?.accounts?.id?.disableAutoSelect()
    setSession(null)
    setUser(null)
    setExpired(false)
    setStatus('signed-out')
    setError('')
  }, [])

  const renderButton = useCallback(
    (element) => {
      if (!gisReady || !element) return
      window.google.accounts.id.renderButton(element, { theme: 'filled_blue', size: 'large', text: 'signin_with', shape: 'rectangular' })
    },
    [gisReady],
  )

  const value = useMemo(
    () => ({ session, user, status, error, expired, gisReady, renderButton, signOut, retry: () => setSession((s) => (s ? { ...s } : s)) }),
    [session, user, status, error, expired, gisReady, renderButton, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
