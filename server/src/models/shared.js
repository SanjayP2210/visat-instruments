import mongoose from 'mongoose'

// Image stored on Cloudinary (publicId set) or shipped with the site (url like /images/..., publicId empty).
export const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 1000 },
    publicId: { type: String, trim: true, maxlength: 300, default: '' },
    alt: { type: String, trim: true, maxlength: 300, default: '' },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    bytes: { type: Number, min: 0 },
    format: { type: String, trim: true, maxlength: 10 },
    fit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
  },
  { _id: true },
)

// Sub-documents (product images etc.) are addressed by id in the API.
cleanJson(imageSchema)

// SEO fields shared by pages (SeoSetting), products and services.
export const seoSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    keywords: [{ type: String, trim: true, maxlength: 60 }],
    ogImage: { type: imageSchema },
  },
  { _id: false },
)

export const slugField = {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  maxlength: 120,
  match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'],
}

// API output: `id` instead of `_id`, no internal fields.
export function cleanJson(schema, hidden = []) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id)
      delete ret._id
      for (const field of hidden) delete ret[field]
      return ret
    },
  })
}
