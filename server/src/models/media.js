// Branding & media library (site-wide images) and the Cloudinary cleanup queue.
import mongoose from 'mongoose'
import { cleanJson, imageSchema } from './shared.js'

// Site-wide image slots. Single slots hold one image (uploading replaces it);
// multiple slots hold an ordered list.
export const ASSET_SLOTS = Object.freeze({
  logo: { multiple: false, label: 'Business logo' },
  favicon: { multiple: false, label: 'Favicon' },
  'header-logo': { multiple: false, label: 'Header logo' },
  'footer-logo': { multiple: false, label: 'Footer logo' },
  'og-default': { multiple: false, label: 'Default social-sharing image' },
  'home-banner': { multiple: true, label: 'Homepage banner' },
  'about-image': { multiple: true, label: 'About Us image' },
})

const siteAssetSchema = new mongoose.Schema(
  {
    slot: { type: String, required: true, enum: Object.keys(ASSET_SLOTS) },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    image: { type: imageSchema, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)
siteAssetSchema.index({ slot: 1, active: 1, sortOrder: 1 })
cleanJson(siteAssetSchema)
export const SiteAsset = mongoose.models.SiteAsset || mongoose.model('SiteAsset', siteAssetSchema)

// Cloudinary files that are no longer referenced but could not be deleted yet
// (e.g. Cloudinary was unreachable). Retried by the media cleanup endpoint/script.
const mediaCleanupSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true, unique: true, trim: true, maxlength: 300 },
    reason: { type: String, trim: true, maxlength: 200, default: '' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true },
)
cleanJson(mediaCleanupSchema)
export const MediaCleanup = mongoose.models.MediaCleanup || mongoose.model('MediaCleanup', mediaCleanupSchema)
