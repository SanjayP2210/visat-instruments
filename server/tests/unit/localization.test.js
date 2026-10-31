import { describe, expect, it } from 'vitest'
import { businessProfileUpdate, categoryUpdate, contentUpdate, productUpdate, seoUpdate, serviceUpdate } from '../../src/validators/content.js'

describe('Gujarati (gu) content validation', () => {
  it('accepts Gujarati versions of translatable text, including blanks for "not translated yet"', () => {
    expect(productUpdate.safeParse({ gu: { name: 'જમ્બો ડિસ્પ્લે', summary: '', highlights: ['મોટું ડિસ્પ્લે', ''], specifications: [{ label: 'કિંમત', value: '' }], seo: { title: 'જમ્બો ડિસ્પ્લે' } } }).success).toBe(true)
    expect(categoryUpdate.safeParse({ gu: { name: 'લોડ સેલ' } }).success).toBe(true)
    expect(serviceUpdate.safeParse({ gu: { title: 'ઇન્સ્ટોલેશન', details: ['વજનકાંટો ઇન્સ્ટોલેશન'] } }).success).toBe(true)
    expect(seoUpdate.safeParse({ gu: { title: 'અમારા વિશે', description: 'વિઝેટ ઇન્સ્ટ્રુમેન્ટ્સ' } }).success).toBe(true)
    expect(contentUpdate.safeParse({ gu: { title: 'વજનકાંટા ઉકેલ' } }).success).toBe(true)
    expect(businessProfileUpdate.safeParse({ gu: { tagline: 'અમદાવાદમાં વજનકાંટા', addressLines: ['ચાંદલોડિયા, અમદાવાદ'] } }).success).toBe(true)
  })

  it('rejects unknown or non-text fields in the Gujarati version', () => {
    expect(productUpdate.safeParse({ gu: { price: 100 } }).success).toBe(false)
    expect(productUpdate.safeParse({ gu: { name: { $ne: '' } } }).success).toBe(false)
    expect(categoryUpdate.safeParse({ gu: { slug: 'x' } }).success).toBe(false)
    expect(serviceUpdate.safeParse({ gu: { title: 'x'.repeat(101) } }).success).toBe(false)
    expect(seoUpdate.safeParse({ gu: { ogImage: {} } }).success).toBe(false)
  })
})
