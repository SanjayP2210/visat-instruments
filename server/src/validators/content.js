// Request schemas for the content APIs. Every body is strict: unknown fields are rejected.
import { z } from 'zod'
import { BRAND_RELATIONSHIPS } from '../models/Brand.js'
import { GALLERY_TYPES, PRODUCT_KINDS } from '../models/catalog.js'
import { ASSET_SLOTS } from '../models/media.js'
import { ENQUIRY_STATUSES, ENQUIRY_TYPES, REVIEW_SOURCES, REVIEW_STATUSES } from '../models/site.js'
import { booleanParam, email, listQuery, objectId } from './common.js'

/* ---------- building blocks ---------- */
const text = (max, { min = 0 } = {}) => z.string().trim().min(min).max(max)
const optionalText = (max) => text(max).optional()
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')
const sortOrder = z.number().int().min(-10000).max(10000)
const iconName = z.string().trim().max(40).regex(/^[A-Za-z]*$/, 'Use an icon name such as Truck or Gauge.')
const nullableId = objectId.nullable()
const url = z.string().trim().max(1000).refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Enter a full https:// link.')
export const seo = z
  .object({
    title: optionalText(70),
    description: optionalText(170),
    keywords: z.array(text(60, { min: 1 })).max(20).optional(),
  })
  .strict()

/** Partial update of a create schema: at least one field. */
const updateOf = (schema) =>
  schema
    .partial()
    .strict()
    .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')

// Multipart text fields arrive as strings; convert before validating.
const formBool = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean())
const formInt = z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? Number(v) : v), sortOrder)

/* ---------- categories ---------- */
export const categoryCreate = z
  .object({
    name: text(100, { min: 2 }),
    slug,
    shortName: optionalText(40),
    description: optionalText(1000),
    icon: iconName.optional(),
    sortOrder: sortOrder.optional(),
    active: z.boolean().optional(),
  })
  .strict()
export const categoryUpdate = updateOf(categoryCreate)
export const categoryList = listQuery({ sortFields: ['name', 'sortOrder', 'createdAt'], defaultSort: 'sortOrder', filters: { active: booleanParam.optional() } })

/* ---------- brands ---------- */
export const brandCreate = z
  .object({
    name: text(80, { min: 1 }),
    slug,
    tagline: optionalText(200),
    description: optionalText(2000),
    relationship: z.enum(BRAND_RELATIONSHIPS).optional(),
    showRegisteredMark: z.boolean().optional(),
    showOnWebsite: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
  })
  .strict()
export const brandUpdate = updateOf(brandCreate)
export const brandList = listQuery({
  sortFields: ['name', 'sortOrder', 'createdAt'],
  defaultSort: 'sortOrder',
  filters: { showOnWebsite: booleanParam.optional(), relationship: z.enum(BRAND_RELATIONSHIPS).optional() },
})

/* ---------- products ---------- */
const specification = z.object({ label: text(100, { min: 1 }), value: text(300, { min: 1 }) }).strict()
export const productCreate = z
  .object({
    name: text(150, { min: 2 }),
    slug,
    category: objectId,
    brand: nullableId.optional(),
    kind: z.enum(PRODUCT_KINDS).optional(),
    summary: optionalText(400),
    description: optionalText(5000),
    highlights: z.array(text(200, { min: 1 })).max(20).optional(),
    specifications: z.array(specification).max(40).optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    seo: seo.optional(),
  })
  .strict()
export const productUpdate = updateOf(productCreate)
export const productList = listQuery({
  sortFields: ['name', 'sortOrder', 'createdAt', 'updatedAt'],
  defaultSort: 'sortOrder',
  filters: {
    category: objectId.optional(),
    brand: objectId.optional(),
    kind: z.enum(PRODUCT_KINDS).optional(),
    featured: booleanParam.optional(),
    active: booleanParam.optional(),
  },
})
export const imageUploadFields = z.object({ alt: optionalText(300) }).strict()
export const productImageUpdate = z
  .object({ alt: optionalText(300), fit: z.enum(['cover', 'contain']).optional() })
  .strict()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')
export const imageOrder = z.object({ order: z.array(objectId).min(1).max(12) }).strict()
export const imageParams = z.object({ id: objectId, imageId: objectId })

