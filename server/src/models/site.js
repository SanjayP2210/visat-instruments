// Customer enquiries, editable website content and SEO settings.
import mongoose from 'mongoose'
import { cleanJson, imageSchema } from './shared.js'

/* ---------- Enquiry ---------- */
export const ENQUIRY_STATUSES = Object.freeze(['new', 'in-progress', 'resolved', 'closed'])
export const ENQUIRY_TYPES = Object.freeze(['general', 'product', 'service'])

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    interest: { type: String, trim: true, maxlength: 200, default: '' },
    type: { type: String, enum: ENQUIRY_TYPES, default: 'general' },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [function requiresProduct() { return this.type === 'product' }, 'Choose the product for a product enquiry.'],
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [function requiresService() { return this.type === 'service' }, 'Choose the service for a service enquiry.'],
    },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new' },
    notes: { type: String, trim: true, maxlength: 3000, default: '' },
    source: { type: String, trim: true, maxlength: 40, default: 'contact-form' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
enquirySchema.pre('validate', function linkMatchesType() {
  // Keep references consistent with the enquiry type.
  if (this.type !== 'product') this.product = undefined
  if (this.type !== 'service') this.service = undefined
})
enquirySchema.index({ status: 1, createdAt: -1 })
enquirySchema.index({ type: 1, createdAt: -1 })
enquirySchema.index({ createdAt: -1 })
enquirySchema.index({ name: 'text', phone: 'text', email: 'text', message: 'text' })
cleanJson(enquirySchema)
export const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema)

/* ---------- Site content ---------- */
// One document per editable section (e.g. "home", "about", "weighbridge", "contact").
// `data` holds the section's structured fields; each section's shape is validated by the API.
const siteContentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, unique: true, match: /^[a-z0-9-]+$/ },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    published: { type: Boolean, default: false }, // hidden until confirmed and published
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, minimize: false },
)
cleanJson(siteContentSchema)
export const SiteContent = mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema)

/* ---------- Testimonial / customer review ---------- */
// Customer reviews and testimonials share this model. Reviews submitted on the website arrive as
// "pending"; staff approve or reject them. Only an approved review with recorded consent can be
// published, and only published ones appear on the website.
export const REVIEW_STATUSES = Object.freeze(['pending', 'approved', 'rejected'])
export const REVIEW_SOURCES = Object.freeze(['website', 'google', 'direct', 'other'])

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    location: { type: String, trim: true, maxlength: 120, default: '' },
    serviceReceived: { type: String, trim: true, maxlength: 150, default: '' }, // service/work the review is about
    message: { type: String, required: true, trim: true, maxlength: 1500 },
    rating: { type: Number, min: 1, max: 5 },
    source: { type: String, enum: REVIEW_SOURCES, default: 'direct' },
    sourceUrl: { type: String, trim: true, maxlength: 500, default: '' },
    consentConfirmed: { type: Boolean, default: false },
    status: { type: String, enum: REVIEW_STATUSES, default: 'pending' },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    moderatedAt: { type: Date },
    published: {
      type: Boolean,
      default: false,
      validate: [
        {
          validator(value) {
            return !value || this.consentConfirmed === true
          },
          message: 'Record the customer consent before publishing a review.',
        },
        {
          validator(value) {
            return !value || this.status === 'approved'
          },
          message: 'Approve the review before publishing it.',
        },
      ],
    },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
testimonialSchema.index({ published: 1, sortOrder: 1 })
testimonialSchema.index({ status: 1, createdAt: -1 })
cleanJson(testimonialSchema)
export const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema)

/* ---------- SEO ---------- */
const seoSettingSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true, lowercase: true, maxlength: 60, unique: true, match: /^[a-z0-9-]+$/ },
    title: { type: String, trim: true, maxlength: 70, default: '' },
    description: { type: String, trim: true, maxlength: 170, default: '' },
    keywords: [{ type: String, trim: true, maxlength: 60 }],
    ogImage: { type: imageSchema },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
cleanJson(seoSettingSchema)
export const SeoSetting = mongoose.models.SeoSetting || mongoose.model('SeoSetting', seoSettingSchema)
