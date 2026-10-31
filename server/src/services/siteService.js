// Business profile, website content sections, SEO settings, the public website bundle
// and public enquiries. Pure business logic: no Express, no Vercel.
import { Brand } from '../models/Brand.js'
import { BusinessProfile, SOCIAL_PLATFORMS } from '../models/BusinessProfile.js'
import { Category, GalleryItem, Product, Service } from '../models/catalog.js'
import { SiteAsset } from '../models/media.js'
import { Enquiry, SeoSetting, SiteContent, Testimonial } from '../models/site.js'
import { errors } from '../utils/http.js'
import { assertExists } from './crudService.js'

const INTERNAL_FIELDS = new Set(['createdBy', 'updatedBy', 'handledBy'])

/** Average star rating and count of the published website reviews that have a rating; null when there are none. */
export function reviewStats(reviews = []) {
  const ratings = reviews.map((r) => r.rating).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5)
  if (!ratings.length) return null
  const average = ratings.reduce((sum, n) => sum + n, 0) / ratings.length
  return { average: Math.round(average * 10) / 10, count: ratings.length }
}

/**
 * Website view of a product's pricing. "Request quote" (or a priced type without a selling
 * price) never exposes any amount; the discount is derived from the owner-entered prices only.
 */
export function publicPricing(pricing = {}) {
  const base = { gst: pricing.gst ?? 'not-specified', additionalCharges: pricing.additionalCharges ?? '', availability: pricing.availability ?? 'not-specified' }
  const selling = pricing.sellingPrice
  if (!pricing.type || pricing.type === 'request-quote' || selling == null) return { type: 'request-quote', ...base }
  const original = pricing.originalPrice != null && pricing.originalPrice > selling ? pricing.originalPrice : null
  return {
    type: pricing.type,
    sellingPrice: selling,
    originalPrice: original,
    discountAmount: original ? original - selling : 0,
    discountPercent: original ? Math.round(((original - selling) / original) * 100) : 0,
    ...base,
    gstRate: base.gst === 'not-specified' ? null : (pricing.gstRate ?? null),
  }
}

