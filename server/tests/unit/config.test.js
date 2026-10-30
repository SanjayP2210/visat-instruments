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

  it('uses the production database settings and secure cookies in production', () => {
    const c = loadConfig({ ...base, NODE_ENV: 'production', MONGODB_URI: 'mongodb+srv://prod', MONGODB_DB: 'visat_prod', MONGODB_URI_TEST: 'mongodb+srv://test' })
    expect(c.db).toMatchObject({ uri: 'mongodb+srv://prod', dbName: 'visat_prod', configured: true })
    expect(c.auth.cookieSecure).toBe(true)
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
