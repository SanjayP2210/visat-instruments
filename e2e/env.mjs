// Shared e2e settings: the API runs in test mode (Atlas test database) and uploads to a
// separate Cloudinary folder, so development data and images are never touched.
import { existsSync } from 'node:fs'

export const TEST_CLOUDINARY_FOLDER = 'visat-instruments-test'

export function loadTestEnv() {
  if (existsSync('server/.env')) process.loadEnvFile('server/.env')
  process.env.NODE_ENV = 'test'
  process.env.CLOUDINARY_FOLDER = TEST_CLOUDINARY_FOLDER
  process.env.BCRYPT_ROUNDS = '4'
  process.env.RATE_LIMIT_MAX = '10000'
  process.env.LOGIN_RATE_LIMIT_MAX = '10000'
  process.env.ENQUIRY_RATE_LIMIT_MAX = '10000'
  process.env.REVIEW_RATE_LIMIT_MAX = '10000'
  if (!process.env.MONGODB_URI_TEST) throw new Error('MONGODB_URI_TEST is not set in server/.env')
  if (!String(process.env.MONGODB_DB_TEST || 'visat_test').endsWith('_test')) throw new Error('MONGODB_DB_TEST must end with "_test"')
}
