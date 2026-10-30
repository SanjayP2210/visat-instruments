import { rateLimit } from 'express-rate-limit'
import { RateLimit } from '../models/RateLimit.js'
import { errors } from '../utils/http.js'

/** express-rate-limit store backed by MongoDB, so limits hold across serverless instances. */
export class MongoRateLimitStore {
  localKeys = false

  constructor(prefix) {
    this.prefix = prefix
  }

  init(options) {
    this.windowMs = options.windowMs
  }

  async increment(key, attempt = 0) {
    const _id = `${this.prefix}:${key}`
    const now = new Date()
    let doc = await RateLimit.findOneAndUpdate({ _id, expiresAt: { $gt: now } }, { $inc: { hits: 1 } }, { new: true })
    if (!doc) {
      try {
        doc = await RateLimit.findOneAndUpdate(
          { _id },
          { $set: { hits: 1, expiresAt: new Date(now.getTime() + this.windowMs) } },
          { new: true, upsert: true },
        )
      } catch (err) {
        if (err.code === 11000 && attempt < 2) return this.increment(key, attempt + 1) // concurrent first hit
        throw err
      }
    }
    return { totalHits: doc.hits, resetTime: doc.expiresAt }
  }

  async decrement(key) {
    await RateLimit.updateOne({ _id: `${this.prefix}:${key}`, hits: { $gt: 0 } }, { $inc: { hits: -1 } })
  }

  async resetKey(key) {
    await RateLimit.deleteOne({ _id: `${this.prefix}:${key}` })
  }
}

export function createRateLimiter(name, { windowMs, limit, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    store: new MongoRateLimitStore(name),
    handler: (_req, _res, next) => next(errors.tooManyRequests()),
  })
}
