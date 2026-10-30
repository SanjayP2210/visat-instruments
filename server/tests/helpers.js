import { afterAll, beforeAll } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { connectDatabase, disconnectDatabase } from '../src/config/database.js'
import { loadConfig } from '../src/config/env.js'
import * as models from '../src/models/index.js'
import { hashPassword } from '../src/services/passwordService.js'

export const ORIGIN = 'http://localhost:5173'

/** Test configuration: fixed test secrets, fast hashing, generous limits, test database only. */
export function testConfig(overrides = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    MONGODB_URI_TEST: process.env.MONGODB_URI_TEST ?? '',
    MONGODB_DB_TEST: process.env.MONGODB_DB_TEST ?? 'visat_test',
    JWT_SECRET: 'test-jwt-secret-0123456789-abcdefghijklmnop',
    CSRF_SECRET: 'test-csrf-secret-0123456789-abcdefghijklmn',
    ALLOWED_ORIGINS: ORIGIN,
    TRUST_PROXY: '0',
    BCRYPT_ROUNDS: '4',
    RATE_LIMIT_MAX: '10000',
    LOGIN_RATE_LIMIT_MAX: '10000',
    ENQUIRY_RATE_LIMIT_MAX: '10000',
    REVIEW_RATE_LIMIT_MAX: '10000',
    ...overrides,
  })
}

export const hasTestDatabase = Boolean(process.env.MONGODB_URI_TEST)
export const SKIP_NOTE = 'Skipped – MongoDB Atlas credentials not configured'
/** Suite title that states clearly why it was skipped. */
export const dbSuite = (title) => (hasTestDatabase ? title : `${title} (${SKIP_NOTE})`)

/** Connects to the Atlas test database and empties it before and after the file's tests. */
export function useTestDatabase(config) {
  beforeAll(async () => {
    if (!config.db.dbName.endsWith('_test')) {
      throw new Error(`Refusing to run: MONGODB_DB_TEST must end with "_test" (got "${config.db.dbName}").`)
    }
    await connectDatabase(config.db)
    await mongoose.connection.dropDatabase()
    for (const model of Object.values(models).filter((m) => typeof m?.syncIndexes === 'function')) await model.syncIndexes()
  })
  afterAll(async () => {
    // Skip cleanup if the connection never opened, so the original connection error is the one reported.
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase()
    await disconnectDatabase()
  })
}

export async function createUserRecord(config, { name = 'Test User', email, password = 'Password123', role = 'editor', active = true }) {
  return models.User.create({ name, email, passwordHash: await hashPassword(password, config.auth.bcryptRounds), role, active })
}

/** Logs in through the API. Returns a supertest agent holding the session cookie, plus the CSRF token. */
export async function signIn(app, email, password = 'Password123') {
  const agent = request.agent(app)
  const res = await agent.post('/api/auth/login').set('Origin', ORIGIN).send({ email, password })
  if (res.status !== 200) throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`)
  return { agent, csrf: res.body.data.csrfToken, user: res.body.data.user, cookie: res.headers['set-cookie'] }
}

export { createApp, request }
