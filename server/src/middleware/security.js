import cors from 'cors'
import { errors } from '../utils/http.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
export const isSafeMethod = (method) => SAFE_METHODS.has(method)

const ownOrigin = (req) => `${req.protocol}://${req.get('host')}`

function isAllowedOrigin(origin, req, config) {
  return origin === ownOrigin(req) || config.http.allowedOrigins.includes(origin)
}

/** CORS for the allowed origins only (same-origin requests do not need it). */
export function corsMiddleware(config) {
  return cors({
    origin: (origin, done) => done(null, !origin || config.http.allowedOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    maxAge: 600,
  })
}

/**
 * CSRF layer 1: state-changing requests from a browser must come from our own origin or an
 * allowed one. (Layer 2, the per-session X-CSRF-Token, is checked in requireAuth.)
 * Requests without Origin/Sec-Fetch-Site headers come from non-browser clients, which cannot
 * be used for CSRF and are still subject to authentication.
 */
export function originCheck(config) {
  return (req, _res, next) => {
    if (isSafeMethod(req.method)) return next()
    const origin = req.get('origin')
    if (origin) return isAllowedOrigin(origin, req, config) ? next() : next(errors.csrf())
    const site = req.get('sec-fetch-site')
    if (site && site !== 'same-origin' && site !== 'none') return next(errors.csrf())
    return next()
  }
}
