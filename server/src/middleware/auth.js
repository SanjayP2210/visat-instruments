import { resolveSession } from '../services/authService.js'
import { isValidCsrfToken } from '../services/tokenService.js'
import { errors } from '../utils/http.js'
import { isSafeMethod } from './security.js'

// "__Host-" prefix (HTTPS only): the cookie cannot be set by subdomains or scoped to other paths.
export const sessionCookieName = (config) => (config.auth.cookieSecure ? '__Host-vi_session' : 'vi_session')

function cookieOptions(config) {
  return { httpOnly: true, secure: config.auth.cookieSecure, sameSite: 'strict', path: '/' }
}

export function setSessionCookie(res, token, expiresAt, config) {
  res.cookie(sessionCookieName(config), token, { ...cookieOptions(config), expires: expiresAt })
}

export function clearSessionCookie(res, config) {
  res.clearCookie(sessionCookieName(config), cookieOptions(config))
}

/**
 * Requires a live session. For state-changing methods also requires the session's
 * CSRF token in the X-CSRF-Token header (CSRF layer 2).
 */
export function requireAuth(config) {
  return async (req, res, next) => {
    const result = await resolveSession(req.cookies?.[sessionCookieName(config)], config)
    if (!result) {
      clearSessionCookie(res, config)
      throw errors.unauthenticated()
    }
    if (!isSafeMethod(req.method) && !isValidCsrfToken(req.get('x-csrf-token'), result.session._id, config.auth.csrfSecret)) {
      throw errors.csrf()
    }
    req.auth = result
    next()
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => (roles.includes(req.auth?.user?.role) ? next() : next(errors.forbidden()))
}