/* ---------- services ---------- */
export const serviceCreate = z
  .object({
    title: text(100, { min: 2 }),
    slug,
    icon: iconName.optional(),
    summary: optionalText(400),
    details: z.array(text(200, { min: 1 })).max(20).optional(),
    status: z.enum(['confirmed', 'to-be-confirmed']).optional(),
    active: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
    seo: seo.optional(),
  })
  .strict()
export const serviceUpdate = updateOf(serviceCreate)
export const serviceList = listQuery({
  sortFields: ['title', 'sortOrder', 'createdAt'],
  defaultSort: 'sortOrder',
  filters: { active: booleanParam.optional(), status: z.enum(['confirmed', 'to-be-confirmed']).optional() },
})

/* ---------- gallery ---------- */
const galleryFields = {
  title: text(120, { min: 2 }),
  caption: optionalText(300),
  tag: optionalText(40),
  type: z.enum(GALLERY_TYPES).optional(),
  location: optionalText(150),
  alt: optionalText(300),
}
// Created with an image (multipart), so numbers/booleans arrive as strings.
export const galleryCreate = z.object({ ...galleryFields, sortOrder: formInt.optional(), active: formBool.optional() }).strict()
export const galleryUpdate = updateOf(
  z
    .object({
      ...galleryFields,
      relatedProducts: z.array(objectId).max(20),
      sortOrder,
      active: z.boolean(),
    })
    .strict(),
)
export const galleryList = listQuery({
  sortFields: ['sortOrder', 'createdAt', 'title'],
  defaultSort: 'sortOrder',
  filters: { type: z.enum(GALLERY_TYPES).optional(), active: booleanParam.optional(), tag: text(40).optional() },
})

/* ---------- testimonials / customer reviews ---------- */
export const testimonialCreate = z
  .object({
    name: text(100, { min: 2 }),
    company: optionalText(120),
    location: optionalText(120),
    serviceReceived: optionalText(150),
    message: text(1500, { min: 5 }),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    source: z.enum(REVIEW_SOURCES).optional(),
    sourceUrl: url.optional(),
    consentConfirmed: z.boolean().optional(),
    status: z.enum(REVIEW_STATUSES).optional(),
    published: z.boolean().optional(),
    sortOrder: sortOrder.optional(),
  })
  .strict()
export const testimonialUpdate = updateOf(testimonialCreate)
export const testimonialList = listQuery({
  sortFields: ['sortOrder', 'createdAt', 'name', 'rating'],
  defaultSort: '-createdAt',
  filters: {
    published: booleanParam.optional(),
    source: z.enum(REVIEW_SOURCES).optional(),
    status: z.enum(REVIEW_STATUSES).optional(),
  },
})

// Public "Write a review" form. Links are not allowed in reviews (a common spam pattern).
const noLinks = (s) => !/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|in|info|xyz|ru|top)\b)/i.test(s)
export const publicReview = z
  .object({
    name: text(100, { min: 2 }).refine(noLinks, 'Links are not allowed.'),
    rating: z.number().int().min(1, 'Choose a rating from 1 to 5 stars.').max(5),
    serviceReceived: text(150, { min: 2 }).refine(noLinks, 'Links are not allowed.'),
    message: text(1500, { min: 20 }).refine(noLinks, 'Links are not allowed in reviews.'),
    consent: z.literal(true, { error: 'Please agree to your review being published.' }),
    website: z.string().max(200).optional(), // honeypot: must stay empty
  })
  .strict()

