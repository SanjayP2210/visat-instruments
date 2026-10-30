// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
import { describe, expect, it } from 'vitest'
import { RateLimit } from '../../src/models/index.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, request, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig({ LOGIN_RATE_LIMIT_MAX: '3', LOGIN_MAX_ATTEMPTS: '100', ENQUIRY_RATE_LIMIT_MAX: '2', REVIEW_RATE_LIMIT_MAX: '1' })
const app = createApp(config)

describe.skipIf(!hasTestDatabase)(dbSuite('MongoDB-backed rate limiting (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)

  it('limits failed logins per client and stores counters in MongoDB', async () => {
    await createUserRecord(config, { email: 'rl@example.com' })
    const attempt = () => request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'rl@example.com', password: 'Wrong12345' })
    for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401)

    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
    expect(blocked.headers.ratelimit).toBeDefined()

    const counter = await RateLimit.findOne({ _id: /^login:/ })
    expect(counter.hits).toBeGreaterThanOrEqual(4)
    expect(counter.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('shares the count across separate app instances (like serverless functions)', async () => {
    const other = createApp(config)
    const res = await request(other).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'rl@example.com', password: 'Password123' })
    expect(res.status).toBe(429)
  })

  it('limits public enquiry submissions per client', async () => {
    const submit = () => request(app).post('/api/public/enquiries').set('Origin', ORIGIN).send({ name: 'Ravi Patel', phone: '9876543210', message: 'Please call me back.' })
    expect((await submit()).status).toBe(201)
    expect((await submit()).status).toBe(201)
    const blocked = await submit()
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('limits public review submissions per client', async () => {
    const submit = () => request(app).post('/api/public/reviews').set('Origin', ORIGIN).send({ name: 'Kiran Shah', rating: 4, serviceReceived: 'Sales', message: 'Helpful team and clear communication.', consent: true })
    expect((await submit()).status).toBe(201)
    const blocked = await submit()
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })
})
