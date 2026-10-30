import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ISSUER = 'visat-instruments-api'
const AUDIENCE = 'visat-instruments-admin'

export const newSessionId = () => randomUUID()

/** Session JWT: identifies the session record only (sub = user ID, jti = session ID). */
export function signSessionToken({ userId, sessionId, expiresAt }, secret) {
  return jwt.sign({}, secret, {
    algorithm: 'HS256',
    subject: String(userId),
    jwtid: sessionId,
    issuer: ISSUER,
    audience: AUDIENCE,
    expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  })
}

/** Returns { userId, sessionId } or null if the token is invalid or expired. */
export function verifySessionToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE })
    if (!payload.sub || !payload.jti) return null
    return { userId: payload.sub, sessionId: payload.jti }
  } catch {
    return null
  }
}

/** CSRF token bound to a session: only someone who can read our responses can know it. */
export function csrfTokenFor(sessionId, secret) {
  return createHmac('sha256', secret).update(`csrf:${sessionId}`).digest('base64url')
}

export function isValidCsrfToken(token, sessionId, secret) {
  if (typeof token !== 'string' || !token) return false
  const expected = Buffer.from(csrfTokenFor(sessionId, secret))
  const given = Buffer.from(token)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
