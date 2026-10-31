// System logs and the admin audit trail. Writing a log never throws and never waits for a
// database that is down; failures fall back to the console. Writes are awaited (one insert)
// rather than fire-and-forget, because a serverless function may be frozen after it responds.
import mongoose from 'mongoose'
import { AdminActivityLog, SystemLog } from '../models/logs.js'

const SECRET_KEY = /pass(word)?|token|secret|cookie|authorization|session|csrf|jwt|api[-_]?key|hash/i
const PERSONAL_KEY = /^(email|phone|mobile|whatsapp|address|message|ip)$/i
const MAX_DEPTH = 3

/** Removes secrets and personal data, and caps size. Safe for any value. */
export function redact(value, depth = 0) {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value
  if (typeof value !== 'object') return value
  if (value instanceof Date) return value
  if (value._bsontype) return String(value) // ObjectId
  if (depth >= MAX_DEPTH) return '[…]'
  if (Array.isArray(value)) return value.slice(0, 10).map((v) => redact(v, depth + 1))
  const out = {}
  for (const [key, v] of Object.entries(value).slice(0, 20)) {
    out[key] = SECRET_KEY.test(key) || PERSONAL_KEY.test(key) ? '[redacted]' : redact(v, depth + 1)
  }
  return out
}

/** "203.0.113.42" → "203.0.113.x", IPv6 keeps the first 3 groups. */
export function truncateIp(ip = '') {
  const v4 = String(ip).replace(/^::ffff:/, '')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, '.x')
  return String(ip).split(':').slice(0, 3).join(':') + (ip ? ':x' : '')
}

const dbReady = () => mongoose.connection.readyState === 1

/* ---------- system logs ---------- */

// The same error repeating (e.g. a broken integration) is written at most once a minute per instance.
const THROTTLE_MS = 60 * 1000
const recent = new Map()
function throttled(key) {
  const now = Date.now()
  const last = recent.get(key)
  if (last && now - last < THROTTLE_MS) return true
  if (recent.size > 500) recent.clear()
  recent.set(key, now)
  return false
}

/**
 * @param entry  { level, code, message, req?, status?, context? }
 */
export async function logSystem({ level = 'error', code, message = '', req, status, context }) {
  const doc = {
    level,
    code: String(code || 'UNKNOWN').slice(0, 60),
    message: String(message).slice(0, 500),
    method: req?.method,
    route: req ? String(req.originalUrl || req.url || '').split('?')[0].slice(0, 200) : undefined,
    status,
    requestId: req?.id,
    context: context ? redact(context) : undefined,
  }
  const consoleLine = `[${doc.level}] ${doc.code}${doc.route ? ` ${doc.method} ${doc.route}` : ''}: ${doc.message}`
  if (level === 'warn' || level === 'info') console.warn(consoleLine)
  else console.error(consoleLine)

  if (!dbReady() || throttled(`${doc.code}|${doc.route}|${doc.message}`)) return
  try {
    await SystemLog.create(doc)
  } catch (err) {
    console.error('Could not write system log:', err.message)
  }
}

/* ---------- admin activity ---------- */

// Values recorded for these fields; for any other changed field only its name is recorded.
const VALUE_FIELDS = new Set([
  'active', 'published', 'status', 'featured', 'role', 'showOnWebsite', 'kind', 'type', 'slot', 'sortOrder',
  'pricing.type', 'pricing.originalPrice', 'pricing.sellingPrice', 'pricing.gst', 'pricing.gstRate', 'pricing.availability',
])
const IGNORED_FIELDS = new Set(['updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'moderatedBy', 'moderatedAt', 'handledBy', '__v'])

const plain = (v) => (v?._bsontype ? String(v) : v)

/**
 * Describes what changed on a Mongoose document. Call before save().
 * Returns [{ field, from?, to? }] (values only for allow-listed, non-sensitive fields).
 */
export function changesOf(doc, before = {}) {
  const fields = doc
    .modifiedPaths({ includeChildren: false })
    .filter((p) => !IGNORED_FIELDS.has(p) && !SECRET_KEY.test(p))
    // keep the most specific paths only ("pricing" is dropped when "pricing.sellingPrice" is present)
    .filter((p, _i, all) => !all.some((o) => o !== p && o.startsWith(`${p}.`)))
  return fields.slice(0, 30).map((field) =>
    VALUE_FIELDS.has(field) ? { field, from: plain(before[field]), to: plain(doc.get(field)) } : { field },
  )
}

/** Snapshot of the allow-listed values, to pass to changesOf() after doc.set(). */
export function valuesOf(doc) {
  const out = {}
  for (const field of VALUE_FIELDS) {
    const v = doc.get?.(field)
    if (v !== undefined) out[field] = plain(v)
  }
  return out
}

export const labelOf = (doc) => String(doc?.name ?? doc?.title ?? doc?.key ?? doc?.page ?? doc?.email ?? '').slice(0, 150)

/**
 * @param entry  { actor, action, entity: { type, id, label }, summary?, changes?, ip? }
 */
export async function logAdmin({ actor, action, entity = {}, summary, changes, ip }) {
  if (!dbReady()) return
  try {
    await AdminActivityLog.create({
      actor: actor ? { id: actor._id ?? actor.id, name: actor.name, role: actor.role } : undefined,
      action,
      entity: { type: entity.type, id: entity.id ? String(entity.id) : undefined, label: entity.label },
      summary: summary?.slice(0, 300),
      changes: changes?.length ? changes : undefined,
      ip: ip ? truncateIp(ip) : undefined,
    })
  } catch (err) {
    console.error('Could not write admin activity log:', err.message)
  }
}
