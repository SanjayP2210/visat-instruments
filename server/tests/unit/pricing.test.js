import { describe, expect, it } from 'vitest'
import { publicPricing } from '../../src/services/siteService.js'
import { pricing, productUpdate } from '../../src/validators/content.js'

describe('product pricing', () => {
  it('never exposes an amount for "Request quote" or for a priced type without a selling price', () => {
    expect(publicPricing({ type: 'request-quote', originalPrice: 5000, sellingPrice: 4000 })).toEqual({ type: 'request-quote', gst: 'not-specified', additionalCharges: '', availability: 'not-specified' })
    expect(publicPricing({ type: 'fixed' }).type).toBe('request-quote')
    expect(publicPricing(undefined).type).toBe('request-quote')
  })

  it('calculates the discount from the owner-entered prices only', () => {
    expect(publicPricing({ type: 'fixed', originalPrice: 12000, sellingPrice: 9000, gst: 'exclusive', gstRate: 18, availability: 'in-stock' })).toEqual({
      type: 'fixed',
      sellingPrice: 9000,
      originalPrice: 12000,
      discountAmount: 3000,
      discountPercent: 25,
      gst: 'exclusive',
      gstRate: 18,
      additionalCharges: '',
      availability: 'in-stock',
    })
    // No original price, or one not above the selling price: no discount shown.
    expect(publicPricing({ type: 'starting-from', sellingPrice: 9000 })).toMatchObject({ originalPrice: null, discountAmount: 0, discountPercent: 0 })
    expect(publicPricing({ type: 'fixed', originalPrice: 9000, sellingPrice: 9000 })).toMatchObject({ originalPrice: null, discountAmount: 0 })
  })

  it('hides the GST rate when GST is not specified', () => {
    expect(publicPricing({ type: 'fixed', sellingPrice: 100, gstRate: 18 }).gstRate).toBeNull()
  })

  it('validates pricing input', () => {
    expect(pricing.safeParse({ type: 'request-quote' }).success).toBe(true)
    expect(pricing.safeParse({ type: 'fixed' }).success).toBe(false) // selling price required
    expect(pricing.safeParse({ type: 'fixed', sellingPrice: 100, originalPrice: 90 }).success).toBe(false) // original below selling
    expect(pricing.safeParse({ type: 'fixed', sellingPrice: -1 }).success).toBe(false)
    expect(pricing.safeParse({ type: 'fixed', sellingPrice: 100, discountPercent: 50 }).success).toBe(false) // discounts are never typed in
    expect(pricing.safeParse({ type: 'free' }).success).toBe(false)
    expect(productUpdate.safeParse({ pricing: { type: 'starting-from', sellingPrice: 2500, gst: 'inclusive', availability: 'made-to-order' } }).success).toBe(true)
  })
})
