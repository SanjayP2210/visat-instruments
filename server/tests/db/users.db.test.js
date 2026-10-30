// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
import { beforeAll, describe, expect, it } from 'vitest'
import { User } from '../../src/models/index.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, request, signIn, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig()
const app = createApp(config)

describe.skipIf(!hasTestDatabase)(dbSuite('users and roles (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)
  let admin
  let editor

  beforeAll(async () => {
    await createUserRecord(config, { email: 'admin@example.com', name: 'Alice Admin', role: 'admin' })
    await createUserRecord(config, { email: 'editor@example.com', name: 'Eddie Editor', role: 'editor' })
    admin = await signIn(app, 'admin@example.com')
    editor = await signIn(app, 'editor@example.com')
  })

  const asAdmin = (method, url) => admin.agent[method](url).set('Origin', ORIGIN).set('X-CSRF-Token', admin.csrf)

  it('requires authentication', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401)
  })

  it('forbids Editors from managing users', async () => {
    expect((await editor.agent.get('/api/users')).status).toBe(403)
    const create = await editor.agent.post('/api/users').set('Origin', ORIGIN).set('X-CSRF-Token', editor.csrf).send({ name: 'X Y', email: 'x@example.com', password: 'Password123', role: 'admin' })
    expect(create.status).toBe(403)
  })

  it('requires the CSRF token for changes', async () => {
    const res = await admin.agent.post('/api/users').set('Origin', ORIGIN).send({ name: 'No Token', email: 'nt@example.com', password: 'Password123', role: 'editor' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('CSRF_FAILED')
  })

  it('creates users with validation and duplicate checks', async () => {
    const created = await asAdmin('post', '/api/users').send({ name: 'Nina New', email: 'Nina@Example.com', password: 'Password123', role: 'editor' })
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Nina New', email: 'nina@example.com', role: 'editor', active: true })
    expect(created.body.data.passwordHash).toBeUndefined()

    const duplicate = await asAdmin('post', '/api/users').send({ name: 'Nina Two', email: 'nina@example.com', password: 'Password123', role: 'editor' })
    expect(duplicate.status).toBe(409)
    const weak = await asAdmin('post', '/api/users').send({ name: 'Weak Pw', email: 'weak@example.com', password: 'short', role: 'editor' })
    expect(weak.status).toBe(422)
  })

  it('lists users with pagination, search, filters and sorting', async () => {
    const page = await admin.agent.get('/api/users').query({ limit: 2, page: 1, sort: 'name' })
    expect(page.status).toBe(200)
    expect(page.body.data).toHaveLength(2)
    expect(page.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 })
    expect(page.body.data.map((u) => u.name)).toEqual(['Alice Admin', 'Eddie Editor'])

    const search = await admin.agent.get('/api/users').query({ q: 'nina' })
    expect(search.body.data.map((u) => u.email)).toEqual(['nina@example.com'])

    const admins = await admin.agent.get('/api/users').query({ role: 'admin' })
    expect(admins.body.data.map((u) => u.email)).toEqual(['admin@example.com'])

    const desc = await admin.agent.get('/api/users').query({ sort: '-name' })
    expect(desc.body.data[0].name).toBe('Nina New')

    expect((await admin.agent.get('/api/users').query({ sort: 'passwordHash' })).status).toBe(422)
  })

  it('treats search text literally (no regex injection)', async () => {
    const res = await admin.agent.get('/api/users').query({ q: '.*' })
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(0)
  })

  it('gets one user; 404 for missing, 422 for malformed IDs', async () => {
    const nina = await User.findOne({ email: 'nina@example.com' })
    expect((await admin.agent.get(`/api/users/${nina.id}`)).body.data.email).toBe('nina@example.com')
    expect((await admin.agent.get('/api/users/507f1f77bcf86cd799439011')).status).toBe(404)
    expect((await admin.agent.get('/api/users/not-an-id')).status).toBe(422)
  })

  it('applies role changes immediately by revoking that user’s sessions', async () => {
    const nina = await signIn(app, 'nina@example.com')
    expect((await nina.agent.get('/api/auth/me')).status).toBe(200)
    const res = await asAdmin('patch', `/api/users/${nina.user.id}`).send({ role: 'admin' })
    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('admin')
    expect((await nina.agent.get('/api/auth/me')).status).toBe(401)
  })

  it('stops a deactivated user immediately', async () => {
    const ed = await signIn(app, 'editor@example.com')
    await asAdmin('patch', `/api/users/${ed.user.id}`).send({ active: false }).expect(200)
    expect((await ed.agent.get('/api/auth/me')).status).toBe(401)
    const login = await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'editor@example.com', password: 'Password123' })
    expect(login.status).toBe(401)
    await asAdmin('patch', `/api/users/${ed.user.id}`).send({ active: true }).expect(200)
  })

  it('does not let an Admin demote, deactivate or delete themselves', async () => {
    expect((await asAdmin('patch', `/api/users/${admin.user.id}`).send({ role: 'editor' })).status).toBe(409)
    expect((await asAdmin('patch', `/api/users/${admin.user.id}`).send({ active: false })).status).toBe(409)
    expect((await asAdmin('delete', `/api/users/${admin.user.id}`)).status).toBe(409)
  })

  it('rejects unknown fields such as passwordHash in updates', async () => {
    const nina = await User.findOne({ email: 'nina@example.com' })
    const res = await asAdmin('patch', `/api/users/${nina.id}`).send({ passwordHash: 'x' })
    expect(res.status).toBe(422)
  })

  it('resets a user’s password and signs them out everywhere', async () => {
    const ed = await signIn(app, 'editor@example.com')
    const res = await asAdmin('put', `/api/users/${ed.user.id}/password`).send({ password: 'ResetPass789' })
    expect(res.status).toBe(200)
    expect((await ed.agent.get('/api/auth/me')).status).toBe(401)
    await signIn(app, 'editor@example.com', 'ResetPass789')
  })

  it('deletes another user', async () => {
    const nina = await User.findOne({ email: 'nina@example.com' })
    expect((await asAdmin('delete', `/api/users/${nina.id}`)).status).toBe(200)
    expect((await admin.agent.get(`/api/users/${nina.id}`)).status).toBe(404)
  })
})
