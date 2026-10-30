// Schema rules for brands, products, services, gallery, enquiries, testimonials and site content
// (validated in memory; no database needed).
import mongoose from 'mongoose'
import { describe, expect, it } from 'vitest'
import { Brand, Enquiry, GalleryItem, Product, Service, SiteContent, Testimonial } from '../../src/models/index.js'

const id = () => new mongoose.Types.ObjectId()
const errorPaths = (doc) => Object.keys(doc.validateSync()?.errors ?? {})

describe('Brand', () => {
  it('defaults to an unconfirmed relationship, hidden from the website', () => {
    const brand = new Brand({ name: 'MAGLON', slug: 'maglon' })
    expect(brand.validateSync()).toBeUndefined()
    expect(brand.relationship).toBe('unconfirmed')
    expect(brand.showOnWebsite).toBe(false)
    expect(brand.displayName).toBe('MAGLON')
  })

  it('shows the ® mark only when enabled', () => {
    expect(new Brand({ name: 'MAGLON', slug: 'maglon', showRegisteredMark: true }).displayName).toBe('MAGLON®')
    expect(new Brand({ name: 'MAGLON', slug: 'maglon', showRegisteredMark: true }).toJSON().displayName).toBe('MAGLON®')
  })

  it('accepts only known relationships', () => {
    expect(errorPaths(new Brand({ name: 'X', slug: 'x', relationship: 'owner' }))).toContain('relationship')
  })
})

describe('Product', () => {
  it('stores kind, brand and SEO; specifications and images are optional', () => {
    const product = new Product({
      name: 'Cup-Ball Type Load Cell', slug: 'cup-ball-type-load-cell', category: id(), brand: id(), kind: 'part',
      seo: { title: 'Cup-Ball Type Load Cell', description: 'Load cell for weighbridge systems.', keywords: ['load cell'] },
    })
    expect(product.validateSync()).toBeUndefined()
    expect(product.images).toHaveLength(0)
    expect(product.specifications).toHaveLength(0)
    expect(product.seo.title).toBe('Cup-Ball Type Load Cell')
  })

  it('rejects unknown kinds and over-long SEO titles', () => {
    const product = new Product({ name: 'X', slug: 'x', category: id(), kind: 'gadget', seo: { title: 'x'.repeat(71) } })
    expect(errorPaths(product)).toEqual(expect.arrayContaining(['kind', 'seo.title']))
  })
})

describe('Service', () => {
  it('supports SEO and an unpublished, unconfirmed service', () => {
    const service = new Service({ title: 'Calibration', slug: 'calibration', status: 'to-be-confirmed', active: false, seo: { title: 'Calibration' } })
    expect(service.validateSync()).toBeUndefined()
    expect(service.active).toBe(false)
  })
})

describe('GalleryItem', () => {
  it('supports installation/project types with related products', () => {
    const item = new GalleryItem({ title: 'Weighbridge installation', type: 'installation', relatedProducts: [id()], image: { url: '/images/products/bridge.webp' } })
    expect(item.validateSync()).toBeUndefined()
  })

  it('rejects unknown gallery types', () => {
    expect(errorPaths(new GalleryItem({ title: 'X', type: 'poster', image: { url: '/x.jpg' } }))).toContain('type')
  })
})

describe('Enquiry', () => {
  const base = { name: 'Customer', phone: '9876543210', message: 'Please share details.' }

  it('requires the product for a product enquiry and the service for a service enquiry', () => {
    expect(errorPaths(new Enquiry({ ...base, type: 'product' }))).toContain('product')
    expect(errorPaths(new Enquiry({ ...base, type: 'service' }))).toContain('service')
    expect(new Enquiry({ ...base, type: 'product', product: id() }).validateSync()).toBeUndefined()
    expect(new Enquiry({ ...base, type: 'service', service: id() }).validateSync()).toBeUndefined()
  })

  it('drops references that do not match the enquiry type', async () => {
    const enquiry = new Enquiry({ ...base, type: 'general', product: id(), service: id() })
    await enquiry.validate()
    expect(enquiry.product).toBeUndefined()
    expect(enquiry.service).toBeUndefined()
  })
})

describe('Testimonial', () => {
  const base = { name: 'Customer', message: 'Good service.' }

  it('is unpublished by default', () => {
    const t = new Testimonial(base)
    expect(t.validateSync()).toBeUndefined()
    expect(t.published).toBe(false)
  })

  it('starts as a pending review', () => {
    expect(new Testimonial(base).status).toBe('pending')
  })

  it('can be published only when approved and consent is recorded', () => {
    expect(errorPaths(new Testimonial({ ...base, status: 'approved', published: true }))).toContain('published')
    expect(errorPaths(new Testimonial({ ...base, consentConfirmed: true, published: true }))).toContain('published') // still pending
    expect(errorPaths(new Testimonial({ ...base, consentConfirmed: true, status: 'rejected', published: true }))).toContain('published')
    expect(new Testimonial({ ...base, consentConfirmed: true, status: 'approved', published: true }).validateSync()).toBeUndefined()
  })

  it('limits ratings to 1–5', () => {
    expect(errorPaths(new Testimonial({ ...base, rating: 6 }))).toContain('rating')
  })
})

describe('SiteContent', () => {
  it('is unpublished by default (e.g. manufacturing capabilities)', () => {
    const section = new SiteContent({ key: 'manufacturing', data: { items: ['Junction Box'] } })
    expect(section.validateSync()).toBeUndefined()
    expect(section.published).toBe(false)
  })
})
