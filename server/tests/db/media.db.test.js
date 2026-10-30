// Requires MONGODB_URI_TEST (MongoDB Atlas test database). Skipped otherwise.
// Image upload, replacement, deletion, validation, rollback and cleanup, using an in-memory
// storage test double in place of Cloudinary (real Cloudinary: `npm run media:check`).
import { beforeAll, describe, expect, it } from 'vitest'
import { MediaCleanup, Product, SiteAsset } from '../../src/models/index.js'
import { seedContent } from '../../src/services/seedService.js'
import { createFakeStorage, TEST_PNG } from '../fakeStorage.js'
import { createApp, createUserRecord, dbSuite, hasTestDatabase, ORIGIN, signIn, testConfig, useTestDatabase } from '../helpers.js'

const config = testConfig({ UPLOAD_MAX_MB: '0.05' }) // ~51 KB limit for the size test
const storage = createFakeStorage()
const app = createApp(config, { storage })
const appWithoutStorage = createApp(config, { storage: null })

const png = (name = 'photo.png') => [TEST_PNG, { filename: name, contentType: 'image/png' }]

describe.skipIf(!hasTestDatabase)(dbSuite('image management (MongoDB Atlas test database)'), () => {
  useTestDatabase(config)
  let admin
  let product
  const send = (method, url, who = admin) => who.agent[method](url).set('Origin', ORIGIN).set('X-CSRF-Token', who.csrf)

  beforeAll(async () => {
    await seedContent()
    await createUserRecord(config, { email: 'admin@example.com', role: 'admin' })
    admin = await signIn(app, 'admin@example.com')
    product = await Product.findOne({ slug: 'printer' })
  })

  it('reports whether uploads are configured', async () => {
    expect((await admin.agent.get('/api/media/status')).body.data).toMatchObject({ configured: true, types: ['image/jpeg', 'image/png', 'image/webp'] })
    const off = await signIn(appWithoutStorage, 'admin@example.com')
    const res = await off.agent.post(`/api/products/${product.id}/images`).set('Origin', ORIGIN).set('X-CSRF-Token', off.csrf).attach('images', ...png())
    expect(res.status).toBe(503)
    expect(res.body.error.code).toBe('MEDIA_NOT_CONFIGURED')
  })

  it('uploads multiple product images and stores URL, public ID and metadata (not binaries)', async () => {
    const res = await send('post', `/api/products/${product.id}/images`).field('alt', 'Printer front').attach('images', ...png('a.png')).attach('images', ...png('b.png'))
    expect(res.status).toBe(201)
    expect(res.body.data.images).toHaveLength(2)
    for (const img of res.body.data.images) {
      expect(img).toMatchObject({ alt: 'Printer front', format: 'png', width: 1, height: 1 })
      expect(img.url).toMatch(/^https:\/\//)
      expect(storage.files.has(img.publicId)).toBe(true)
    }
    const stored = await Product.findById(product.id).lean()
    expect(JSON.stringify(stored)).not.toMatch(/iVBOR|data:image/) // no image data in MongoDB
  })

  it('rejects non-images, wrong types and oversized files without storing anything', async () => {
    const before = storage.files.size
    const fake = await send('post', `/api/products/${product.id}/images`).attach('images', Buffer.from('<svg onload=alert(1)></svg>'), { filename: 'x.png', contentType: 'image/png' })
    expect(fake.status).toBe(415)
    const pdf = await send('post', `/api/products/${product.id}/images`).attach('images', Buffer.from('%PDF-1.7'), { filename: 'x.pdf', contentType: 'application/pdf' })
    expect(pdf.status).toBe(415)
    const big = await send('post', `/api/products/${product.id}/images`).attach('images', Buffer.concat([TEST_PNG, Buffer.alloc(80 * 1024)]), { filename: 'big.png', contentType: 'image/png' })
    expect(big.status).toBe(413)
    expect(big.body.error.code).toBe('FILE_TOO_LARGE')
    const none = await send('post', `/api/products/${product.id}/images`).field('alt', 'nothing')
    expect(none.status).toBe(422)
    expect(storage.files.size).toBe(before)
  })

  it('requires the CSRF token for uploads', async () => {
    const res = await admin.agent.post(`/api/products/${product.id}/images`).set('Origin', ORIGIN).attach('images', ...png())
    expect(res.status).toBe(403)
  })

  it('updates alt text, reorders, replaces and deletes product images, cleaning up storage', async () => {
    const [first, second] = (await Product.findById(product.id)).images.map((i) => ({ id: String(i._id), publicId: i.publicId }))

    const alt = await send('patch', `/api/products/${product.id}/images/${first.id}`).send({ alt: 'Printer side view', fit: 'contain' })
    expect(alt.body.data.images[0]).toMatchObject({ alt: 'Printer side view', fit: 'contain' })

    const reordered = await send('put', `/api/products/${product.id}/images/order`).send({ order: [second.id, first.id] })
    expect(reordered.body.data.images.map((i) => i.id)).toEqual([second.id, first.id])
    expect((await send('put', `/api/products/${product.id}/images/order`).send({ order: [first.id] })).status).toBe(422)

    const replaced = await send('put', `/api/products/${product.id}/images/${first.id}`).attach('image', ...png('new.png'))
    expect(replaced.status).toBe(200)
    expect(storage.files.has(first.publicId)).toBe(false) // old file deleted
    const newImage = replaced.body.data.images.find((i) => i.id === first.id)
    expect(newImage.fit).toBe('contain') // display settings kept
    expect(storage.files.has(newImage.publicId)).toBe(true)

    const removed = await send('delete', `/api/products/${product.id}/images/${second.id}`)
    expect(removed.body.data.images).toHaveLength(1)
    expect(storage.files.has(second.publicId)).toBe(false)
  })

  it('limits a product to 12 images', async () => {
    let req = send('post', `/api/products/${product.id}/images`)
    for (let i = 0; i < 12; i++) req = req.attach('images', ...png(`${i}.png`))
    const res = await req
    expect(res.status).toBe(422)
  })

  it('deletes a product’s images from storage when the product is deleted', async () => {
    const doc = await Product.findById(product.id)
    const ids = doc.images.map((i) => i.publicId)
    expect((await send('delete', `/api/products/${product.id}`)).status).toBe(200)
    expect(ids.every((id) => !storage.files.has(id))).toBe(true)
  })

  it('rolls back the upload if saving fails, so no orphaned file remains', async () => {
    const before = storage.files.size
    storage.state.urlLength = 2000 // makes the stored URL fail model validation
    const res = await send('post', '/api/gallery').field('title', 'Site photo').attach('image', ...png())
    storage.state.urlLength = 0
    expect(res.status).toBe(422)
    expect(storage.files.size).toBe(before)
  })

  it('creates gallery items with their image and replaces the image', async () => {
    const created = await send('post', '/api/gallery').field('title', 'Weighbridge project').field('type', 'project').field('sortOrder', '3').attach('image', ...png())
    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ type: 'project', sortOrder: 3 })
    const oldId = created.body.data.image.publicId
    const replaced = await send('put', `/api/gallery/${created.body.data.id}/image`).attach('image', ...png())
    expect(replaced.status).toBe(200)
    expect(storage.files.has(oldId)).toBe(false)
    expect((await send('delete', `/api/gallery/${created.body.data.id}`)).status).toBe(200)
    expect(storage.files.has(replaced.body.data.image.publicId)).toBe(false)
  })

  it('keeps one image for single branding slots and many for banner slots', async () => {
    const first = await send('post', '/api/media/assets').field('slot', 'logo').field('alt', 'VISAT INSTRUMENTS logo').attach('image', ...png())
    const second = await send('post', '/api/media/assets').field('slot', 'logo').attach('image', ...png())
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(await SiteAsset.countDocuments({ slot: 'logo' })).toBe(1)
    expect(storage.files.has(first.body.data.image.publicId)).toBe(false)

    await send('post', '/api/media/assets').field('slot', 'home-banner').attach('image', ...png()).expect(201)
    await send('post', '/api/media/assets').field('slot', 'home-banner').attach('image', ...png()).expect(201)
    expect(await SiteAsset.countDocuments({ slot: 'home-banner' })).toBe(2)
    expect((await send('post', '/api/media/assets').field('slot', 'unknown-slot').attach('image', ...png())).status).toBe(422)

    const site = (await admin.agent.get('/api/public/site')).body.data
    expect(site.assets.logo).toHaveLength(1)
    expect(site.assets['home-banner']).toHaveLength(2)
  })

  it('handles service images, brand logos, owner photos and SEO images', async () => {
    const service = (await admin.agent.get('/api/services').query({ q: 'Sales' })).body.data[0]
    expect((await send('put', `/api/services/${service.id}/image`).attach('image', ...png())).status).toBe(200)
    expect((await send('delete', `/api/services/${service.id}/image`)).status).toBe(200)

    const brand = (await admin.agent.get('/api/brands')).body.data[0]
    expect((await send('put', `/api/brands/${brand.id}/logo`).attach('image', ...png())).status).toBe(200)

    const owner = (await admin.agent.get('/api/business-profile')).body.data.owners[0]
    const photo = await send('put', `/api/business-profile/owners/${owner.id}/photo`).attach('image', ...png())
    expect(photo.status).toBe(200)
    expect(photo.body.data.owners[0].photo.publicId).toMatch(/^test\/owners\//)

    const seo = await send('put', '/api/seo/home/image').attach('image', ...png())
    expect(seo.status).toBe(200)
    expect(seo.body.data.ogImage.publicId).toMatch(/^test\/seo\//)
  })

  it('queues failed deletions and retries them later', async () => {
    const asset = await send('post', '/api/media/assets').field('slot', 'about-image').attach('image', ...png())
    const publicId = asset.body.data.image.publicId
    expect((await send('delete', `/api/media/assets/${asset.body.data.id}`)).status).toBe(409) // active = in use
    await send('patch', `/api/media/assets/${asset.body.data.id}`).send({ active: false }).expect(200)
    storage.state.failDestroy = true
    expect((await send('delete', `/api/media/assets/${asset.body.data.id}`)).status).toBe(200)
    storage.state.failDestroy = false
    expect(await MediaCleanup.findOne({ publicId })).toBeTruthy()
    expect(storage.files.has(publicId)).toBe(true)

    const cleanup = await send('post', '/api/media/cleanup')
    expect(cleanup.status).toBe(200)
    expect(cleanup.body.data.deleted).toBeGreaterThanOrEqual(1)
    expect(storage.files.has(publicId)).toBe(false)
    expect(await MediaCleanup.countDocuments({ publicId })).toBe(0)
  })
})
