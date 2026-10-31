import mongoose from 'mongoose'
import { cleanJson, imageSchema, localizedField } from './shared.js'

const phoneSchema = new mongoose.Schema(
  {
    display: { type: String, trim: true, maxlength: 30, default: '' }, // "+91 98799 92228"
    tel: { type: String, trim: true, maxlength: 20, default: '' }, // "+919879992228"
  },
  { _id: false },
)

const ownerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, trim: true, maxlength: 60, default: 'Co-Owner' },
  intro: { type: String, trim: true, maxlength: 1000, default: '' },
  phone: { type: phoneSchema, default: () => ({}) },
  whatsappNumber: { type: String, trim: true, maxlength: 20, default: '' }, // digits only, e.g. 919879992228
  photo: { type: imageSchema },
  sortOrder: { type: Number, default: 0 },
  gu: localizedField,
})
cleanJson(ownerSchema)

const hoursSchema = new mongoose.Schema(
  {
    day: { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], required: true },
    open: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '09:30' },
    close: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '19:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
)

// Business contact number. `dialNumber` is E.164 (used for tel: and WhatsApp links);
// `displayNumber` is how it is shown and must contain the same digits.
const DIAL_NUMBER = /^\+[1-9]\d{7,14}$/
const DISPLAY_NUMBER = /^\+?[\d\s()-]{8,25}$/
const digitsOf = (value) => String(value ?? '').replace(/\D/g, '')

const contactNumberSchema = new mongoose.Schema({
  label: { type: String, trim: true, maxlength: 40, default: 'Mobile' },
  person: { type: String, trim: true, maxlength: 100, default: '' },
  displayNumber: {
    type: String,
    required: [true, 'Display number is required.'],
    trim: true,
    match: [DISPLAY_NUMBER, 'Enter the number using digits, spaces, brackets or hyphens, e.g. +91 98799 92228.'],
  },
  dialNumber: {
    type: String,
    required: [true, 'Dial number is required.'],
    trim: true,
    match: [DIAL_NUMBER, 'Use international format with no spaces, e.g. +919879992228.'],
  },
  isWhatsApp: { type: Boolean, default: false },
  isPrimary: { type: Boolean, default: false },
})

contactNumberSchema.path('displayNumber').validate(function matchesDial(display) {
  return !this.dialNumber || digitsOf(display) === digitsOf(this.dialNumber)
}, 'Display number and dial number must be the same number.')

cleanJson(contactNumberSchema)

const hasNoDuplicateNumbers = (list) => new Set(list.map((c) => c.dialNumber)).size === list.length
const hasOnePrimary = (list) => list.length === 0 || list.filter((c) => c.isPrimary).length === 1

// Initial business contact numbers (from the business's promotional material).
// The primary entry can be changed in the admin panel.
export const DEFAULT_CONTACT_NUMBERS = Object.freeze([
  { label: 'Mobile', person: 'Mahesh Solanki', displayNumber: '+91 98799 92228', dialNumber: '+919879992228', isWhatsApp: true, isPrimary: true },
  { label: 'Mobile', person: 'Manish Solanki', displayNumber: '+91 99138 13861', dialNumber: '+919913813861', isWhatsApp: true, isPrimary: false },
])

// Supported social media platforms. No profile links are preset: they are entered in the admin panel.
export const SOCIAL_PLATFORMS = Object.freeze(['facebook', 'instagram', 'youtube', 'linkedin'])

const socialSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true, trim: true, lowercase: true, maxlength: 40 },
    url: { type: String, trim: true, maxlength: 500, default: '' },
    enabled: { type: Boolean, default: false },
  },
  { _id: false },
)

// Single document (key "main") holding the business identity and contact details.
const businessProfileSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true, immutable: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, trim: true, maxlength: 120, default: '' },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    contactPerson: { type: String, trim: true, maxlength: 100, default: '' },
    contactNumbers: {
      type: [contactNumberSchema],
      default: () => DEFAULT_CONTACT_NUMBERS.map((c) => ({ ...c })),
      validate: [
        { validator: (list) => list.length <= 10, message: 'At most 10 contact numbers.' },
        { validator: hasNoDuplicateNumbers, message: 'Each contact number can only be listed once.' },
        { validator: hasOnePrimary, message: 'Mark exactly one contact number as primary.' },
      ],
    },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    address: {
      lines: [{ type: String, trim: true, maxlength: 200 }],
      city: { type: String, trim: true, maxlength: 80, default: '' },
      state: { type: String, trim: true, maxlength: 80, default: '' },
      pincode: { type: String, trim: true, maxlength: 12, default: '' },
      country: { type: String, trim: true, maxlength: 80, default: 'India' },
    },
    mapsUrl: { type: String, trim: true, maxlength: 1000, default: '' },
    openingHours: [hoursSchema],
    socialLinks: [socialSchema],
    rating: {
      value: { type: Number, min: 0, max: 5 },
      count: { type: Number, min: 0 },
      source: { type: String, trim: true, maxlength: 40, default: 'Google' },
    },
    owners: [ownerSchema],
    primaryBrand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    gu: localizedField,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

businessProfileSchema.virtual('primaryContact').get(function primaryContact() {
  return this.contactNumbers?.find((c) => c.isPrimary) ?? null
})

cleanJson(businessProfileSchema)

export const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', businessProfileSchema)
