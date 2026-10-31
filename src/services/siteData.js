// Maps the public website bundle (GET /api/public/site) to the shapes the pages use.
// The database is the source of truth. The static files in src/data are used only as a
// fallback when the API cannot be reached, never merged over live records.
import { business as staticBusiness } from '../data/business'
import { gallery as staticGallery } from '../data/gallery'
import { owners as staticOwners } from '../data/owners'
import { categories as staticCategories, products as staticProducts } from '../data/products'
import { publishedServices as staticServices, weighbridgeSolutions as staticWeighbridge } from '../data/services'
import { visibleSocialLinks } from '../utils/social'

const REQUEST_QUOTE = Object.freeze({ type: 'request-quote', gst: 'not-specified', additionalCharges: '', availability: 'not-specified' })

/** Cloudinary delivery URL resized and auto-formatted; other URLs are returned unchanged. */
export function optimizeImage(src, width = 1000) {
  if (!src || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(src)) return src
  if (/\/upload\/[^/]*(?:f_auto|w_\d)/.test(src)) return src // already transformed
  return src.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`)
}

const image = (img, alt = '', width) => (img?.url ? { src: optimizeImage(img.url, width), alt: img.alt || alt, fit: img.fit ?? 'cover' } : null)
const digits = (v) => String(v ?? '').replace(/\D/g, '')
const mapsLinks = (full, mapsUrl) => {
  const q = encodeURIComponent(full)
  return {
    view: mapsUrl || `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
  }
}

function toBusiness(p, stats) {
  if (!p) return staticBusiness
  const numbers = p.contactNumbers ?? []
  const primary = numbers.find((c) => c.isPrimary) ?? numbers[0]
  const wa = numbers.find((c) => c.isPrimary && c.isWhatsApp) ?? numbers.find((c) => c.isWhatsApp)
  const lines = p.address?.lines?.length ? p.address.lines : staticBusiness.address.lines
  const full = lines.join(', ')
  const name = p.name || staticBusiness.name
  return {
    name,
    type: p.type || staticBusiness.type,
    tagline: p.tagline || staticBusiness.tagline,
    description: p.description ?? '',
    contactPerson: p.contactPerson || primary?.person || '',
    email: p.email ?? '',
    phone: primary ? { display: primary.displayNumber, tel: primary.dialNumber } : staticBusiness.phone,
    whatsapp: wa ? { number: digits(wa.dialNumber), url: `https://wa.me/${digits(wa.dialNumber)}` } : staticBusiness.whatsapp,
    contactNumbers: numbers,
    address: { lines, full, city: p.address?.city ?? '', state: p.address?.state ?? '', pincode: p.address?.pincode ?? '', country: p.address?.country ?? 'India' },
    maps: mapsLinks(`${name}, ${full}`, p.mapsUrl),
    rating: stats?.count > 0 ? { value: stats.average, count: stats.count } : null, // live customer-review stats
    socialLinks: visibleSocialLinks(p.socialLinks),
    primaryBrand: p.primaryBrand ?? null,
  }
}

const toOwner = (o) => ({
  id: o.id,
  name: o.name,
  role: o.role,
  intro: o.intro,
  phone: o.phone?.tel ? o.phone : null,
  whatsapp: o.whatsappNumber ? `https://wa.me/${digits(o.whatsappNumber)}` : null,
  photo: image(o.photo, `Portrait of ${o.name}`, 600),
})

const brandName = (b) => (b ? `${b.name}${b.showRegisteredMark ? '®' : ''}` : '')

function toProduct(p) {
  const images = (p.images ?? []).map((img) => image(img, p.name)).filter(Boolean)
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.category?.id ?? null,
    brand: p.brand ? { name: brandName(p.brand), slug: p.brand.slug } : null,
    kind: p.kind,
    featured: Boolean(p.featured),
    summary: p.summary ?? '',
    description: p.description ?? '',
    highlights: p.highlights ?? [],
    specifications: p.specifications ?? [],
    images,
    image: images[0] ?? null,
    pricing: p.pricing ?? REQUEST_QUOTE,
    seo: p.seo ?? {},
  }
}

const toService = (s) => ({ id: s.id, slug: s.slug, title: s.title, icon: s.icon, summary: s.summary, details: s.details ?? [], status: s.status, image: image(s.image, s.title, 900), seo: s.seo ?? {} })
const toGalleryItem = (g) => ({ id: g.id, src: optimizeImage(g.image?.url, 1600), alt: g.image?.alt || g.title, title: g.title, caption: g.caption, tag: g.tag, type: g.type })

