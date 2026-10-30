// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
// Seed, public website API, enquiries, permissions and content business rules.
import { beforeAll, describe, expect, it } from 'vitest'
import { BusinessProfile, Category, Product, Service, SiteContent } from '../../src/models/index.js'
import { seedContent } from '../../src/services/seedService.js'
import { createFakeStorage } from '../fakeStorage.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, request, signIn, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig()
const app = createApp(config, { storage: createFakeStorage() })

describe.skipIf(!hasTestDatabase)(dbSuite('content APIs (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)
  let admin
  let editor
  const send = (who, method, url) => who.agent[method](url).set('Origin', ORIGIN).set('X-CSRF-Token', who.csrf)

  beforeAll(async () => {
    await seedContent()
    await createUserRecord(config, { email: 'admin@example.com', role: 'admin' })
    await createUserRecord(config, { email: 'editor@example.com', role: 'editor' })
    admin = await signIn(app, 'admin@example.com')
    editor = await signIn(app, 'editor@example.com')
  })

  /* ---------- seed ---------- */
  it('seeds the approved content', async () => {
    expect(await Category.countDocuments()).toBe(8)
    const products = await Product.find().lean()
    expect(products).toHaveLength(11)
    expect(products.filter((p) => p.images.length === 1)).toHaveLength(6)
    expect(products.filter((p) => p.images.length === 0).map((p) => p.slug).sort()).toEqual(['cup-ball-type-load-cell', 'it-kit', 'jumbo-display', 'printer', 'usb-keyboard'])
    expect(products.find((p) => p.slug === 'electronic-weighbridge').name).toBe('Fully Electronic Weighbridge')

    const services = await Service.find().sort({ sortOrder: 1 }).lean()
    expect(services.filter((s) => s.active).map((s) => s.title)).toEqual(['Sales', 'Service & Maintenance', 'Installation', 'Annual Maintenance Contract (AMC)'])
    expect(services.find((s) => s.slug === 'calibration')).toMatchObject({ active: false, status: 'to-be-confirmed' })

    const profile = await BusinessProfile.findOne({ key: 'main' }).populate('primaryBrand')
    expect(profile.contactNumbers.map((c) => [c.dialNumber, c.person, c.isPrimary, c.isWhatsApp])).toEqual([
      ['+919879992228', 'Mahesh Solanki', true, true],
      ['+919913813861', 'Manish Solanki', false, true],
    ])
    expect(profile.owners.map((o) => o.name)).toEqual(['Mahesh Solanki', 'Manish Solanki'])
    expect(profile.primaryBrand).toMatchObject({ name: 'MAGLON', relationship: 'unconfirmed', showRegisteredMark: true })

    const hidden = await SiteContent.find({ key: { $in: ['manufacturing', 'marketing-claims', 'taglines'] } }).lean()
    expect(hidden).toHaveLength(3)
    expect(hidden.every((s) => s.published === false)).toBe(true)
  })

  it('re-running the seed changes nothing (idempotent)', async () => {
    const summary = await seedContent()
    const created = Object.values(summary).reduce((n, s) => n + s.created + s.updated, 0)
    expect(created).toBe(0)
    expect(await Product.countDocuments()).toBe(11)
  })

  /* ---------- public website ---------- */
  it('serves only published content to the public, without sign-in', async () => {
    const res = await request(app).get('/api/public/site')
    expect(res.status).toBe(200)
    expect(res.headers['cache-control']).toMatch(/public/)
    const site = res.body.data
    expect(site.services.map((s) => s.title)).toEqual(['Sales', 'Service & Maintenance', 'Installation', 'Annual Maintenance Contract (AMC)'])
    expect(Object.keys(site.content).sort()).toEqual(['spare-parts', 'weighbridge'])
    expect(site.brands.map((b) => [b.name, b.displayName, b.relationship])).toEqual([['MAGLON', 'MAGLON®', 'unconfirmed']])
    expect(site.business.primaryContact.dialNumber).toBe('+919879992228')
    expect(site.products).toHaveLength(11)
    expect(site.products.find((p) => p.slug === 'printer').images).toEqual([])
    expect(Object.keys(site.seo)).toHaveLength(7)
    expect(JSON.stringify(site)).not.toMatch(/createdBy|updatedBy|passwordHash/)
  })

  it('hides inactive products, unpublished testimonials and unpublished sections', async () => {
    await Product.updateOne({ slug: 'usb-keyboard' }, { active: false })
    await send(admin, 'post', '/api/testimonials').send({ name: 'A Customer', message: 'Prompt installation support.' }).expect(201)
    const site = (await request(app).get('/api/public/site')).body.data
    expect(site.products.some((p) => p.slug === 'usb-keyboard')).toBe(false)
    expect(site.testimonials).toHaveLength(0)
    await Product.updateOne({ slug: 'usb-keyboard' }, { active: true })
  })

  /* ---------- public enquiries ---------- */
  it('accepts valid enquiries, including product- and service-specific ones', async () => {
    const general = await request(app).post('/api/public/enquiries').set('Origin', ORIGIN).send({ name: 'Ravi Patel', phone: '98765 43210', message: 'Please call me about a weighbridge.' })
    expect(general.status).toBe(201)
    const product = await request(app).post('/api/public/enquiries').set('Origin', ORIGIN).send({ name: 'Ravi Patel', phone: '9876543210', message: 'Price of the jumbo display?', type: 'product', product: 'jumbo-display' })
    expect(product.status).toBe(201)
    const service = await request(app).post('/api/public/enquiries').set('Origin', ORIGIN).send({ name: 'Ravi Patel', phone: '9876543210', message: 'AMC for our weighbridge.', type: 'service', service: 'amc' })
    expect(service.status).toBe(201)

    const list = await admin.agent.get('/api/enquiries').query({ type: 'product' })
    expect(list.body.data[0]).toMatchObject({ type: 'product', interest: 'Jumbo Display', status: 'new' })
    expect(list.body.data[0].product.slug).toBe('jumbo-display')
  })

  it.each([
    ['an unpublished service', { type: 'service', service: 'calibration' }, 422],
    ['an unknown product', { type: 'product', product: 'no-such-product' }, 422],
    ['an invalid phone number', { phone: '12345' }, 422],
    ['an unexpected field', { status: 'resolved' }, 422],
    ['a filled-in honeypot field', { website: 'http://spam.example' }, 400],
  ])('rejects an enquiry with %s', async (_n, extra, status) => {
    const res = await request(app).post('/api/public/enquiries').set('Origin', ORIGIN).send({ name: 'Ravi Patel', phone: '9876543210', message: 'Please share details.', ...extra })
    expect(res.status).toBe(status)
  })

  it('blocks enquiries posted from another website', async () => {
    const res = await request(app).post('/api/public/enquiries').set('Origin', 'https://evil.example').send({ name: 'Ravi Patel', phone: '9876543210', message: 'Please share details.' })
    expect(res.status).toBe(403)
  })

  it('lets staff update enquiry status; only Admins delete enquiries', async () => {
    const [first] = (await editor.agent.get('/api/enquiries').query({ status: 'new', sort: 'createdAt' })).body.data
    const updated = await send(editor, 'patch', `/api/enquiries/${first.id}`).send({ status: 'in-progress', notes: 'Called back.' })
    expect(updated.status).toBe(200)
    expect(updated.body.data).toMatchObject({ status: 'in-progress', notes: 'Called back.' })
    expect(updated.body.data.handledBy).toBe(editor.user.id)
    expect((await send(editor, 'delete', `/api/enquiries/${first.id}`)).status).toBe(403)
    expect((await send(admin, 'delete', `/api/enquiries/${first.id}`)).status).toBe(200)
  })

  /* ---------- permissions ---------- */
  it('requires sign-in for management APIs', async () => {
    for (const path of ['/api/products', '/api/categories', '/api/enquiries', '/api/business-profile', '/api/content', '/api/seo', '/api/media/assets']) {
      expect((await request(app).get(path)).status).toBe(401)
    }
  })

  it('lets Editors manage content but keeps brands and category deletion Admin-only', async () => {
    expect((await send(editor, 'post', '/api/brands').send({ name: 'Other', slug: 'other' })).status).toBe(403)
    const cat = await send(editor, 'post', '/api/categories').send({ name: 'Temporary', slug: 'temporary' })
    expect(cat.status).toBe(201)
    expect((await send(editor, 'delete', `/api/categories/${cat.body.data.id}`)).status).toBe(403)
    expect((await send(admin, 'delete', `/api/categories/${cat.body.data.id}`)).status).toBe(200)
  })

  /* ---------- products, categories ---------- */
  it('creates, filters, searches and updates products with validation', async () => {
    const category = await Category.findOne({ slug: 'load-cells' })
    const missingCategory = await send(editor, 'post', '/api/products').send({ name: 'Test Cell', slug: 'test-cell', category: '507f1f77bcf86cd799439011' })
    expect(missingCategory.status).toBe(422)

    const created = await send(editor, 'post', '/api/products').send({ name: 'Test Cell', slug: 'test-cell', category: String(category._id), kind: 'part', seo: { title: 'Test Cell' } })
    expect(created.status).toBe(201)
    expect(created.body.data.category).toMatchObject({ slug: 'load-cells' })
    expect((await send(editor, 'post', '/api/products').send({ name: 'Dupe', slug: 'test-cell', category: String(category._id) })).status).toBe(409)

    const parts = await editor.agent.get('/api/products').query({ kind: 'part', limit: 50 })
    expect(parts.body.data.map((p) => p.slug).sort()).toEqual(['cup-ball-type-load-cell', 'it-kit', 'jumbo-display', 'load-cell-junction-box', 'test-cell'])
    const search = await editor.agent.get('/api/products').query({ q: 'cup-ball' })
    expect(search.body.data.map((p) => p.slug)).toEqual(['cup-ball-type-load-cell'])
    const page = await editor.agent.get('/api/products').query({ limit: 5, page: 3 })
    expect(page.body.meta).toMatchObject({ page: 3, limit: 5, total: 12, totalPages: 3 })

    const updated = await send(editor, 'patch', `/api/products/${created.body.data.id}`).send({ specifications: [{ label: 'Capacity', value: 'On enquiry' }], featured: false })
    expect(updated.status).toBe(200)
    expect(updated.body.data.specifications).toHaveLength(1)
    expect((await send(editor, 'delete', `/api/products/${created.body.data.id}`)).status).toBe(200)
  })

  it('refuses to delete a category that still has products', async () => {
    const category = await Category.findOne({ slug: 'load-cells' })
    const res = await send(admin, 'delete', `/api/categories/${category._id}`)
    expect(res.status).toBe(409)
  })

  /* ---------- testimonials, content, SEO ---------- */
  it('publishes a testimonial only after consent is recorded', async () => {
    const t = await send(editor, 'post', '/api/testimonials').send({ name: 'B Customer', message: 'Good service support.', published: true })
    expect(t.status).toBe(422)
    const ok = await send(editor, 'post', '/api/testimonials').send({ name: 'B Customer', message: 'Good service support.', consentConfirmed: true, published: true })
    expect(ok.status).toBe(201)
    const site = (await request(app).get('/api/public/site')).body.data
    expect(site.testimonials.map((x) => x.name)).toEqual(['B Customer'])
  })

  it('keeps manufacturing hidden until explicitly published', async () => {
    const edit = await send(editor, 'put', '/api/content/manufacturing').send({ data: { title: 'Manufacturing capabilities', items: ['Junction Box'] } })
    expect(edit.status).toBe(200)
    expect(edit.body.data.published).toBe(false)
    expect((await request(app).get('/api/public/site')).body.data.content.manufacturing).toBeUndefined()
    expect((await send(editor, 'put', '/api/content/not-a-section').send({ published: true })).status).toBe(422)
  })

  it('updates page SEO within length limits', async () => {
    expect((await send(editor, 'put', '/api/seo/products').send({ title: 'x'.repeat(71) })).status).toBe(422)
    const ok = await send(editor, 'put', '/api/seo/products').send({ title: 'Weighbridge Products | VISAT INSTRUMENTS', keywords: ['weighbridge', 'load cell'] })
    expect(ok.status).toBe(200)
    expect(ok.body.data.keywords).toEqual(['weighbridge', 'load cell'])
  })

  /* ---------- business profile ---------- */
  it('validates contact numbers and keeps the primary configurable', async () => {
    const current = (await editor.agent.get('/api/business-profile')).body.data
    const numbers = current.contactNumbers.map(({ id, label, person, displayNumber, dialNumber, isWhatsApp }) => ({ id, label, person, displayNumber, dialNumber, isWhatsApp }))

    const duplicate = await send(editor, 'patch', '/api/business-profile').send({ contactNumbers: [{ ...numbers[0], isPrimary: true }, { ...numbers[0], id: undefined, isPrimary: false }] })
    expect(duplicate.status).toBe(422)
    const twoPrimary = await send(editor, 'patch', '/api/business-profile').send({ contactNumbers: numbers.map((n) => ({ ...n, isPrimary: true })) })
    expect(twoPrimary.status).toBe(422)

    const switched = await send(editor, 'patch', '/api/business-profile').send({ contactNumbers: [{ ...numbers[0], isPrimary: false }, { ...numbers[1], isPrimary: true }] })
    expect(switched.status).toBe(200)
    expect(switched.body.data.primaryContact.dialNumber).toBe('+919913813861')
    // restore the approved primary contact
    await send(editor, 'patch', '/api/business-profile').send({ contactNumbers: [{ ...numbers[0], isPrimary: true }, { ...numbers[1], isPrimary: false }] }).expect(200)
  })

  it('keeps owner photos when owner details are edited', async () => {
    const current = (await editor.agent.get('/api/business-profile')).body.data
    const owners = current.owners.map(({ id, name, role, intro }) => ({ id, name, role, intro: `${intro} ` }))
    const res = await send(editor, 'patch', '/api/business-profile').send({ owners })
    expect(res.status).toBe(200)
    expect(res.body.data.owners.map((o) => o.photo.url)).toEqual(current.owners.map((o) => o.photo.url))
    expect(res.body.data.owners.map((o) => o.phone.display)).toEqual(current.owners.map((o) => o.phone.display)) // not wiped
  })

  /* ---------- public customer reviews ---------- */
  const review = (extra = {}) => ({ name: 'Kiran Shah', rating: 5, serviceReceived: 'Installation', message: 'Weighbridge installed on time and working well.', consent: true, ...extra })

  it('accepts a public review as pending and unpublished, without sign-in', async () => {
    const res = await request(app).post('/api/public/reviews').set('Origin', ORIGIN).send(review())
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('pending')
    const stored = (await editor.agent.get('/api/testimonials').query({ status: 'pending' })).body.data
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ name: 'Kiran Shah', rating: 5, serviceReceived: 'Installation', source: 'website', consentConfirmed: true, published: false })
    const site = (await request(app).get('/api/public/site')).body.data
    expect(site.testimonials.some((t) => t.name === 'Kiran Shah')).toBe(false)
  })

  it.each([
    ['no consent', { consent: false }, 422],
    ['a missing rating', { rating: undefined }, 422],
    ['a rating above 5', { rating: 6 }, 422],
    ['a link in the review', { message: 'Great service, visit https://spam.example for more.' }, 422],
    ['a too-short review', { message: 'Good.' }, 422],
    ['an unexpected field', { published: true }, 422],
    ['a filled-in honeypot field', { website: 'http://spam.example' }, 400],
  ])('rejects a review with %s', async (_n, extra, status) => {
    const res = await request(app).post('/api/public/reviews').set('Origin', ORIGIN).send(review(extra))
    expect(res.status).toBe(status)
  })

  it('blocks reviews posted from another website', async () => {
    expect((await request(app).post('/api/public/reviews').set('Origin', 'https://evil.example').send(review())).status).toBe(403)
  })

  it('publishes a review only after approval; rejecting unpublishes it', async () => {
    const [pending] = (await editor.agent.get('/api/testimonials').query({ status: 'pending' })).body.data
    const url = `/api/testimonials/${pending.id}`
    const tooEarly = await send(editor, 'patch', url).send({ published: true })
    expect(tooEarly.status).toBe(422)

    const approved = await send(editor, 'patch', url).send({ status: 'approved', published: true })
    expect(approved.status).toBe(200)
    expect(approved.body.data).toMatchObject({ status: 'approved', published: true, moderatedBy: editor.user.id })
    let site = (await request(app).get('/api/public/site')).body.data
    expect(site.testimonials.find((t) => t.name === 'Kiran Shah')).toMatchObject({ rating: 5, serviceReceived: 'Installation' })

    const rejected = await send(editor, 'patch', url).send({ status: 'rejected' })
    expect(rejected.body.data).toMatchObject({ status: 'rejected', published: false })
    site = (await request(app).get('/api/public/site')).body.data
    expect(site.testimonials.some((t) => t.name === 'Kiran Shah')).toBe(false)

    expect((await send(editor, 'delete', url)).status).toBe(200)
  })

  /* ---------- admin dashboard and list extras ---------- */
  it('returns dashboard counts for staff only', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401)
    const res = await editor.agent.get('/api/dashboard')
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.data).sort()).toEqual(['categories', 'galleryImages', 'pendingEnquiries', 'pendingReviews', 'products', 'publishedReviews', 'services'])
    expect(res.body.data.categories).toBe(await Category.countDocuments())
    expect(res.body.data.products).toBe(await Product.countDocuments())
  })

  it('includes the product count in the category list', async () => {
    const res = await editor.agent.get('/api/categories').query({ limit: 50 })
    const bySlug = Object.fromEntries(res.body.data.map((c) => [c.slug, c.productCount]))
    expect(bySlug['printers-accessories']).toBe(2)
    expect(bySlug['load-cells']).toBe(1)
    expect(Object.values(bySlug).reduce((a, b) => a + b, 0)).toBe(await Product.countDocuments())
  })
})
