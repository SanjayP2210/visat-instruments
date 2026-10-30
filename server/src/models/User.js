import mongoose from 'mongoose'
import { cleanJson } from './shared.js'

export const ROLES = Object.freeze({ ADMIN: 'admin', EDITOR: 'editor' })

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.EDITOR, index: true },
    active: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    failedLoginCount: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true },
)

userSchema.index({ name: 'text', email: 'text' })
cleanJson(userSchema, ['passwordHash', 'failedLoginCount', 'lockUntil'])

export const User = mongoose.models.User || mongoose.model('User', userSchema)
