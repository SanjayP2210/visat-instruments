// Seeds the approved website content into MongoDB from the public site's data files
// (src/data/*), so the content is defined in one place.
// Default: creates missing records only. `force`: also refreshes text fields of existing
// records. Images uploaded through the admin panel (Cloudinary) are never overwritten.
import { business } from '../../../src/data/business.js'
import { brand, manufacturing, marketingClaims, spareParts, taglines } from '../../../src/data/content.js'
import { gallery } from '../../../src/data/gallery.js'
import { owners } from '../../../src/data/owners.js'
import { categories, products } from '../../../src/data/products.js'
import { services, weighbridgeSolutions } from '../../../src/data/services.js'
import { Brand } from '../models/Brand.js'
import { BusinessProfile } from '../models/BusinessProfile.js'
import { Category, GalleryItem, Product, Service } from '../models/catalog.js'
import { SeoSetting, SiteContent } from '../models/site.js'

const localImage = (img) => (img?.src ? { url: img.src, publicId: '', alt: img.alt ?? '', fit: img.fit ?? 'cover' } : null)
const fits = (text, max) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)

// Neutral page SEO defaults (editable in the admin panel).
const SEO_DEFAULTS = {
  home: ['VISAT INSTRUMENTS | Weighbridges & Weighing Scales, Ahmedabad', 'Weighbridges, weighbridge parts and weighing equipment from VISAT INSTRUMENTS, Chandlodiya, Ahmedabad. Sales, service, installation and AMC.'],
  about: ['About Us | VISAT INSTRUMENTS', 'About VISAT INSTRUMENTS, a weighing scale and weighbridge business in Chandlodiya, Ahmedabad, Gujarat.'],
  products: ['Products | VISAT INSTRUMENTS', 'Weighbridges, load cells, junction boxes, indicators, displays, printers and accessories. Details on enquiry.'],
  'weighbridge-solutions': ['Weighbridge Solutions | VISAT INSTRUMENTS', 'Weighbridge platforms, electronics and weighbridge software from VISAT INSTRUMENTS, Ahmedabad.'],
  services: ['Services | VISAT INSTRUMENTS', 'Weighbridge sales, service and maintenance, installation and Annual Maintenance Contracts (AMC).'],
  gallery: ['Gallery | VISAT INSTRUMENTS', 'Photographs of VISAT INSTRUMENTS products and weighbridge installations.'],
  contact: ['Contact Us | VISAT INSTRUMENTS', 'Call or WhatsApp VISAT INSTRUMENTS, Chandlodiya, Ahmedabad, Gujarat, or send an enquiry.'],
}

/** Creates a record if missing; with `force`, refreshes the given fields (never `protectedFields`). */
async function upsert(Model, filter, data, { force, protectedFields = [] }, summary) {
  const existing = await Model.findOne(filter)
  if (!existing) {
    const doc = await Model.create({ ...filter, ...data })
    summary.created += 1
    return doc
  }
  if (!force) {
    summary.skipped += 1
    return existing
  }
  const refresh = { ...data }
  for (const field of protectedFields) delete refresh[field]
  existing.set(refresh)
  await existing.save()
  summary.updated += 1
  return existing
}

