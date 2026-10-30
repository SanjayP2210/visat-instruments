// Guards the approved business content in src/data (the source for the Milestone 2 seed).
import { describe, expect, it } from 'vitest'
import { brand, brandDisplayName, manufacturing, marketingClaims, referenceAssets, taglines } from '../../../src/data/content.js'
import { categories, PENDING, products } from '../../../src/data/products.js'
import { publishedServices, services } from '../../../src/data/services.js'
import { PRODUCT_KINDS } from '../../src/models/index.js'

const byName = (name) => products.find((p) => p.name === name)
const categoryOf = (product) => categories.find((c) => c.id === product.categoryId)?.name

describe('approved product catalogue', () => {
  it('places the poster products in the approved categories', () => {
    expect(categoryOf(byName('Fully Electronic Weighbridge'))).toBe('Weighbridge Systems')
    expect(categoryOf(byName('Cup-Ball Type Load Cell'))).toBe('Load Cells')
    expect(categoryOf(byName('Printer'))).toBe('Printers & Accessories')
    expect(categoryOf(byName('USB Keyboard'))).toBe('Printers & Accessories')
    expect(categoryOf(byName('IT Kit (Interface / Junction Kit)'))).toBe('Load Cell Junction Boxes')
    expect(categoryOf(byName('Jumbo Display'))).toBe('Digital Weighing Indicators')
  })

  it('keeps the existing products and their original photographs', () => {
    const photos = Object.fromEntries(products.filter((p) => p.image).map((p) => [p.slug, p.image.src]))
    expect(photos).toEqual({
      'digital-weighing-indicator': '/images/products/kanot.webp',
      'electronic-weighing-scale': '/images/products/kato.webp',
      'load-cell-junction-box': '/images/products/socket.webp',
      'wireless-serial-communication-module': '/images/products/adapter.webp',
      'electronic-weighbridge': '/images/products/bridge.webp',
      'weighbridge-software': '/images/products/meter.webp',
    })
  })

  it('uses no poster or stock images: new products have no photo yet', () => {
    for (const name of ['IT Kit (Interface / Junction Kit)', 'Cup-Ball Type Load Cell', 'Jumbo Display', 'Printer', 'USB Keyboard']) {
      expect(byName(name).image).toBeNull()
    }
    expect(products.some((p) => p.image?.src?.includes('poster'))).toBe(false)
  })

  it('states no unconfirmed specifications for the new products', () => {
    for (const p of products.filter((x) => !x.image)) {
      expect(p.specifications.every((s) => s.value === PENDING)).toBe(true)
      expect(p.highlights).toEqual([])
    }
  })

  it('has valid references, unique slugs and known kinds', () => {
    expect(products.every((p) => categories.some((c) => c.id === p.categoryId))).toBe(true)
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length)
    expect(products.every((p) => PRODUCT_KINDS.includes(p.kind))).toBe(true)
  })
})

describe('approved services', () => {
  it('publishes exactly the four confirmed services', () => {
    expect(publishedServices.map((s) => s.title)).toEqual(['Sales', 'Service & Maintenance', 'Installation', 'Annual Maintenance Contract (AMC)'])
    expect(publishedServices.every((s) => s.status === 'confirmed')).toBe(true)
  })

  it('keeps Calibration unconfirmed and unpublished', () => {
    const calibration = services.find((s) => s.slug === 'calibration')
    expect(calibration).toMatchObject({ status: 'to-be-confirmed', published: false })
  })
})

describe('brand and unpublished content', () => {
  it('MAGLON: relationship unconfirmed, ® shown', () => {
    expect(brand).toMatchObject({ name: 'MAGLON', relationship: 'unconfirmed', showRegisteredMark: true })
    expect(brandDisplayName).toBe('MAGLON®')
  })

  it('keeps manufacturing, marketing claims and taglines unpublished', () => {
    expect(manufacturing.published).toBe(false)
    expect(manufacturing.items.length).toBeGreaterThan(0)
    expect(marketingClaims.published).toBe(false)
    expect(taglines.published).toBe(false)
  })

  it('keeps the promotional poster out of the public folder', () => {
    expect(referenceAssets.promotionalPoster.startsWith('public/')).toBe(false)
  })
})
