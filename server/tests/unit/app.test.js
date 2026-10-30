// HTTP behaviour that does not need a database: health, security headers, response format,
// CSRF origin checks, body parsing and the "database not configured" response.
import { describe, expect, it } from 'vitest'
import { createApp, ORIGIN, request, testConfig } from '../helpers.js'

const app = createApp(testConfig({ MONGODB_URI_TEST: '' }))

describe('API without a database', () => {
  it('reports health with the database not configured', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ success: true, data: { status: 'ok', database: 'not-configured' } })
  })

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
    expect(res.headers['strict-transport-security']).toBeDefined()
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.headers['x-powered-by']).toBeUndefined()
  })

  it('returns 503 in the standard error format when the database is not configured', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@b.co', password: 'x' })
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ success: false, error: { code: 'DATABASE_NOT_CONFIGURED', message: 'The database is not configured yet.' } })
  })

  it('blocks state-changing requests from other origins (CSRF)', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: 'a@b.co', password: 'x' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_FAILED')
  })

  it('blocks cross-site browser requests without an Origin header', async () => {
    const res = await request(app).post('/api/auth/logout').set('Sec-Fetch-Site', 'cross-site')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_FAILED')
  })

  it('accepts the API’s own origin without configuration', async () => {
    const res = await request(app).post('/api/auth/login').set('Host', 'visat.example').set('Origin', 'http://visat.example').send({})
    expect(res.status).toBe(503) // passed the origin check, stopped at the database layer
  })

  it('answers CORS preflight only for allowed origins', async () => {
    const allowed = await request(app).options('/api/auth/login').set('Origin', ORIGIN).set('Access-Control-Request-Method', 'POST')
    expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN)
    expect(allowed.headers['access-control-allow-credentials']).toBe('true')
    const denied = await request(app).options('/api/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST')
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).set('Content-Type', 'application/json').send('{"email":')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it('rejects oversized bodies with 413', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'a@b.co', password: 'x'.repeat(200 * 1024) })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('returns JSON 404 for unknown non-API routes', async () => {
    const res = await request(app).get('/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'API route not found.' } })
  })
})
