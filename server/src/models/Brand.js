import mongoose from 'mongoose'
import { cleanJson, imageSchema, slugField } from './shared.js'

// How VISAT INSTRUMENTS relates to a brand. Stays "unconfirmed" until the business confirms it;
// the website must not describe ownership or manufacturing for an unconfirmed brand.
export const BRAND_RELATIONSHIPS = Object.freeze(['unconfirmed', 'own-brand', 'manufacturer', 'authorised-dealer', 'distributor'])

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { ...slugField, unique: true },
    logo: { type: imageSchema },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    relationship: { type: String, enum: BRAND_RELATIONSHIPS, default: 'unconfirmed' },
    showRegisteredMark: { type: Boolean, default: false }, // show "®" after the name
    showOnWebsite: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

brandSchema.virtual('displayName').get(function displayName() {
  return `${this.name}${this.showRegisteredMark ? '®' : ''}`
})

brandSchema.index({ showOnWebsite: 1, sortOrder: 1 })
cleanJson(brandSchema)

export const Brand = mongoose.models.Brand || mongoose.model('Brand', brandSchema)
