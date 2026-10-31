import { describe, expect, it } from 'vitest'
import { cleanPath, dateRange, parseUserAgent, productSlugOf, referrerHost, visitorKey } from '../../src/services/analyticsService.js'
import { redact, truncateIp } from '../../src/services/logService.js'
import { adminActivityList, trackBody } from '../../src/validators/analytics.js'

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36'
const SAFARI_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

describe('analytics helpers', () => {
  it('derives coarse device, browser and OS and flags bots', () => {
    expect(parseUserAgent(CHROME_ANDROID)).toMatchObject({ bot: false, device: 'mobile', browser: 'Chrome', os: 'Android' })
    expect(parseUserAgent(SAFARI_MAC)).toMatchObject({ device: 'desktop', browser: 'Safari', os: 'macOS' })
    expect(parseUserAgent('Googlebot/2.1').bot).toBe(true)
    expect(parseUserAgent('').bot).toBe(true)
  })

  it('keeps only safe paths and never admin pages', () => {
    expect(cleanPath('/products/abc?utm_source=x#top')).toBe('/products/abc')
    expect(cleanPath('/contact/')).toBe('/contact')
    expect(cleanPath('/')).toBe('/')
    expect(cleanPath('/admin/users')).toBeNull()
    expect(cleanPath('https://evil.example/x')).toBeNull()
    expect(cleanPath('//evil.example')).toBeNull()
  })

  it('recognises product pages', () => {
    expect(productSlugOf('/products/load-cell-50t')).toBe('load-cell-50t')
    expect(productSlugOf('/products')).toBeUndefined()
  })

  it('stores the referrer host only and ignores our own site', () => {
    expect(referrerHost('https://www.google.com/search?q=weighbridge', 'visat.example')).toBe('google.com')
    expect(referrerHost('https://visat.example/about', 'visat.example')).toBeUndefined()
    expect(referrerHost('not a url', 'visat.example')).toBeUndefined()
  })

  it('makes an anonymous visitor key that changes every day', () => {
    const a = visitorKey('1.2.3.4', 'ua', 'secret', new Date('2026-10-01T10:00:00Z'))
    expect(a).toMatch(/^[a-f0-9]{20}$/)
    expect(visitorKey('1.2.3.4', 'ua', 'secret', new Date('2026-10-01T12:00:00Z'))).toBe(a)
    expect(visitorKey('1.2.3.4', 'ua', 'secret', new Date('2026-10-02T12:00:00Z'))).not.toBe(a)
  })

  it('validates date ranges', () => {
    const { start, end } = dateRange({ from: '2026-10-01', to: '2026-10-31' })
    expect(start.toISOString()).toBe('2026-09-30T18:30:00.000Z')
    expect(end > start).toBe(true)
    expect(() => dateRange({ from: '2026-10-31', to: '2026-10-01' })).toThrow()
    expect(() => dateRange({ from: '2024-01-01', to: '2026-01-01' })).toThrow()
  })
})

describe('log redaction', () => {
  it('removes secrets and personal data', () => {
    const out = redact({ password: 'x', token: 'y', email: 'a@b.c', phone: '9', nested: { apiKey: 'k', folder: 'products' }, list: [{ cookie: 'c' }] })
    expect(out).toEqual({ password: '[redacted]', token: '[redacted]', email: '[redacted]', phone: '[redacted]', nested: { apiKey: '[redacted]', folder: 'products' }, list: [{ cookie: '[redacted]' }] })
  })

  it('truncates IP addresses', () => {
    expect(truncateIp('203.0.113.42')).toBe('203.0.113.x')
    expect(truncateIp('::ffff:10.0.0.7')).toBe('10.0.0.x')
  })
})

describe('analytics validators', () => {
  it('accepts a normal tracking batch and rejects unknown fields or event types', () => {
    const sid = 'abcdefghijklmnop1234'
    expect(trackBody.safeParse({ sid, events: [{ type: 'page_view', path: '/' }] }).success).toBe(true)
    expect(trackBody.safeParse({ sid, events: [{ type: 'page_view', path: '/', email: 'x' }] }).success).toBe(false)
    expect(trackBody.safeParse({ sid, events: [{ type: 'login', path: '/' }] }).success).toBe(false)
    expect(trackBody.safeParse({ sid: 'short', events: [{ type: 'page_view', path: '/' }] }).success).toBe(false)
    expect(trackBody.safeParse({ sid, events: [] }).success).toBe(false)
  })

  it('rejects operator-like filters', () => {
    expect(adminActivityList.safeParse({ entityType: '$where' }).success).toBe(false)
  })
})
