// Central API client for the admin panel. Uses the HTTP-only session cookie set by the
// backend (never readable here) and sends the per-session CSRF token on every change.
const BASE = '/api'
const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  /** { fieldPath: message } for form field errors. */
  get fieldErrors() {
    return Object.fromEntries((Array.isArray(this.details) ? this.details : []).map((d) => [d.path, d.message]))
  }
}

let csrfToken = ''
let onUnauthenticated = () => {}

export const setCsrfToken = (token) => (csrfToken = token || '')
export const setUnauthenticatedHandler = (fn) => (onUnauthenticated = fn)

function toQuery(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

function toApiError(status, body) {
  const e = body?.error ?? {}
  if (status === 0) return new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection and try again.')
  return new ApiError(status, e.code || 'SERVER_ERROR', e.message || `Request failed (${status}).`, e.details)
}

async function refreshCsrf() {
  const res = await fetch(`${BASE}/auth/me`, { credentials: 'same-origin' })
  if (!res.ok) return false
  setCsrfToken((await res.json()).data.csrfToken)
  return true
}

/** JSON request. Resolves with `{ data, meta }` from the standard response format. */
export async function request(method, path, { body, params, retry = true } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (UNSAFE.has(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken

  let res
  try {
    res = await fetch(`${BASE}${path}${toQuery(params)}`, {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw toApiError(0)
  }
  const json = await res.json().catch(() => null)
  if (res.ok && json?.success) return { data: json.data, meta: json.meta }

  const error = toApiError(res.status, json)
  if (error.code === 'CSRF_FAILED' && retry && (await refreshCsrf())) return request(method, path, { body, params, retry: false })
  if (error.status === 401 && path !== '/auth/login') onUnauthenticated()
  throw error
}

/**
 * Multipart upload with progress (fetch cannot report upload progress, so XHR is used).
 * `files` go into `field`; `fields` are extra text fields.
 */
export function upload(method, path, { field = 'image', files, fields = {}, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && v !== '') form.append(k, String(v))
    for (const file of files) form.append(field, file)

    const xhr = new XMLHttpRequest()
    xhr.open(method, `${BASE}${path}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    xhr.onerror = () => reject(toApiError(0))
    xhr.onload = () => {
      let json = null
      try {
        json = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON response
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.success) return resolve({ data: json.data, meta: json.meta })
      const error = toApiError(xhr.status, json)
      if (error.status === 401) onUnauthenticated()
      reject(error)
    }
    xhr.send(form)
  })
}

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload,
}

/** Client-side image checks (the server re-validates content and size). */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export function checkImage(file, maxBytes = 5 * 1024 * 1024) {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name}: only JPG, PNG and WebP images are allowed.`
  if (file.size > maxBytes) return `${file.name}: images must be ${Math.round((maxBytes / 1024 / 1024) * 10) / 10} MB or smaller.`
  return ''
}
