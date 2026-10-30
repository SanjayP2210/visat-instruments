// Transport for the owner-information API (Google Apps Script web app today; any
// HTTPS endpoint speaking the same {action, idToken, requestId, payload} protocol later).
// Requests use text/plain to avoid a CORS preflight, which Apps Script cannot answer.
import { ownerConfig } from '../config'

const RETRYABLE = new Set(['NETWORK', 'TIMEOUT', 'BUSY', 'SERVER_ERROR'])

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message)
    this.code = code
    this.details = details
  }

  get retryable() {
    return RETRYABLE.has(this.code)
  }
}

let getToken = () => null
let onUnauthenticated = () => {}

export function configureApiAuth(handlers) {
  getToken = handlers.getToken
  onUnauthenticated = handlers.onUnauthenticated
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function postOnce(body, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(ownerConfig.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      credentials: 'omit',
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok) throw new ApiError('NETWORK', `The server responded with an error (${res.status}).`)
    try {
      return await res.json()
    } catch {
      throw new ApiError('NETWORK', 'The server sent an unexpected response.')
    }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err.name === 'AbortError') throw new ApiError('TIMEOUT', 'The server took too long to respond.')
    throw new ApiError('NETWORK', 'Could not reach the server. Check your internet connection.')
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Calls an API action. Retries network/temporary failures with the same requestId;
 * the server treats a repeated requestId as the same request, so retries are safe.
 * Resolves only with data the server confirmed.
 */
export async function callApi(action, payload = {}, options = {}) {
  const { retries = 2, timeoutMs = 30000, requestId = crypto.randomUUID() } = options
  if (!ownerConfig.apiUrl) throw new ApiError('NOT_CONFIGURED', 'The owner information service is not set up yet.')
  const idToken = getToken()
  if (!idToken) {
    onUnauthenticated()
    throw new ApiError('UNAUTHENTICATED', 'Please sign in with Google.')
  }

  const body = JSON.stringify({ action, idToken, requestId, payload })
  for (let attempt = 0; ; attempt++) {
    try {
      const json = await postOnce(body, timeoutMs)
      if (json && json.ok) return json.data
      const error = (json && json.error) || {}
      throw new ApiError(error.code || 'SERVER_ERROR', error.message || 'Unexpected server error.', error.details)
    } catch (err) {
      if (err.code === 'UNAUTHENTICATED') onUnauthenticated()
      if (!err.retryable || attempt >= retries) throw err
      await wait(1000 * 2 ** attempt)
    }
  }
}
