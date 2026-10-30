import mongoose from 'mongoose'

// Request counters shared by every serverless instance.
const rateLimitSchema = new mongoose.Schema(
  {
    _id: { type: String }, // "<limiter>:<client key>"
    hits: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
)

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RateLimit = mongoose.models.RateLimit || mongoose.model('RateLimit', rateLimitSchema)
