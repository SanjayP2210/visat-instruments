import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { hashPassword, isStrongPassword, verifyPassword } from '../../src/services/passwordService.js'
import { csrfTokenFor, isValidCsrfToken, signSessionToken, verifySessionToken } from '../../src/services/tokenService.js'

const SECRET = 'unit-test-secret-0123456789-abcdefghijk'
const inOneHour = () => new Date(Date.now() + 3600_000)

describe('session tokens', () => {
  it('round-trips the user and session IDs', () => {
    const token = signSessionToken({ userId: 'u1', sessionId: 's1', expiresAt: inOneHour() }, SECRET)
    expect(verifySessionToken(token, SECRET)).toEqual({ userId: 'u1', sessionId: 's1' })
  })

  it('rejects a token signed with another secret', () => {
    const token = signSessionToken({ userId: 'u1', sessionId: 's1', expiresAt: inOneHour() }, 'another-secret-0123456789-abcdefghijk')
    expect(verifySessionToken(token, SECRET)).toBeNull()
  })

  it('rejects a tampered token', () => {
    const token = signSessionToken({ userId: 'u1', sessionId: 's1', expiresAt: inOneHour() }, SECRET)
    const [h, , s] = token.split('.')
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', jti: 's1', iss: 'visat-instruments-api', aud: 'visat-instruments-admin' })).toString('base64url')
    expect(verifySessionToken(`${h}.${forged}.${s}`, SECRET)).toBeNull()
  })

  it('rejects an unsigned ("alg: none") token', () => {
    const none = jwt.sign({ jti: 's1' }, null, { algorithm: 'none', subject: 'u1', issuer: 'visat-instruments-api', audience: 'visat-instruments-admin' })
    expect(verifySessionToken(none, SECRET)).toBeNull()
  })

  it('rejects an expired token', () => {
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, SECRET, { subject: 'u1', jwtid: 's1', issuer: 'visat-instruments-api', audience: 'visat-instruments-admin' })
    expect(verifySessionToken(expired, SECRET)).toBeNull()
  })

  it('rejects a token for another audience', () => {
    const other = jwt.sign({}, SECRET, { subject: 'u1', jwtid: 's1', issuer: 'visat-instruments-api', audience: 'someone-else', expiresIn: 60 })
    expect(verifySessionToken(other, SECRET)).toBeNull()
  })
})

describe('CSRF tokens', () => {
  it('accepts the token for its own session only', () => {
    const token = csrfTokenFor('session-a', SECRET)
    expect(isValidCsrfToken(token, 'session-a', SECRET)).toBe(true)
    expect(isValidCsrfToken(token, 'session-b', SECRET)).toBe(false)
  })

  it.each([undefined, '', 'abc', 123])('rejects a missing or malformed token (%s)', (token) => {
    expect(isValidCsrfToken(token, 'session-a', SECRET)).toBe(false)
  })
})

describe('passwords', () => {
  it.each([
    ['Password123', true],
    ['abcdefghij1', true],
    ['short1', false],
    ['onlyletterslong', false],
    ['1234567890', false],
    ['a1'.repeat(70), false],
  ])('policy check for %s → %s', (pw, ok) => {
    expect(isStrongPassword(pw)).toBe(ok)
  })

  it('hashes with bcrypt and verifies', async () => {
    const hash = await hashPassword('Password123', 4)
    expect(hash).toMatch(/^\$2[aby]\$04\$/)
    expect(hash).not.toContain('Password123')
    expect(await verifyPassword('Password123', hash)).toBe(true)
    expect(await verifyPassword('password123', hash)).toBe(false)
  })
})
