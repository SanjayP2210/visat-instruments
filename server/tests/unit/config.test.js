import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from '../../src/config/env.js'

const base = {
  JWT_SECRET: 'j'.repeat(40),
  CSRF_SECRET: 'c'.repeat(40),
}

describe('configuration', () => {
  it('applies safe defaults', () => {
    const c = loadConfig(base)
    expect(c.env).toBe('development')
    expect(c.db).toMatchObject({ dbName: 'visat_dev', configured: false })
    expect(c.auth.cookieSecure).toBe(false)
    expect(c.auth.bcryptRounds).toBe(12)
    expect(c.http.allowedOrigins).toEqual([])
  })

  // A complete, valid production configuration (fake values).
  const production = {
    ...base,
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb+srv://prod',
    MONGODB_DB: 'visat_prod',
    ALLOWED_ORIGINS: 'https://visat-instruments.vercel.app',
    CLOUDINARY_CLOUD_NAME: 'cloud',
    CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret',
  }

  it('uses the production database settings and secure cookies in production', () => {
    const c = loadConfig({ ...production, MONGODB_URI_TEST: 'mongodb+srv://test' })
    expect(c.db).toMatchObject({ uri: 'mongodb+srv://prod', dbName: 'visat_prod', configured: true })
    expect(c.auth.cookieSecure).toBe(true)
    expect(c.media).toMatchObject({ configured: true, folder: 'visat-instruments', maxBytes: 5 * 1024 * 1024 })
  })

  it.each([
    ['a missing database connection', { MONGODB_URI: '' }, 'MONGODB_URI'],
    ['a non-production database', { MONGODB_DB: 'visat_dev' }, 'MONGODB_DB'],
    ['no allowed origins', { ALLOWED_ORIGINS: '' }, 'ALLOWED_ORIGINS'],
    ['an http origin', { ALLOWED_ORIGINS: 'http://visat-instruments.vercel.app' }, 'ALLOWED_ORIGINS'],
    ['an origin with a path', { ALLOWED_ORIGINS: 'https://visat-instruments.vercel.app/admin' }, 'ALLOWED_ORIGINS'],
    ['insecure cookies', { COOKIE_SECURE: 'false' }, 'COOKIE_SECURE'],
    ['missing Cloudinary credentials', { CLOUDINARY_API_SECRET: '' }, 'CLOUDINARY'],
    ['a development Cloudinary folder', { CLOUDINARY_FOLDER: 'visat-instruments-dev' }, 'CLOUDINARY_FOLDER'],
    ['a test Cloudinary folder', { CLOUDINARY_FOLDER: 'visat-instruments-test' }, 'CLOUDINARY_FOLDER'],
  ])('refuses a production configuration with %s', (_label, change, name) => {
    expect(() => loadConfig({ ...production, ...change })).toThrow(new RegExp(`- ${name}: `))
  })

  it('never includes secret values in configuration errors', () => {
    const secretUri = 'mongodb+srv://user:SuperSecretPassword@cluster0.example.net'
    try {
      loadConfig({ ...production, MONGODB_URI: secretUri, MONGODB_DB: 'visat_dev', CLOUDINARY_API_SECRET: '' })
      throw new Error('expected a configuration error')
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError)
      expect(err.message).not.toContain('SuperSecretPassword')
      expect(err.message).not.toContain('visat_dev')
    }
  })

  it('limits uploads to 4 MB on Vercel and rejects the one-off admin password there', () => {
    expect(loadConfig({ ...production, VERCEL: '1' }).media.maxBytes).toBe(4 * 1024 * 1024)
    expect(() => loadConfig({ ...production, VERCEL: '1', UPLOAD_MAX_MB: '5' })).toThrow(/- UPLOAD_MAX_MB: /)
    expect(() => loadConfig({ ...production, VERCEL: '1', INITIAL_ADMIN_PASSWORD: 'x'.repeat(16) })).toThrow(/- INITIAL_ADMIN_PASSWORD: /)
    // Locally (not on Vercel) the one-off admin seed may run with production settings.
    expect(loadConfig({ ...production, INITIAL_ADMIN_PASSWORD: 'x'.repeat(16) }).env).toBe('production')
  })

  it('keeps Vercel Preview and Production on separate databases and image folders', () => {
    const preview = { ...production, VERCEL: '1', VERCEL_ENV: 'preview', MONGODB_DB: 'visat_preview', CLOUDINARY_FOLDER: 'visat-instruments-preview' }
    expect(loadConfig(preview).db.dbName).toBe('visat_preview')
    expect(() => loadConfig({ ...preview, MONGODB_DB: 'visat_prod' })).toThrow(/- MONGODB_DB: .*preview/)
    expect(() => loadConfig({ ...preview, CLOUDINARY_FOLDER: 'visat-instruments' })).toThrow(/- CLOUDINARY_FOLDER: /)
    const prod = { ...production, VERCEL: '1', VERCEL_ENV: 'production', CLOUDINARY_FOLDER: 'visat-instruments' }
    expect(loadConfig(prod).db.dbName).toBe('visat_prod')
    expect(() => loadConfig({ ...prod, MONGODB_DB: 'visat_preview' })).toThrow(/- MONGODB_DB: .*_prod/)
    expect(() => loadConfig({ ...prod, CLOUDINARY_FOLDER: 'visat-instruments-preview' })).toThrow(/- CLOUDINARY_FOLDER: /)
    expect(() => loadConfig({ ...prod, MONGODB_DB: 'visat_dev' })).toThrow(/- MONGODB_DB: /)
  })

  it('uses only the test database settings in the test environment', () => {
    const c = loadConfig({ ...base, NODE_ENV: 'test', MONGODB_URI: 'mongodb+srv://dev', MONGODB_URI_TEST: 'mongodb+srv://test', MONGODB_DB_TEST: 'visat_test' })
    expect(c.db).toMatchObject({ uri: 'mongodb+srv://test', dbName: 'visat_test' })
  })

  it('parses the allowed origins list', () => {
    expect(loadConfig({ ...base, ALLOWED_ORIGINS: ' https://a.example , https://b.example ,' }).http.allowedOrigins).toEqual([
      'https://a.example',
      'https://b.example',
    ])
  })

  it.each([
    [{ CSRF_SECRET: base.CSRF_SECRET }, 'JWT_SECRET'],
    [{ ...base, JWT_SECRET: 'short' }, 'JWT_SECRET must be at least 32 characters'],
    [{ JWT_SECRET: 'x'.repeat(40), CSRF_SECRET: 'x'.repeat(40) }, 'must be different'],
    [{ ...base, NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ ...base, SESSION_HOURS: '500' }, 'SESSION_HOURS'],
  ])('rejects invalid configuration %#', (env, message) => {
    expect(() => loadConfig(env)).toThrow(ConfigError)
    expect(() => loadConfig(env)).toThrow(message)
  })
})
