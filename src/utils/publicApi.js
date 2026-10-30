// Minimal client for the public (no sign-in) API endpoints used by the website.
export class PublicApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  get fieldErrors() {
    return Object.fromEntries((Array.isArray(this.details) ? this.details : []).map((d) => [d.path, d.message]))
  }
}

async function call(method, path, body) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new PublicApiError(0, 'NETWORK', 'Could not reach the server. Please check your connection and try again.')
  }
  const json = await res.json().catch(() => null)
  if (res.ok && json?.success) return json.data
  const e = json?.error ?? {}
  throw new PublicApiError(res.status, e.code ?? 'SERVER_ERROR', e.message ?? 'Something went wrong. Please try again later.', e.details)
}

export const publicApi = {
  site: () => call('GET', '/public/site'),
  submitReview: (review) => call('POST', '/public/reviews', review),
}
