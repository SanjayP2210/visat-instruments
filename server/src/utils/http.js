// Consistent API responses:
//   success → { success: true, data, meta? }
//   failure → { success: false, error: { code, message, details? } }

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const errors = {
  badRequest: (message = 'Invalid request.', details) => new ApiError(400, 'BAD_REQUEST', message, details),
  validation: (details) => new ApiError(422, 'VALIDATION_FAILED', 'Some fields are invalid.', details),
  unauthenticated: (message = 'Please sign in.') => new ApiError(401, 'UNAUTHENTICATED', message),
  forbidden: (message = 'You do not have permission to do this.') => new ApiError(403, 'FORBIDDEN', message),
  csrf: () => new ApiError(403, 'CSRF_FAILED', 'Security check failed. Reload the page and try again.'),
  notFound: (message = 'Not found.') => new ApiError(404, 'NOT_FOUND', message),
  conflict: (message, details) => new ApiError(409, 'CONFLICT', message, details),
  locked: (message) => new ApiError(423, 'ACCOUNT_LOCKED', message),
  tooManyRequests: () => new ApiError(429, 'RATE_LIMITED', 'Too many requests. Please wait and try again.'),
  unavailable: (code, message) => new ApiError(503, code, message),
}

export function sendData(res, data, { status = 200, meta } = {}) {
  const body = { success: true, data }
  if (meta) body.meta = meta
  return res.status(status).json(body)
}

export function sendError(res, status, code, message, details) {
  const error = { code, message }
  if (details !== undefined) error.details = details
  return res.status(status).json({ success: false, error })
}
