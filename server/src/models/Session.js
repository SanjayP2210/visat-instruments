import mongoose from 'mongoose'

// Server-side record of each login. The JWT carries only the session ID (jti);
// deleting the record (logout, password change, role change) revokes the token.
const sessionSchema = new mongoose.Schema(
  {
    _id: { type: String }, // jti
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true },
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 300 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // MongoDB removes expired sessions

export const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema)
