// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
import { beforeAll, describe, expect, it } from 'vitest'
import { AdminActivityLog, PageView, SystemLog, VisitorEvent, VisitorSession } from '../../src/models/index.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, request, signIn, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig()
const app = createApp(config)
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
const SID = 'test-session-0123456789'

describe.skipIf(!hasTestDatabase)(dbSuite('analytics and logs (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)
  let admin
  let editor

  beforeAll(async () => {
    await createUserRecord(config, { email: 'admin@example.com', name: 'Alice Admin', role: 'admin' })
    await createUserRecord(config, { email: 'editor@example.com', name: 'Eddie Editor', role: 'editor' })
    admin = await signIn(app, 'admin@example.com')
    editor = await signIn(app, 'editor@example.com')
  })

  const track = (body, ua = UA) => request(app).post('/api/public/track').set('Origin', ORIGIN).set('User-Agent', ua).set('X-Vercel-IP-Country', 'IN').send(body)

  it('stores a consented tracking batch without personal data', async () => {
    const res = await track({
      sid: SID,
      session: { landing: '/?utm_source=x', referrer: 'https://www.google.com/search?q=x', lang: 'en' },
      events: [
        { type: 'page_view', path: '/products/test-scale?ref=1' },
        { type: 'whatsapp_click', path: '/products/test-scale', label: 'floating' },
        { type: 'page_view', path: '/admin/users' },
      ],
    })
    expect(res.status).toBe(204)

    const session = await VisitorSession.findById(SID).lean()
    expect(session).toMatchObject({ source: 'google.com', medium: 'referral', device: 'mobile', browser: 'Chrome', country: 'IN', pageViews: 1, events: 1, landingPath: '/' })
    expect(session.visitor).toMatch(/^[a-f0-9]{20}$/)
    expect(JSON.stringify(session)).not.toMatch(/127\.0\.0\.1|Mozilla/)

    const views = await PageView.find({ session: SID }).lean()
    expect(views.map((v) => [v.path, v.product])).toEqual([['/products/test-scale', 'test-scale']])
    expect(await VisitorEvent.countDocuments({ session: SID, type: 'whatsapp_click' })).toBe(1)
  })

  it('ignores bots and rejects malformed batches', async () => {
    expect((await track({ sid: 'bot-session-0123456789', events: [{ type: 'page_view', path: '/' }] }, 'Googlebot/2.1')).status).toBe(204)
    expect(await VisitorSession.exists({ _id: 'bot-session-0123456789' })).toBeNull()
    expect((await track({ sid: SID, events: [{ type: 'page_view', path: '/', email: 'a@b.c' }] })).status).toBe(422)
  })

  it('restricts every report and log to Admins', async () => {
    const urls = ['/api/analytics/overview', '/api/analytics/audience', '/api/analytics/events', '/api/logs/system', '/api/logs/admin-activity']
    for (const url of urls) {
      expect((await request(app).get(url)).status).toBe(401)
      expect((await editor.agent.get(url)).status).toBe(403)
      expect((await admin.agent.get(url)).status).toBe(200)
    }
  })

  it('reports totals for the date range', async () => {
    const res = await admin.agent.get('/api/analytics/overview')
    expect(res.body.data.totals).toMatchObject({ sessions: 1, visitors: 1, pageViews: 1, whatsappClicks: 1 })
    expect(res.body.data.daily.length).toBeGreaterThanOrEqual(30)
    expect(res.body.data.topProducts[0]).toMatchObject({ slug: 'test-scale', count: 1 })
  })

  it('records admin activity with a safe change summary', async () => {
    expect(await AdminActivityLog.exists({ action: 'auth.login', 'actor.name': 'Alice Admin' })).toBeTruthy()

    const created = await admin.agent.post('/api/categories').set('Origin', ORIGIN).set('X-CSRF-Token', admin.csrf).send({ name: 'Load cells', slug: 'load-cells' })
    expect(created.status).toBe(201)
    const id = created.body.data.id
    await admin.agent.patch(`/api/categories/${id}`).set('Origin', ORIGIN).set('X-CSRF-Token', admin.csrf).send({ active: false })
    await admin.agent.delete(`/api/categories/${id}`).set('Origin', ORIGIN).set('X-CSRF-Token', admin.csrf)

    const logs = await AdminActivityLog.find({ 'entity.id': id }).sort({ ts: 1 }).lean()
    expect(logs.map((l) => l.action)).toEqual(['category.create', 'category.update', 'category.delete'])
    expect(logs[1].changes).toEqual([{ field: 'active', from: true, to: false }])

    const list = await admin.agent.get('/api/logs/admin-activity').query({ entityType: 'category' })
    expect(list.body.meta.total).toBe(3)
  })

  it('logs failed sign-ins and permission failures without the email address', async () => {
    await request(app).post('/api/auth/login').set('Origin', ORIGIN).send({ email: 'admin@example.com', password: 'WrongPassword1' })
    const failed = await SystemLog.findOne({ code: 'AUTH_LOGIN_FAILED' }).lean()
    expect(failed).toMatchObject({ level: 'warn', status: 401, route: '/api/auth/login' })
    expect(JSON.stringify(failed)).not.toContain('admin@example.com')
    expect(await SystemLog.exists({ code: 'FORBIDDEN', route: '/api/logs/system' })).toBeTruthy()
  })
})
