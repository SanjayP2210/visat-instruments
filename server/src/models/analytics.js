import mongoose from 'mongoose'
import { cleanJson } from './shared.js'

// First-party website analytics, recorded only after the visitor consents. No cookies, raw IPs,
// full user agents or form contents are stored. Kept separate from the admin audit log.
export const ANALYTICS_RETENTION_DAYS = 395 // ~13 months
const ttl = ANALYTICS_RETENTION_DAYS * 24 * 60 * 60

export const EVENT_TYPES = Object.freeze(['whatsapp_click', 'phone_click', 'email_click', 'enquiry_submit', 'review_submit'])

const visitorSessionSchema = new mongoose.Schema(
  {
    _id: { type: String }, // random per-tab session ID from the browser
    visitor: { type: String, required: true }, // keyed hash of IP + browser; rotates daily, cannot be reversed
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    landingPath: { type: String, maxlength: 200 },
    referrer: { type: String, maxlength: 100 }, // host only
    source: { type: String, maxlength: 100 }, // utm_source, else referrer host, else "direct"
    medium: { type: String, maxlength: 50 },
    campaign: { type: String, maxlength: 100 },
    device: { type: String, maxlength: 20 },
    browser: { type: String, maxlength: 30 },
    os: { type: String, maxlength: 30 },
    country: { type: String, maxlength: 2 },
    region: { type: String, maxlength: 10 },
    lang: { type: String, maxlength: 5 },
    pageViews: { type: Number, default: 0 },
    events: { type: Number, default: 0 },
  },
  { versionKey: false, collection: 'visitor_sessions' },
)
visitorSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: ttl })
visitorSessionSchema.index({ source: 1, startedAt: -1 })

const pageViewSchema = new mongoose.Schema(
  {
    session: { type: String, required: true },
    path: { type: String, required: true, maxlength: 200 },
    product: { type: String, maxlength: 120 }, // product slug for /products/:slug
    ts: { type: Date, required: true },
  },
  { versionKey: false, collection: 'page_views' },
)
pageViewSchema.index({ ts: 1 }, { expireAfterSeconds: ttl })
pageViewSchema.index({ path: 1, ts: -1 })
pageViewSchema.index({ product: 1, ts: -1 }, { partialFilterExpression: { product: { $type: 'string' } } })

const visitorEventSchema = new mongoose.Schema(
  {
    session: { type: String, required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    path: { type: String, maxlength: 200 },
    label: { type: String, maxlength: 100 },
    product: { type: String, maxlength: 120 },
    device: { type: String, maxlength: 20 },
    country: { type: String, maxlength: 2 },
    ts: { type: Date, required: true },
  },
  { versionKey: false, collection: 'visitor_events' },
)
visitorEventSchema.index({ ts: 1 }, { expireAfterSeconds: ttl })
visitorEventSchema.index({ type: 1, ts: -1 })

cleanJson(pageViewSchema)
cleanJson(visitorEventSchema)

export const VisitorSession = mongoose.models.VisitorSession || mongoose.model('VisitorSession', visitorSessionSchema)
export const PageView = mongoose.models.PageView || mongoose.model('PageView', pageViewSchema)
export const VisitorEvent = mongoose.models.VisitorEvent || mongoose.model('VisitorEvent', visitorEventSchema)
