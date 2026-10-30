import { z } from 'zod'

const csv = z
  .string()
  .default('')
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean))

const bool = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'))

const secret = (name) =>
  z.string({ error: `${name} is required` }).min(32, `${name} must be at least 32 characters`)

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),

    MONGODB_URI: z.string().optional(),
    MONGODB_DB: z.string().min(1).default('visat_dev'),
    MONGODB_URI_TEST: z.string().optional(),
    MONGODB_DB_TEST: z.string().min(1).default('visat_test'),

    JWT_SECRET: secret('JWT_SECRET'),
    CSRF_SECRET: secret('CSRF_SECRET'),
    SESSION_HOURS: z.coerce.number().positive().max(72).default(8),
    COOKIE_SECURE: bool,
    ALLOWED_ORIGINS: csv,
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),

    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_MINUTES: z.coerce.number().positive().default(15),
    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().positive().default(15),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    REVIEW_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),

    CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
    CLOUDINARY_API_KEY: z.string().trim().optional(),
    CLOUDINARY_API_SECRET: z.string().trim().optional(),
    CLOUDINARY_FOLDER: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9_-]*(\/[a-z0-9_-]+)*$/i, 'CLOUDINARY_FOLDER may contain letters, numbers, - _ and /')
      .default('visat-instruments'),
    UPLOAD_MAX_MB: z.coerce.number().positive().max(10).default(5),

    INITIAL_ADMIN_NAME: z.string().optional(),
    INITIAL_ADMIN_EMAIL: z.string().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().optional(),
  })
  .refine((c) => c.JWT_SECRET !== c.CSRF_SECRET, { message: 'JWT_SECRET and CSRF_SECRET must be different', path: ['CSRF_SECRET'] })

export class ConfigError extends Error {}

/** Parses and validates configuration. Throws a readable ConfigError listing every problem. */
export function loadConfig(env = process.env) {
  const result = schema.safeParse(env)
  if (!result.success) {
    const problems = result.error.issues.map((i) => `- ${i.path.join('.') || 'config'}: ${i.message}`).join('\n')
    throw new ConfigError(`Invalid server configuration:\n${problems}`)
  }
  const e = result.data
  const isProduction = e.NODE_ENV === 'production'
  const isTest = e.NODE_ENV === 'test'
  const db = isTest ? { uri: e.MONGODB_URI_TEST, dbName: e.MONGODB_DB_TEST } : { uri: e.MONGODB_URI, dbName: e.MONGODB_DB }

  return Object.freeze({
    env: e.NODE_ENV,
    isProduction,
    port: e.PORT,
    db: Object.freeze({ ...db, configured: Boolean(db.uri) }),
    auth: Object.freeze({
      jwtSecret: e.JWT_SECRET,
      csrfSecret: e.CSRF_SECRET,
      sessionHours: e.SESSION_HOURS,
      cookieSecure: e.COOKIE_SECURE ?? isProduction,
      bcryptRounds: e.BCRYPT_ROUNDS,
      loginMaxAttempts: e.LOGIN_MAX_ATTEMPTS,
      loginLockMinutes: e.LOGIN_LOCK_MINUTES,
    }),
    http: Object.freeze({ allowedOrigins: e.ALLOWED_ORIGINS, trustProxy: e.TRUST_PROXY }),
    rateLimit: Object.freeze({
      windowMs: e.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
      max: e.RATE_LIMIT_MAX,
      loginMax: e.LOGIN_RATE_LIMIT_MAX,
      enquiryMax: e.ENQUIRY_RATE_LIMIT_MAX,
      reviewMax: e.REVIEW_RATE_LIMIT_MAX,
    }),
    media: Object.freeze({
      configured: [e.CLOUDINARY_CLOUD_NAME, e.CLOUDINARY_API_KEY, e.CLOUDINARY_API_SECRET].every((v) => v && !/^<.*>$/.test(v)),
      cloudName: e.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: e.CLOUDINARY_API_KEY ?? '',
      apiSecret: e.CLOUDINARY_API_SECRET ?? '',
      folder: e.CLOUDINARY_FOLDER,
      maxBytes: Math.round(e.UPLOAD_MAX_MB * 1024 * 1024),
    }),
    initialAdmin: Object.freeze({
      name: e.INITIAL_ADMIN_NAME,
      email: e.INITIAL_ADMIN_EMAIL,
      password: e.INITIAL_ADMIN_PASSWORD,
    }),
  })
}
