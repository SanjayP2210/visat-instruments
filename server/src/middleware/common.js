import { connectDatabase, DatabaseNotConfiguredError } from '../config/database.js'
import { logSystem } from '../services/logService.js'
import { ApiError, errors, sendError } from '../utils/http.js'

/** Validates and parses request parts with zod schemas; results go to req.valid. */
export function validate(schemas) {
  return (req, _res, next) => {
    req.valid = {}
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue
      const result = schemas[part].safeParse(req[part] ?? {})
      if (!result.success) {
        const details = result.error.issues.map((i) => ({
          path: i.path.join('.') || part,
          message: i.code === 'unrecognized_keys' ? `Unknown field(s): ${i.keys.join(', ')}` : i.message,
        }))
        return next(errors.validation(details))
      }
      req.valid[part] = result.data
    }
    next()
  }
}

/** Ensures the (cached) MongoDB connection before handling the request. */
export function ensureDatabase(config) {
  return async (req, _res, next) => {
    try {
      await connectDatabase(config.db)
    } catch (err) {
      if (err instanceof DatabaseNotConfiguredError) {
        throw errors.unavailable('DATABASE_NOT_CONFIGURED', 'The database is not configured yet.')
      }
      await logSystem({ level: 'critical', code: 'DATABASE_UNAVAILABLE', message: `Database connection failed: ${err.message}`, req, context: { error: err.name } })
      throw errors.unavailable('DATABASE_UNAVAILABLE', 'The database is temporarily unavailable. Please try again.')
    }
    next()
  }
}

export function notFound(_req, _res, next) {
  next(errors.notFound('API route not found.'))
}

// Client errors worth recording (security-relevant). 401s (expired sessions) and 404/422 are routine.
const LOGGED_CODES = new Set(['CSRF_FAILED', 'FORBIDDEN', 'RATE_LIMITED'])

export function errorHandler(config) {
  // eslint-disable-next-line no-unused-vars
  return async (err, req, res, _next) => {
    if (err instanceof ApiError) {
      if (LOGGED_CODES.has(err.code) || err.status >= 500) {
        await logSystem({ level: err.status >= 500 ? 'error' : 'warn', code: err.code, message: err.message, req, status: err.status })
      }
      return sendError(res, err.status, err.code, err.message, err.details)
    }
    if (err.type === 'entity.parse.failed') return sendError(res, 400, 'BAD_REQUEST', 'The request body is not valid JSON.')
    if (err.type === 'entity.too.large') return sendError(res, 413, 'PAYLOAD_TOO_LARGE', 'The request is too large.')
    if (err.name === 'ValidationError' && err.errors) {
      const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }))
      return sendError(res, 422, 'VALIDATION_FAILED', 'Some fields are invalid.', details)
    }
    if (err.name === 'CastError') return sendError(res, 400, 'BAD_REQUEST', 'Invalid identifier.')
    if (err.code === 11000) {
      const fields = Object.keys(err.keyPattern ?? {})
      return sendError(res, 409, 'CONFLICT', 'This value is already in use.', fields.map((path) => ({ path, message: 'Already in use.' })))
    }
    if (!config.isProduction) console.error(err)
    if (!err.logged) await logSystem({ level: 'error', code: 'SERVER_ERROR', message: err.message, req, status: 500, context: { error: err.name, code: typeof err.code === 'string' ? err.code : undefined } })
    return sendError(res, 500, 'SERVER_ERROR', 'Something went wrong on the server.')
  }
}
