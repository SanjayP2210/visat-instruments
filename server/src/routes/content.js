// Content, media and enquiry routes (authenticated) plus the public website routes.
import { Router } from 'express'
import { crudController, firstFile, respond, uploaded } from '../controllers/contentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/common.js'
import { createRateLimiter } from '../middleware/rateLimit.js'
import { imageUpload } from '../middleware/upload.js'
import { ROLES } from '../models/User.js'
import { idParams } from '../validators/common.js'
import * as v from '../validators/content.js'

const STAFF = [ROLES.ADMIN, ROLES.EDITOR]

export function createContentRouter(config, { content, site, media }) {
  const router = Router()
  const auth = requireAuth(config)
  const staff = [auth, requireRole(...STAFF)]
  const adminOnly = [auth, requireRole(ROLES.ADMIN)]
  const oneImage = (field = 'image') => imageUpload(config, media, { field, maxFiles: 1 })
  const id = validate({ params: idParams })

  /** Mounts the standard CRUD routes for a resource. */
  function crud(path, service, schemas, { writers = staff, deleters = staff } = {}) {
    const c = crudController(service)
    router.get(path, ...staff, validate({ query: schemas.list }), c.list)
    router.post(path, ...writers, validate({ body: schemas.create }), c.create)
    router.get(`${path}/:id`, ...staff, id, c.get)
    router.patch(`${path}/:id`, ...writers, validate({ params: idParams, body: schemas.update }), c.update)
    router.delete(`${path}/:id`, ...deleters, id, c.remove)
  }

  /* ---------- public website (no sign-in) ---------- */
  router.get('/public/site', async (_req, res) => {
    // Browsers always re-check (edits and published/unpublished reviews show up straight away);
    // the CDN (Vercel honours CDN-Cache-Control) may cache for up to 60 seconds.
    res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    res.set('CDN-Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    res.json({ success: true, data: await site.publicSite() })
  })
  router.post(
    '/public/enquiries',
    createRateLimiter('enquiry', { windowMs: config.rateLimit.windowMs, limit: config.rateLimit.enquiryMax }),
    validate({ body: v.publicEnquiry }),
    respond((req) => site.submitEnquiry(req.valid.body, { source: 'website' }), 201),
  )

  router.post(
    '/public/reviews',
    createRateLimiter('review', { windowMs: config.rateLimit.windowMs, limit: config.rateLimit.reviewMax }),
    validate({ body: v.publicReview }),
    respond((req) => site.submitReview(req.valid.body), 201),
  )

  /* ---------- admin dashboard ---------- */
  router.get('/dashboard', ...staff, respond(() => site.dashboard()))

  /* ---------- business profile ---------- */
  router.get('/business-profile', ...staff, respond(() => site.businessProfile.get()))
  router.patch('/business-profile', ...staff, validate({ body: v.businessProfileUpdate }), respond((req) => site.businessProfile.update(req.valid.body, req.auth.user), 200, { action: 'business_profile.update', entity: 'business_profile' }))
  router.put(
    '/business-profile/owners/:ownerId/photo',
    ...staff,
    oneImage(),
    validate({ params: v.ownerParams, body: v.imageUploadFields }),
    respond((req) => site.businessProfile.setOwnerPhoto(req.valid.params.ownerId, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'business_profile.owner_photo_update', entity: 'business_profile' }),
  )
  router.delete('/business-profile/owners/:ownerId/photo', ...staff, validate({ params: v.ownerParams }), respond((req) => site.businessProfile.removeOwnerPhoto(req.valid.params.ownerId, req.auth.user), 200, { action: 'business_profile.owner_photo_remove', entity: 'business_profile' }))

  /* ---------- brands (Admin only: relationship claims are sensitive) ---------- */
  crud('/brands', content.brands, { list: v.brandList, create: v.brandCreate, update: v.brandUpdate }, { writers: adminOnly, deleters: adminOnly })
  router.put('/brands/:id/logo', ...adminOnly, oneImage(), validate({ params: idParams, body: v.imageUploadFields }), respond((req) => content.brandLogo.replace(req.valid.params.id, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'brand.logo_update', entity: 'brand' }))
  router.delete('/brands/:id/logo', ...adminOnly, id, respond((req) => content.brandLogo.remove(req.valid.params.id, req.auth.user), 200, { action: 'brand.logo_remove', entity: 'brand' }))

  /* ---------- categories ---------- */
  crud('/categories', content.categories, { list: v.categoryList, create: v.categoryCreate, update: v.categoryUpdate }, { deleters: adminOnly })

  /* ---------- products and their images ---------- */
  crud('/products', content.products, { list: v.productList, create: v.productCreate, update: v.productUpdate })
  router.post(
    '/products/:id/images',
    ...staff,
    imageUpload(config, media, { field: 'images', maxFiles: 12 }),
    validate({ params: idParams, body: v.imageUploadFields }),
    respond((req) => content.productImages.add(req.valid.params.id, uploaded(req), req.valid.body, req.auth.user), 201, { action: 'product.image_add', entity: 'product' }),
  )
  router.put('/products/:id/images/order', ...staff, validate({ params: idParams, body: v.imageOrder }), respond((req) => content.productImages.reorder(req.valid.params.id, req.valid.body.order, req.auth.user), 200, { action: 'product.image_reorder', entity: 'product' }))
  router.patch('/products/:id/images/:imageId', ...staff, validate({ params: v.imageParams, body: v.productImageUpdate }), respond((req) => content.productImages.update(req.valid.params.id, req.valid.params.imageId, req.valid.body, req.auth.user), 200, { action: 'product.image_update', entity: 'product' }))
  router.put(
    '/products/:id/images/:imageId',
    ...staff,
    oneImage(),
    validate({ params: v.imageParams, body: v.imageUploadFields }),
    respond((req) => content.productImages.replace(req.valid.params.id, req.valid.params.imageId, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'product.image_replace', entity: 'product' }),
  )
  router.delete('/products/:id/images/:imageId', ...staff, validate({ params: v.imageParams }), respond((req) => content.productImages.remove(req.valid.params.id, req.valid.params.imageId, req.auth.user), 200, { action: 'product.image_remove', entity: 'product' }))

  /* ---------- services ---------- */
  crud('/services', content.services, { list: v.serviceList, create: v.serviceCreate, update: v.serviceUpdate })
  router.put('/services/:id/image', ...staff, oneImage(), validate({ params: idParams, body: v.imageUploadFields }), respond((req) => content.serviceImage.replace(req.valid.params.id, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'service.image_update', entity: 'service' }))
  router.delete('/services/:id/image', ...staff, id, respond((req) => content.serviceImage.remove(req.valid.params.id, req.auth.user), 200, { action: 'service.image_remove', entity: 'service' }))

  /* ---------- gallery (items are created together with their image) ---------- */
  const galleryCrud = crudController(content.gallery)
  router.get('/gallery', ...staff, validate({ query: v.galleryList }), galleryCrud.list)
  router.post('/gallery', ...staff, oneImage(), validate({ body: v.galleryCreate }), respond((req) => content.createGalleryItem(req.valid.body, firstFile(req), req.auth.user), 201))
  router.get('/gallery/:id', ...staff, id, galleryCrud.get)
  router.patch('/gallery/:id', ...staff, validate({ params: idParams, body: v.galleryUpdate }), respond(async (req) => {
    const { alt, ...fields } = req.valid.body
    const item = await content.gallery.update(req.valid.params.id, fields, req.auth.user)
    if (alt !== undefined) {
      item.image.alt = alt
      await item.save()
    }
    return item
  }))
  router.put('/gallery/:id/image', ...staff, oneImage(), validate({ params: idParams, body: v.imageUploadFields }), respond((req) => content.galleryImage.replace(req.valid.params.id, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'gallery.image_replace', entity: 'gallery' }))
  router.delete('/gallery/:id', ...staff, id, galleryCrud.remove)

  /* ---------- testimonials ---------- */
  crud('/testimonials', content.testimonials, { list: v.testimonialList, create: v.testimonialCreate, update: v.testimonialUpdate })

  /* ---------- website content sections ---------- */
  router.get('/content', ...staff, respond(() => site.content.list()))
  router.get('/content/:key', ...staff, validate({ params: v.contentKeyParams }), respond((req) => site.content.get(req.valid.params.key)))
  router.put('/content/:key', ...staff, validate({ params: v.contentKeyParams, body: v.contentUpdate }), respond((req) => site.content.upsert(req.valid.params.key, req.valid.body, req.auth.user), 200, { action: 'content.update', entity: 'content' }))

  /* ---------- SEO per page ---------- */
  router.get('/seo', ...staff, respond(() => site.seo.list()))
  router.get('/seo/:page', ...staff, validate({ params: v.seoPageParams }), respond((req) => site.seo.get(req.valid.params.page)))
  router.put('/seo/:page', ...staff, validate({ params: v.seoPageParams, body: v.seoUpdate }), respond((req) => site.seo.upsert(req.valid.params.page, req.valid.body, req.auth.user), 200, { action: 'seo.update', entity: 'seo' }))
  router.put('/seo/:page/image', ...staff, oneImage(), validate({ params: v.seoPageParams, body: v.imageUploadFields }), respond((req) => site.seo.setImage(req.valid.params.page, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'seo.image_update', entity: 'seo' }))
  router.delete('/seo/:page/image', ...staff, validate({ params: v.seoPageParams }), respond((req) => site.seo.removeImage(req.valid.params.page, req.auth.user), 200, { action: 'seo.image_remove', entity: 'seo' }))

  /* ---------- branding & media library ---------- */
  const assetCrud = crudController(content.assets)
  router.get('/media/assets', ...staff, validate({ query: v.assetList }), assetCrud.list)
  router.post('/media/assets', ...staff, oneImage(), validate({ body: v.assetCreate }), respond((req) => content.createAsset(req.valid.body, firstFile(req), req.auth.user), 201))
  router.get('/media/assets/:id', ...staff, id, assetCrud.get)
  router.patch('/media/assets/:id', ...staff, validate({ params: idParams, body: v.assetUpdate }), respond((req) => content.updateAsset(req.valid.params.id, req.valid.body, req.auth.user), 200, { action: 'branding.update', entity: 'branding' }))
  router.put('/media/assets/:id/image', ...staff, oneImage(), validate({ params: idParams, body: v.imageUploadFields }), respond((req) => content.replaceAssetImage(req.valid.params.id, firstFile(req), req.valid.body, req.auth.user), 200, { action: 'branding.image_replace', entity: 'branding' }))
  router.delete('/media/assets/:id', ...staff, id, assetCrud.remove)
  router.get('/media/status', ...staff, (_req, res) => res.json({ success: true, data: { configured: media.configured, maxBytes: config.media.maxBytes, types: ['image/jpeg', 'image/png', 'image/webp'] } }))
  router.post('/media/cleanup', ...adminOnly, respond(() => media.retryCleanup(), 200, { action: 'media.cleanup', entity: 'media' }))

  /* ---------- customer enquiries ---------- */
  router.get('/enquiries', ...staff, validate({ query: v.enquiryList }), crudController(content.enquiries).list)
  router.get('/enquiries/:id', ...staff, id, crudController(content.enquiries).get)
  router.patch('/enquiries/:id', ...staff, validate({ params: idParams, body: v.enquiryUpdate }), respond((req) => content.updateEnquiry(req.valid.params.id, req.valid.body, req.auth.user), 200, { action: 'enquiry.update', entity: 'enquiry' }))
  router.delete('/enquiries/:id', ...adminOnly, id, crudController(content.enquiries).remove)

  return router
}