/** Website assets by slot: single slots → image, multiple slots → list of images. */
function toAssets(assets = {}) {
  const out = {}
  for (const [slot, list] of Object.entries(assets)) {
    const images = list.map((a) => image(a.image, a.title, slot === 'home-banner' ? 1920 : 1200)).filter(Boolean)
    out[slot] = slot === 'home-banner' || slot === 'about-image' ? images : (images[0] ?? null)
  }
  return out
}

/** Live site from the API bundle. */
/**
 * Layers a translation over the English value. Only non-empty translated strings replace
 * English; lists are matched by position; anything missing keeps the English text.
 */
export function localize(base, tr) {
  if (tr == null) return base
  if (typeof tr === 'string') return tr.trim() ? tr : base
  if (Array.isArray(tr)) return Array.isArray(base) && base.length ? base.map((b, i) => localize(b, tr[i])) : tr.filter((x) => x !== '' && x != null)
  if (typeof tr === 'object') {
    if (base != null && typeof base !== 'object') return base
    const out = { ...(base ?? {}) }
    for (const [k, v] of Object.entries(tr)) out[k] = localize(base?.[k], v)
    return out
  }
  return base
}

// Record with its Gujarati version (`gu`) applied when the site is shown in Gujarati.
const inLang = (record, lang) => (lang === 'gu' && record?.gu ? localize(record, record.gu) : record)

function businessInLang(profile, lang) {
  if (!profile || lang !== 'gu' || !profile.gu) return profile
  const { addressLines, ...text } = profile.gu
  const out = localize(profile, text)
  if (addressLines?.some((l) => l?.trim())) out.address = { ...profile.address, lines: localize(profile.address?.lines ?? [], addressLines) }
  return out
}

/** Live site from the API bundle, in the chosen language ('en' | 'gu'). */
export function buildSite(data, lang = 'en') {
  const gu = lang === 'gu'
  // SEO in Gujarati uses only the Gujarati values (blank → translated page titles), never English text.
  const seoIn = (s) => (gu ? { ...(s?.gu ?? {}), ogImage: s?.ogImage ?? null } : s)
  const seo = Object.fromEntries(Object.entries(data.seo ?? {}).map(([page, s]) => [page, seoIn(s)]))
  return {
    status: 'live',
    business: toBusiness(businessInLang(data.business, lang), data.reviewStats),
    owners: (data.business?.owners ?? [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((o) => toOwner(inLang(o, lang))),
    categories: (data.categories ?? [])
      .map((c) => inLang(c, lang))
      .map(({ id, slug, name, shortName, description, icon, sortOrder }) => ({ id, slug, name, shortName: shortName || name, description, icon, sortOrder })),
    products: (data.products ?? []).map((p) => ({ ...toProduct(inLang(p, lang)), seo: seoIn(p.seo ? { ...p.seo, gu: p.gu?.seo } : null) ?? {} })),
    brands: data.brands ?? [],
    services: (data.services ?? []).map((s) => toService(inLang(s, lang))),
    weighbridgeSolutions: localize(data.content?.weighbridge ?? staticWeighbridge, gu ? data.contentGu?.weighbridge : null),
    spareParts: data.content?.['spare-parts'] ? localize(data.content['spare-parts'], gu ? data.contentGu?.['spare-parts'] : null) : null,
    gallery: (data.gallery ?? [])
      .filter((g) => g.image?.url)
      .map((g) => {
        const item = inLang(g, lang)
        return gu && g.gu?.alt?.trim() ? { ...item, image: { ...item.image, alt: g.gu.alt } } : item
      })
      .map(toGalleryItem),
    testimonials: data.testimonials ?? [], // always shown as written: never translated
    seo,
    assets: toAssets(data.assets),
  }
}

/** Built-in content, used while loading (contact details only) and when the API is unreachable. */
export function staticSite(status) {
  return {
    status,
    business: staticBusiness,
    owners: staticOwners,
    categories: staticCategories,
    products: staticProducts.map((p) => ({ ...p, images: p.image ? [p.image] : [], pricing: REQUEST_QUOTE, brand: null, seo: {} })),
    brands: [],
    services: staticServices,
    weighbridgeSolutions: staticWeighbridge,
    spareParts: null,
    gallery: staticGallery,
    testimonials: [],
    seo: {},
    assets: {},
  }
}
