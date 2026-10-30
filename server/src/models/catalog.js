// Catalogue content: categories, products, services and gallery items.
import mongoose from 'mongoose'
import { cleanJson, imageSchema, seoSchema, slugField } from './shared.js'

const auditFields = {
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}

/* ---------- Category ---------- */
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { ...slugField, unique: true },
    shortName: { type: String, trim: true, maxlength: 40, default: '' },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    icon: { type: String, trim: true, maxlength: 40, default: '' }, // lucide icon name
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    ...auditFields,
  },
  { timestamps: true },
)
categorySchema.index({ active: 1, sortOrder: 1 })
categorySchema.index({ name: 'text', description: 'text' })
cleanJson(categorySchema)
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema)

/* ---------- Product ---------- */
const specificationSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true, maxlength: 100 },
  value: { type: String, required: true, trim: true, maxlength: 300 },
})
cleanJson(specificationSchema)

// Groups products for the spare parts & accessories section.
export const PRODUCT_KINDS = Object.freeze(['system', 'part', 'accessory', 'software', 'instrument'])

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { ...slugField, unique: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    kind: { type: String, enum: PRODUCT_KINDS, default: 'system' },
    summary: { type: String, trim: true, maxlength: 400, default: '' },
    description: { type: String, trim: true, maxlength: 5000, default: '' },
    highlights: [{ type: String, trim: true, maxlength: 200 }],
    specifications: [specificationSchema],
    images: { type: [imageSchema], validate: [(v) => v.length <= 12, 'A product can have at most 12 images.'] },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    ...auditFields,
  },
  { timestamps: true },
)
productSchema.index({ category: 1, active: 1, sortOrder: 1 })
productSchema.index({ kind: 1, active: 1 })
productSchema.index({ brand: 1 })
productSchema.index({ featured: 1, active: 1 })
productSchema.index({ name: 'text', summary: 'text', description: 'text' })
cleanJson(productSchema)
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)

/* ---------- Service ---------- */
const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { ...slugField, unique: true },
    icon: { type: String, trim: true, maxlength: 40, default: '' },
    summary: { type: String, trim: true, maxlength: 400, default: '' },
    details: [{ type: String, trim: true, maxlength: 200 }],
    image: { type: imageSchema },
    status: { type: String, enum: ['confirmed', 'to-be-confirmed'], default: 'to-be-confirmed' },
    active: { type: Boolean, default: true }, // shown on the website
    sortOrder: { type: Number, default: 0 },
    seo: { type: seoSchema, default: () => ({}) },
    ...auditFields,
  },
  { timestamps: true },
)
serviceSchema.index({ active: 1, sortOrder: 1 })
cleanJson(serviceSchema)
export const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema)

/* ---------- Gallery item ---------- */
export const GALLERY_TYPES = Object.freeze(['product', 'installation', 'project', 'promotional'])

const galleryItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    caption: { type: String, trim: true, maxlength: 300, default: '' },
    tag: { type: String, trim: true, maxlength: 40, default: '' },
    type: { type: String, enum: GALLERY_TYPES, default: 'product' },
    location: { type: String, trim: true, maxlength: 150, default: '' }, // only if provided by the business
    relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    image: { type: imageSchema, required: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    ...auditFields,
  },
  { timestamps: true },
)
galleryItemSchema.index({ active: 1, sortOrder: 1 })
galleryItemSchema.index({ tag: 1 })
galleryItemSchema.index({ type: 1, active: 1, sortOrder: 1 })
cleanJson(galleryItemSchema)
export const GalleryItem = mongoose.models.GalleryItem || mongoose.model('GalleryItem', galleryItemSchema)