export function createSiteServices(media) {
  async function getProfile() {
    const profile = await BusinessProfile.findOne({ key: 'main' })
    if (!profile) throw errors.notFound('The business profile has not been set up yet. Run the content seed first.')
    return profile
  }

  return {
    /* ---------- business profile ---------- */
    businessProfile: {
      get: getProfile,

      async update(changes, actor) {
        const profile = await getProfile()
        await assertExists(Brand, changes.primaryBrand, 'primaryBrand', 'Brand')
        const removedPhotos = []

        if (changes.owners) {
          // Match owners by id and merge, so fields not sent (photo, phone, …) are kept;
          // owners that disappear lose their photo.
          const byId = new Map(profile.owners.map((o) => [String(o._id), o]))
          changes.owners = changes.owners.map(({ id, ...owner }) => {
            const existing = id && byId.get(id)
            if (id && !existing) throw errors.validation([{ path: 'owners', message: 'Unknown owner id.' }])
            if (existing) byId.delete(id)
            return existing ? { ...existing.toObject(), ...owner } : owner
          })
          for (const gone of byId.values()) if (gone.photo) removedPhotos.push(gone.photo)
        }
        if (changes.contactNumbers) {
          changes.contactNumbers = changes.contactNumbers.map(({ id, ...c }) => (id ? { _id: id, ...c } : c))
        }

        profile.set({ ...changes, updatedBy: actor._id })
        await profile.save()
        await media.removeMany(removedPhotos, 'owner removed')
        return profile
      },

      async setOwnerPhoto(ownerId, file, { alt }, actor) {
        const profile = await getProfile()
        const owner = profile.owners.id(ownerId)
        if (!owner) throw errors.notFound('Owner not found.')
        const previous = owner.photo?.toObject?.() ?? owner.photo
        const saved = await media.uploadThen([file], { folder: 'owners', alt: alt ?? `Portrait of ${owner.name}` }, async ([image]) => {
          owner.photo = image
          profile.updatedBy = actor._id
          return profile.save()
        })
        await media.remove(previous, 'owner photo replaced')
        return saved
      },

      async removeOwnerPhoto(ownerId, actor) {
        const profile = await getProfile()
        const owner = profile.owners.id(ownerId)
        if (!owner?.photo) throw errors.notFound('There is no photo to remove.')
        const previous = owner.photo.toObject()
        owner.photo = undefined
        profile.updatedBy = actor._id
        await profile.save()
        await media.remove(previous, 'owner photo removed')
        return profile
      },
    },

    /* ---------- website content sections ---------- */
    content: {
      list: () => SiteContent.find().sort({ key: 1 }),

      async get(key) {
        const section = await SiteContent.findOne({ key })
        if (!section) throw errors.notFound('This content section has not been set up yet.')
        return section
      },

      async upsert(key, { data, gu, published }, actor) {
        const section = (await SiteContent.findOne({ key })) ?? new SiteContent({ key })
        if (data !== undefined) section.data = data
        if (gu !== undefined) section.gu = gu
        if (published !== undefined) section.published = published
        section.updatedBy = actor._id
        section.markModified('data')
        section.markModified('gu')
        return section.save()
      },
    },

    /* ---------- SEO per page ---------- */
    seo: {
      list: () => SeoSetting.find().sort({ page: 1 }),

      async get(page) {
        const setting = await SeoSetting.findOne({ page })
        if (!setting) throw errors.notFound('SEO settings for this page have not been set up yet.')
        return setting
      },

      async upsert(page, changes, actor) {
        const setting = (await SeoSetting.findOne({ page })) ?? new SeoSetting({ page })
        setting.set({ ...changes, updatedBy: actor._id })
        return setting.save()
      },

      async setImage(page, file, { alt }, actor) {
        const setting = (await SeoSetting.findOne({ page })) ?? new SeoSetting({ page })
        const previous = setting.ogImage?.toObject?.() ?? setting.ogImage
        const saved = await media.uploadThen([file], { folder: 'seo', alt: alt ?? `${page} page` }, async ([image]) => {
          setting.ogImage = image
          setting.updatedBy = actor._id
          return setting.save()
        })
        await media.remove(previous, 'SEO image replaced')
        return saved
      },

      async removeImage(page, actor) {
        const setting = await SeoSetting.findOne({ page })
        if (!setting?.ogImage) throw errors.notFound('There is no image to remove.')
        const previous = setting.ogImage.toObject()
        setting.ogImage = undefined
        setting.updatedBy = actor._id
        await setting.save()
        await media.remove(previous, 'SEO image removed')
        return setting
      },
    },

    /* ---------- admin dashboard counts ---------- */
    async dashboard() {
      const [products, categories, services, galleryImages, pendingEnquiries, pendingReviews, publishedReviews] = await Promise.all([
        Product.countDocuments(),
        Category.countDocuments(),
        Service.countDocuments(),
        GalleryItem.countDocuments(),
        Enquiry.countDocuments({ status: 'new' }),
        Testimonial.countDocuments({ status: 'pending' }),
        Testimonial.countDocuments({ published: true }),
      ])
      return { products, categories, services, galleryImages, pendingEnquiries, pendingReviews, publishedReviews }
    },

    /* ---------- public website bundle (published content only) ---------- */
    async publicSite() {
      const [profile, brands, categories, products, services, gallery, testimonials, sections, seo, assets] = await Promise.all([
        BusinessProfile.findOne({ key: 'main' }).populate('primaryBrand'),
        Brand.find({ showOnWebsite: true }).sort({ sortOrder: 1, name: 1 }),
        Category.find({ active: true }).sort({ sortOrder: 1, name: 1 }),
        Product.find({ active: true }).sort({ sortOrder: 1, name: 1 }).populate({ path: 'category', select: 'name slug' }).populate({ path: 'brand', select: 'name slug showRegisteredMark' }),
        Service.find({ active: true }).sort({ sortOrder: 1, title: 1 }),
        GalleryItem.find({ active: true }).sort({ sortOrder: 1, createdAt: -1 }),
        Testimonial.find({ published: true, consentConfirmed: true, status: 'approved' }).sort({ sortOrder: 1, createdAt: -1 }),
        SiteContent.find({ published: true }),
        SeoSetting.find(),
        SiteAsset.find({ active: true }).sort({ sortOrder: 1, createdAt: 1 }),
      ])
      const activeCategoryIds = new Set(categories.map((c) => String(c._id)))
      const assetsBySlot = {}
      for (const asset of assets) (assetsBySlot[asset.slot] ??= []).push(asset)

      // Only social links that are switched on and filled in are public.
      // The old hand-entered `rating` is never public: the site shows live stats from its own reviews.
      const business = profile && { ...profile.toJSON(), rating: undefined, socialLinks: profile.socialLinks.filter((s) => s.enabled && s.url && SOCIAL_PLATFORMS.includes(s.platform)).map(({ platform, url }) => ({ platform, url })) }
      const bundle = {
        business,
        brands,
        categories,
        products: products
          .filter((p) => p.category && activeCategoryIds.has(String(p.category._id)))
          .map((p) => ({ ...p.toJSON(), pricing: publicPricing(p.pricing) })),
        services,
        gallery,
        reviewStats: reviewStats(testimonials), // same approved + published + consented reviews as below
        testimonials: testimonials.map(({ name, company, location, serviceReceived, message, rating, source, sourceUrl, id, createdAt }) => ({ id, name, company, location, serviceReceived, message, rating, source, sourceUrl, createdAt })),
        content: Object.fromEntries(sections.map((s) => [s.key, s.data])),
        contentGu: Object.fromEntries(sections.filter((s) => s.gu && Object.keys(s.gu).length).map((s) => [s.key, s.gu])), // Gujarati versions
        seo: Object.fromEntries(seo.map((s) => [s.page, { title: s.title, description: s.description, keywords: s.keywords, ogImage: s.ogImage ?? null, gu: s.gu ?? {} }])),
        assets: assetsBySlot,
      }
      // Plain JSON without internal audit fields (admin user IDs are not public).
      return JSON.parse(JSON.stringify(bundle, (key, value) => (INTERNAL_FIELDS.has(key) ? undefined : value)))
    },

    /* ---------- public customer reviews (saved as pending, never auto-published) ---------- */
    async submitReview({ website, consent, ...fields }) {
      if (website) throw errors.badRequest('Your review could not be sent.') // honeypot filled in: likely a bot
      const review = await Testimonial.create({ ...fields, consentConfirmed: consent === true, source: 'website', status: 'pending', published: false })
      return { id: review.id, status: review.status, receivedAt: review.createdAt }
    },

    /* ---------- public enquiries ---------- */
    async submitEnquiry({ website, product, service, type, ...fields }, meta) {
      if (website) throw errors.badRequest('Your enquiry could not be sent.') // honeypot filled in: likely a bot
      const doc = { ...fields, type, source: meta.source ?? 'contact-form' }
      if (type === 'product') {
        const found = product && (await Product.findOne({ slug: product, active: true }).select('_id name'))
        if (!found) throw errors.validation([{ path: 'product', message: 'Choose a product from the list.' }])
        doc.product = found._id
        doc.interest ||= found.name
      }
      if (type === 'service') {
        const found = service && (await Service.findOne({ slug: service, active: true }).select('_id title'))
        if (!found) throw errors.validation([{ path: 'service', message: 'Choose a service from the list.' }])
        doc.service = found._id
        doc.interest ||= found.title
      }
      const enquiry = await Enquiry.create(doc)
      return { id: enquiry.id, receivedAt: enquiry.createdAt }
    },
  }
}
