import { useCallback, useEffect, useRef, useState } from 'react'
import { draftService } from '../services/draftService'

const DEBOUNCE_MS = 2500
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000]

/**
 * Keeps the cloud draft in sync with the form.
 * - Debounced auto-save after changes, plus saveNow() for the manual button.
 * - One request at a time; changes made during a save are saved right after.
 * - Network failures retry with backoff using the same request ID (safe to repeat).
 * - Status is only "saved" after the server confirms the new revision.
 */
export function useDraftSync({ formId, form, initialRevision, initialSavedAt, enabled, authReady }) {
  const [revision, setRevision] = useState(initialRevision)
  const [state, setState] = useState({ status: initialRevision ? 'saved' : 'new', lastSavedAt: initialSavedAt || '', error: '' })

  const formRef = useRef(form)
  const savedRef = useRef(form)
  const revisionRef = useRef(initialRevision)
  const inFlight = useRef(null)
  const queued = useRef(false)
  const retryTimer = useRef(null)
  const retryCount = useRef(0)
  const pendingRequestId = useRef(null)
  formRef.current = form

  const isDirty = form !== savedRef.current

  const saveNow = useCallback(
    ({ force = false } = {}) => {
      if (!enabled) return Promise.resolve(null)
      if (inFlight.current) {
        queued.current = true
        return inFlight.current
      }
      const snapshot = formRef.current
      if (!force && snapshot === savedRef.current && revisionRef.current > 0) return Promise.resolve(null)
      clearTimeout(retryTimer.current)

      // Reuse the request ID while retrying the same unsaved snapshot.
      if (!pendingRequestId.current || pendingRequestId.current.form !== snapshot) {
        pendingRequestId.current = { form: snapshot, id: crypto.randomUUID() }
      }
      setState((s) => ({ ...s, status: 'saving', error: '' }))

      const request = draftService
        .save(formId, revisionRef.current, snapshot, pendingRequestId.current.id)
        .then((meta) => {
          revisionRef.current = meta.revision
          setRevision(meta.revision)
          savedRef.current = snapshot
          retryCount.current = 0
          pendingRequestId.current = null
          setState({ status: formRef.current === snapshot ? 'saved' : 'dirty', lastSavedAt: meta.updatedAt, error: '' })
          return meta
        })
        .catch((err) => {
          if (err.code === 'CONFLICT') {
            setState((s) => ({ ...s, status: 'conflict', error: err.message }))
          } else if (err.code === 'LOCKED') {
            setState((s) => ({ ...s, status: 'locked', error: err.message }))
          } else if (err.code === 'UNAUTHENTICATED') {
            setState((s) => ({ ...s, status: 'paused', error: 'Sign in again to keep saving.' }))
          } else if (err.retryable) {
            const delay = RETRY_DELAYS_MS[Math.min(retryCount.current, RETRY_DELAYS_MS.length - 1)]
            retryCount.current += 1
            retryTimer.current = setTimeout(() => saveNow(), delay)
            setState((s) => ({ ...s, status: 'error', error: `${err.message} Retrying in ${delay / 1000}s.` }))
          } else {
            setState((s) => ({ ...s, status: 'error', error: err.message }))
          }
          throw err
        })
        .finally(() => {
          inFlight.current = null
          if (queued.current) {
            queued.current = false
            saveNow().catch(() => {})
          }
        })
      inFlight.current = request
      return request
    },
    [enabled, formId],
  )

  // Debounced auto-save.
  useEffect(() => {
    if (!enabled || !isDirty) return undefined
    setState((s) => (s.status === 'saving' || s.status === 'conflict' || s.status === 'locked' ? s : { ...s, status: 'dirty' }))
    const timer = setTimeout(() => saveNow().catch(() => {}), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [form, enabled, isDirty, saveNow])

  // Resume after reconnecting or signing in again.
  useEffect(() => {
    const resume = () => formRef.current !== savedRef.current && saveNow().catch(() => {})
    window.addEventListener('online', resume)
    return () => window.removeEventListener('online', resume)
  }, [saveNow])
  useEffect(() => {
    if (authReady && formRef.current !== savedRef.current) saveNow().catch(() => {})
  }, [authReady, saveNow])

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (formRef.current !== savedRef.current || inFlight.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // Flush pending changes when leaving the form within the app.
  useEffect(
    () => () => {
      clearTimeout(retryTimer.current)
      if (formRef.current !== savedRef.current) saveNow().catch(() => {})
    },
    [saveNow],
  )

  // After a successful submit the server holds this exact form; stop treating it as unsaved.
  const markSaved = useCallback((savedForm) => {
    savedRef.current = savedForm
    clearTimeout(retryTimer.current)
  }, [])

  return { revision, revisionRef, state, isDirty, saveNow, markSaved, inFlight }
}