/* ---------- business profile ---------- */
const contactNumber = z
  .object({
    id: objectId.optional(),
    label: optionalText(40),
    person: optionalText(100),
    displayNumber: text(25, { min: 8 }),
    dialNumber: text(16, { min: 9 }),
    isWhatsApp: z.boolean().optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict()
const owner = z
  .object({
    id: objectId.optional(),
    name: text(100, { min: 2 }),
    role: optionalText(60),
    intro: optionalText(1000),
    phone: z.object({ display: optionalText(30), tel: optionalText(20) }).strict().optional(),
    whatsappNumber: z.string().trim().regex(/^\d{0,15}$/, 'Digits only, e.g. 919879992228.').optional(),
    sortOrder: sortOrder.optional(),
  })
  .strict()
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, e.g. 09:30.')
export const businessProfileUpdate = updateOf(
  z
    .object({
      name: text(120, { min: 2 }),
      type: optionalText(120),
      tagline: optionalText(200),
      description: optionalText(5000),
      contactPerson: optionalText(100),
      contactNumbers: z.array(contactNumber).max(10),
      email: z.union([email, z.literal('')]),
      address: z
        .object({
          lines: z.array(text(200, { min: 1 })).max(6).optional(),
          city: optionalText(80),
          state: optionalText(80),
          pincode: optionalText(12),
          country: optionalText(80),
        })
        .strict(),
      mapsUrl: url,
      openingHours: z
        .array(z.object({ day: z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']), open: hhmm.optional(), close: hhmm.optional(), closed: z.boolean().optional() }).strict())
        .max(7),
      socialLinks: z.array(z.object({ platform: text(40, { min: 1 }), url: url.refine((v) => v !== '', 'Enter a link.') }).strict()).max(10),
      rating: z
        .object({ value: z.number().min(0).max(5).optional(), count: z.number().int().min(0).optional(), source: optionalText(40) })
        .strict(),
      owners: z.array(owner).max(10),
      primaryBrand: nullableId,
    })
    .strict(),
)
export const ownerParams = z.object({ ownerId: objectId })

/* ---------- website content & SEO ---------- */
export const CONTENT_KEYS = Object.freeze(['home', 'about', 'weighbridge', 'contact', 'why-choose-us', 'spare-parts', 'manufacturing', 'taglines', 'marketing-claims'])
export const SEO_PAGES = Object.freeze(['home', 'about', 'products', 'weighbridge-solutions', 'services', 'gallery', 'contact'])

// Content sections hold structured JSON. Keep it plain (no functions/operators) and bounded.
const jsonValue = z.lazy(() => z.union([z.string().max(5000), z.number(), z.boolean(), z.null(), z.array(jsonValue).max(100), z.record(z.string().regex(/^[A-Za-z0-9_-]{1,60}$/), jsonValue)]))
export const contentKeyParams = z.object({ key: z.enum(CONTENT_KEYS) })
export const contentUpdate = z
  .object({
    data: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,60}$/), jsonValue).refine((d) => JSON.stringify(d).length <= 50000, 'Content is too large.').optional(),
    published: z.boolean().optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')

export const seoPageParams = z.object({ page: z.enum(SEO_PAGES) })
export const seoUpdate = seo.refine((b) => Object.keys(b).length > 0, 'Nothing to update.')

/* ---------- branding & media assets ---------- */
export const assetCreate = z
  .object({
    slot: z.enum(Object.keys(ASSET_SLOTS)),
    title: optionalText(120),
    alt: optionalText(300),
    sortOrder: formInt.optional(),
    active: formBool.optional(),
  })
  .strict()
export const assetUpdate = updateOf(
  z.object({ title: optionalText(120), alt: optionalText(300), sortOrder, active: z.boolean() }).strict(),
)
export const assetList = listQuery({
  sortFields: ['sortOrder', 'createdAt', 'slot'],
  defaultSort: 'sortOrder',
  filters: { slot: z.enum(Object.keys(ASSET_SLOTS)).optional(), active: booleanParam.optional() },
})

/* ---------- enquiries ---------- */
export const publicEnquiry = z
  .object({
    name: text(100, { min: 2 }),
    phone: z.string().trim().regex(/^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, 'Enter a valid 10-digit Indian mobile number.'),
    email: z.union([email, z.literal('')]).optional(),
    message: text(3000, { min: 10 }),
    interest: optionalText(200),
    type: z.enum(ENQUIRY_TYPES).default('general'),
    product: slug.optional(), // product slug for product enquiries
    service: slug.optional(), // service slug for service enquiries
    website: z.string().max(200).optional(), // honeypot: must stay empty
  })
  .strict()
export const enquiryUpdate = z
  .object({ status: z.enum(ENQUIRY_STATUSES).optional(), notes: optionalText(3000) })
  .strict()
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update.')
export const enquiryList = listQuery({
  sortFields: ['createdAt', 'status', 'name'],
  defaultSort: '-createdAt',
  filters: { status: z.enum(ENQUIRY_STATUSES).optional(), type: z.enum(ENQUIRY_TYPES).optional() },
})
