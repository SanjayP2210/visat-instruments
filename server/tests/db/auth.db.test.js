// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
import { describe, expect, it } from 'vitest'
import { Session, User } from '../../src/models/index.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, request, signIn, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig()
const app = createApp(config)

describe.skipIf(!hasTestDatabase)(dbSuite('authentication (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)

  it('logs in, sets a secure session cookie and returns the user without secrets', async () => {
    await createUserRecord(config, { email: 'editor@example.com', name: 'Editor One' })
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'Editor@Example.com', password: 'Password123' })
    expect(res.status).toBe(200)
    const cookie = res.headers['set-cookie'].join(';')
    expect(cookie).toMatch(/vi_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    expect(res.body.data.user).toMatchObject({ email: 'editor@example.com', role: 'editor' })
    expect(res.body.data.user.passwordHash).toBeUndefined()
    expect(res.body.data.user.failedLoginCount).toBeUndefined()
    expect(typeof res.body.data.csrfToken).toBe('string')
    expect(await Session.countDocuments()).toBe(1)
  })

  it('gives the same answer for a wrong password and an unknown email', async () => {
    const wrong = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'editor@example.com', password: 'Wrong12345' })
    const unknown = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'nobody@example.com', password: 'Wrong12345' })
    expect(wrong.status).toBe(401)
    expect(unknown.status).toBe(401)
    expect(wrong.body).toEqual(unknown.body)
  })

  it('refuses deactivated users', async () => {
    await createUserRecord(config, { email: 'inactive@example.com', active: false })
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'inactive@example.com', password: 'Password123' })
    expect(res.status).toBe(401)
  })

  it('validates the login body', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'not-an-email', role: 'admin' })
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('VALIDATION_FAILED')
    expect(res.body.error.details.length).toBeGreaterThan(0)
  })

  it('returns the current user and CSRF token from /me; 401 without a session', async () => {
    const { agent, csrf } = await signIn(app, 'editor@example.com')
    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.data.user.email).toBe('editor@example.com')
    expect(me.body.data.csrfToken).toBe(csrf)
    expect((await request(app).get('/api/auth/me')).status).toBe(401)
  })

  it('rejects a forged or tampered session cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'vi_session=eyJhbGciOiJIUzI1NiJ9.e30.invalid')
    expect(res.status).toBe(401)
  })

  it('requires the CSRF token to log out, then fully revokes the session', async () => {
    const { agent, csrf, cookie } = await signIn(app, 'editor@example.com')
    const noToken = await agent.post('/api/auth/logout').set('Origin', ORIGIN)
    expect(noToken.status).toBe(403)
    expect(noToken.body.error.code).toBe('CSRF_FAILED')
    const wrongToken = await agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', 'nope')
    expect(wrongToken.status).toBe(403)

    const out = await agent.post('/api/auth/logout').set('Origin', ORIGIN).set('X-CSRF-Token', csrf)
    expect(out.status).toBe(200)
    // The old cookie value no longer works even if someone kept a copy.
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie)
    expect(replay.status).toBe(401)
  })

  it('locks the account after repeated failures, even for the right password', async () => {
    await createUserRecord(config, { email: 'lock@example.com' })
    for (let i = 0; i < config.auth.loginMaxAttempts; i++) {
      const r = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'lock@example.com', password: 'Wrong12345' })
      expect(r.status).toBe(401)
    }
    const locked = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'lock@example.com', password: 'Password123' })
    expect(locked.status).toBe(423)
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED')
    const stored = await User.findOne({ email: 'lock@example.com' }).select('+lockUntil')
    expect(stored.lockUntil.getTime()).toBeGreaterThan(Date.now())
  })

  it('changes the password, keeps this session and signs out other sessions', async () => {
    await createUserRecord(config, { email: 'pw@example.com' })
    const first = await signIn(app, 'pw@example.com')
    const second = await signIn(app, 'pw@example.com')

    const wrongCurrent = await first.agent.patch('/api/auth/password').set('Origin', ORIGIN).set('X-CSRF-Token', first.csrf).send({ currentPassword: 'Nope12345678', newPassword: 'NewPassword456' })
    expect(wrongCurrent.status).toBe(422)
    const weak = await first.agent.patch('/api/auth/password').set('Origin', ORIGIN).set('X-CSRF-Token', first.csrf).send({ currentPassword: 'Password123', newPassword: 'weak' })
    expect(weak.status).toBe(422)

    const ok = await first.agent.patch('/api/auth/password').set('Origin', ORIGIN).set('X-CSRF-Token', first.csrf).send({ currentPassword: 'Password123', newPassword: 'NewPassword456' })
    expect(ok.status).toBe(200)
    expect((await first.agent.get('/api/auth/me')).status).toBe(200)
    expect((await second.agent.get('/api/auth/me')).status).toBe(401)

    const oldLogin = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'pw@example.com', password: 'Password123' })
    expect(oldLogin.status).toBe(401)
    await signIn(app, 'pw@example.com', 'NewPassword456')
  })

  it('stores passwords only as bcrypt hashes', async () => {
    const stored = await User.findOne({ email: 'editor@example.com' }).select('+passwordHash')
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/)
  })
})