export async function seedContent({ force = false } = {}) {
  const summary = {}
  const track = (name) => (summary[name] = { created: 0, updated: 0, skipped: 0 })
  const opts = { force }

  /* Brand: relationship stays unconfirmed; shown as MAGLON® without ownership claims. */
  const maglon = await upsert(
    Brand,
    { slug: brand.slug },
    { name: brand.name, relationship: brand.relationship, showRegisteredMark: brand.showRegisteredMark, showOnWebsite: true, sortOrder: 1 },
    { ...opts, protectedFields: ['logo'] },
    track('brands'),
  )

  /* Business profile (contact numbers come from the model defaults: both numbers, Mahesh primary). */
  await upsert(
    BusinessProfile,
    { key: 'main' },
    {
      name: business.name,
      type: business.type,
      tagline: business.tagline,
      contactPerson: business.contactPerson ?? '',
      address: { lines: business.address.lines, city: business.address.city, state: business.address.state, pincode: business.address.pincode, country: 'India' },
      mapsUrl: business.maps.view,
      rating: business.rating,
      primaryBrand: maglon._id,
      owners: owners.map((o, i) => ({
        name: o.name,
        role: o.role,
        intro: o.intro,
        phone: { display: o.phone.display, tel: o.phone.tel },
        whatsappNumber: (o.whatsapp ?? '').replace(/\D/g, ''),
        photo: localImage(o.photo),
        sortOrder: i + 1,
      })),
    },
    { ...opts, protectedFields: ['owners', 'contactNumbers'] }, // owners hold uploaded photos; edit them in the admin panel
    track('businessProfile'),
  )

  /* Categories */
  track('categories')
  const categoryIds = {}
  for (const c of categories) {
    const doc = await upsert(
      Category,
      { slug: c.slug },
      { name: c.name, shortName: c.shortName ?? '', description: c.description ?? '', icon: c.icon ?? '', sortOrder: c.sortOrder ?? 0, active: true },
      opts,
      summary.categories,
    )
    categoryIds[c.id] = doc._id
  }

  /* Products: original photos only; products without one get no image ("Photo coming soon"). */
  track('products')
  for (const [i, p] of products.entries()) {
    const image = localImage(p.image)
    await upsert(
      Product,
      { slug: p.slug },
      {
        name: p.name,
        category: categoryIds[p.categoryId],
        kind: p.kind ?? 'system',
        summary: p.summary ?? '',
        description: p.description ?? '',
        highlights: p.highlights ?? [],
        specifications: (p.specifications ?? []).map(({ label, value }) => ({ label, value })),
        images: image ? [image] : [],
        featured: Boolean(p.featured),
        active: true,
        sortOrder: i + 1,
        seo: { title: fits(p.name, 70), description: fits(p.summary ?? '', 170) },
      },
      { ...opts, protectedFields: ['images'] },
      summary.products,
    )
  }

  /* Services: unpublished ones (Calibration) are stored inactive. */
  track('services')
  for (const [i, s] of services.entries()) {
    await upsert(
      Service,
      { slug: s.slug },
      { title: s.title, icon: s.icon ?? '', summary: s.summary ?? '', details: s.details ?? [], status: s.status, active: s.published !== false, sortOrder: i + 1, seo: { title: fits(s.title, 70), description: fits(s.summary ?? '', 170) } },
      { ...opts, protectedFields: ['image'] },
      summary.services,
    )
  }

  /* Gallery: existing original photographs. */
  track('gallery')
  for (const [i, g] of gallery.entries()) {
    const exists = await GalleryItem.exists({ 'image.url': g.src })
    if (exists) {
      summary.gallery.skipped += 1
      continue
    }
    await GalleryItem.create({
      title: g.title, caption: g.caption ?? '', tag: g.tag ?? '', type: g.id === 'gal-weighbridge' ? 'installation' : 'product',
      image: { url: g.src, publicId: '', alt: g.alt ?? g.title }, active: true, sortOrder: i + 1,
    })
    summary.gallery.created += 1
  }

  /* Website content sections: unconfirmed material stays unpublished. */
  track('content')
  const sections = {
    manufacturing: [{ title: manufacturing.title, intro: manufacturing.intro, items: manufacturing.items }, manufacturing.published],
    'marketing-claims': [{ items: marketingClaims.items }, marketingClaims.published],
    taglines: [{ items: taglines.items }, taglines.published],
    'spare-parts': [{ title: spareParts.title, intro: spareParts.intro, productKinds: spareParts.productKinds }, spareParts.published],
    weighbridge: [JSON.parse(JSON.stringify(weighbridgeSolutions)), true],
  }
  for (const [key, [data, published]] of Object.entries(sections)) {
    await upsert(SiteContent, { key }, { data, published }, opts, summary.content)
  }

  /* SEO defaults per page */
  track('seo')
  for (const [page, [title, description]] of Object.entries(SEO_DEFAULTS)) {
    await upsert(SeoSetting, { page }, { title, description }, { ...opts, protectedFields: ['ogImage'] }, summary.seo)
  }

  return summary
}
