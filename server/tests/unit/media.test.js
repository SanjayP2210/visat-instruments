// Image content detection, media configuration and content request validation (no database).
import { describe, expect, it } from 'vitest'
import { loadConfig } from '../../src/config/env.js'
import { detectImageType } from '../../src/utils/imageFile.js'
import { businessProfileUpdate, contentUpdate, productCreate, publicEnquiry, seoUpdate } from '../../src/validators/content.js'
import { TEST_PNG } from '../fakeStorage.js'

const base = { JWT_SECRET: 'j'.repeat(40), CSRF_SECRET: 'c'.repeat(40) }

describe('image content detection', () => {
  it('recognises real PNG, JPEG and WebP headers', () => {
    expect(detectImageType(TEST_PNG)).toBe('image/png')
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg')
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp')
  })

  it.each([
    ['an HTML/script file', Buffer.from('<svg onload=alert(1)>hello</svg>')],
    ['a PDF', Buffer.from('%PDF-1.7 fake document')],
    ['an empty file', Buffer.alloc(0)],
    ['a truncated header', Buffer.from([0x89, 0x50, 0x4e])],
  ])('rejects %s', (_n, buf) => {
    expect(detectImageType(buf)).toBe('')
  })
})

describe('media configuration', () => {
  it('is not configured without all three Cloudinary values', () => {
    expect(loadConfig(base).media.configured).toBe(false)
    expect(loadConfig({ ...base, CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '123' }).media.configured).toBe(false)
  })

  it('treats template placeholders as not configured', () => {
    expect(loadConfig({ ...base, CLOUDINARY_CLOUD_NAME: '<cloud-name>', CLOUDINARY_API_KEY: '<api-key>', CLOUDINARY_API_SECRET: '<api-secret>' }).media.configured).toBe(false)
  })

  it('is configured with real values; size limit defaults to 5 MB', () => {
    const c = loadConfig({ ...base, CLOUDINARY_CLOUD_NAME: 'demo', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'abc' })
    expect(c.media.configured).toBe(true)
    expect(c.media.maxBytes).toBe(5 * 1024 * 1024)
    expect(c.media.folder).toBe('visat-instruments')
  })

  it('rejects unsafe folder names and limits above 10 MB', () => {
    expect(() => loadConfig({ ...base, CLOUDINARY_FOLDER: '../other' })).toThrow('CLOUDINARY_FOLDER')
    expect(() => loadConfig({ ...base, UPLOAD_MAX_MB: '50' })).toThrow('UPLOAD_MAX_MB')
  })
})

describe('content request validation', () => {
  it('public enquiry: valid general enquiry; strict fields; phone format', () => {
    expect(publicEnquiry.safeParse({ name: 'Ravi', phone: '98799 92228', message: 'Need a weighbridge quote.' }).success).toBe(true)
    expect(publicEnquiry.safeParse({ name: 'Ravi', phone: '12345', message: 'Need a weighbridge quote.' }).success).toBe(false)
    expect(publicEnquiry.safeParse({ name: 'Ravi', phone: '98799 92228', message: 'Need a weighbridge quote.', status: 'resolved' }).success).toBe(false)
  })

  it('content sections reject operator-style keys and oversized data', () => {
    expect(contentUpdate.safeParse({ data: { title: 'x', items: ['a'] } }).success).toBe(true)
    expect(contentUpdate.safeParse({ data: { $where: 'x' } }).success).toBe(false)
    expect(contentUpdate.safeParse({ data: { nested: { 'a.b': 1 } } }).success).toBe(false)
    expect(contentUpdate.safeParse({ data: { big: 'x'.repeat(5001) } }).success).toBe(false)
  })

  it('SEO limits title and description lengths', () => {
    expect(seoUpdate.safeParse({ title: 'x'.repeat(71) }).success).toBe(false)
    expect(seoUpdate.safeParse({ description: 'x'.repeat(171) }).success).toBe(false)
    expect(seoUpdate.safeParse({ title: 'Products | VISAT INSTRUMENTS' }).success).toBe(true)
  })

  it('products need a valid category ID and slug; images are not settable directly', () => {
    expect(productCreate.safeParse({ name: 'Printer', slug: 'Printer!', category: '507f1f77bcf86cd799439011' }).success).toBe(false)
    expect(productCreate.safeParse({ name: 'Printer', slug: 'printer', category: '507f1f77bcf86cd799439011', images: [] }).success).toBe(false)
    expect(productCreate.safeParse({ name: 'Printer', slug: 'printer', category: '507f1f77bcf86cd799439011' }).success).toBe(true)
  })

  it('business profile: links must be http(s); no unknown fields', () => {
    expect(businessProfileUpdate.safeParse({ mapsUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(businessProfileUpdate.safeParse({ socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/x', enabled: true }] }).success).toBe(true)
  })

  it('business profile: social links are limited to supported platforms and their own websites', () => {
    const ok = (socialLinks) => businessProfileUpdate.safeParse({ socialLinks }).success
    expect(ok([{ platform: 'instagram', url: '', enabled: false }])).toBe(true) // empty is allowed
    expect(ok([{ platform: 'youtube', url: 'https://www.youtube.com/@x', enabled: true }, { platform: 'linkedin', url: 'https://in.linkedin.com/company/x', enabled: true }])).toBe(true)
    expect(ok([{ platform: 'twitter', url: 'https://x.com/x', enabled: true }])).toBe(false)
    expect(ok([{ platform: 'facebook', url: 'http://facebook.com/x', enabled: true }])).toBe(false) // https only
    expect(ok([{ platform: 'facebook', url: 'https://instagram.com/x', enabled: true }])).toBe(false) // wrong site
    expect(ok([{ platform: 'facebook', url: 'https://facebook.com.evil.example/x', enabled: true }])).toBe(false)
    expect(ok([{ platform: 'facebook', url: 'javascript:alert(1)', enabled: true }])).toBe(false)
    expect(ok([{ platform: 'facebook', url: '', enabled: false }, { platform: 'facebook', url: '', enabled: false }])).toBe(false) // duplicate
    expect(businessProfileUpdate.safeParse({ key: 'other' }).success).toBe(false)
  })
})
