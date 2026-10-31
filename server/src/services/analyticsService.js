// First-party website analytics: privacy-conscious ingestion of consented tracking beacons,
// plus the reports and log listings shown in the Admin panel.
import { createHmac } from 'node:crypto'
import { PageView, VisitorEvent, VisitorSession } from '../models/analytics.js'
import { Product } from '../models/catalog.js'
import { AdminActivityLog, SystemLog } from '../models/logs.js'
import { Enquiry, Testimonial } from '../models/site.js'
import { errors } from '../utils/http.js'
import { paginate } from '../utils/listQuery.js'

const TIMEZONE = 'Asia/Kolkata'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_RANGE_DAYS = 366

/* ---------- helpers (exported for tests) ---------- */

/** Coarse device/browser/OS from the user agent. The user agent itself is never stored. */
export function parseUserAgent(ua = '') {
  const bot = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|axios|node-fetch/i.test(ua) || !ua
  const device = /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'mobile' : 'desktop'
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /opr\/|opera/i.test(ua)
      ? 'Opera'
      : /samsungbrowser/i.test(ua)
        ? 'Samsung Internet'
        : /firefox|fxios/i.test(ua)
          ? 'Firefox'
          : /chrome|crios/i.test(ua)
            ? 'Chrome'
            : /safari/i.test(ua)
              ? 'Safari'
              : 'Other'
  const os = /windows/i.test(ua)
    ? 'Windows'
    : /iphone|ipad|ipod/i.test(ua)
      ? 'iOS'
      : /android/i.test(ua)
        ? 'Android'
        : /mac os/i.test(ua)
          ? 'macOS'
          : /cros/i.test(ua)
            ? 'ChromeOS'
            : /linux/i.test(ua)
              ? 'Linux'
              : 'Other'
  return { bot, device, browser, os }
}

/** Keeps only the path (no query string or fragment). Admin pages are never tracked. */
export function cleanPath(raw = '') {
  const path = String(raw).split(/[?#]/)[0].trim().slice(0, 200)
  if (!path.startsWith('/') || path.startsWith('//') || /^\/admin(\/|$)/.test(path)) return null
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

export const productSlugOf = (path) => /^\/products\/([a-z0-9][a-z0-9-]{0,118})$/i.exec(path ?? '')?.[1]?.toLowerCase()

/** Referrer host only; our own site counts as no referrer. */
export function referrerHost(referrer, ownHost) {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase()
    return host && host !== String(ownHost ?? '').replace(/^www\./, '').split(':')[0].toLowerCase() ? host.slice(0, 100) : undefined
  } catch {
    return undefined
  }
}

const istDay = (date = new Date()) => new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10)

/** Anonymous visitor key: keyed hash of IP + user agent + day. Cannot be reversed or linked across days. */
export const visitorKey = (ip, ua, secret, date = new Date()) =>
  createHmac('sha256', secret).update(`visitor|${istDay(date)}|${ip}|${ua}`).digest('hex').slice(0, 20)

/** { from, to } (YYYY-MM-DD, India time, inclusive) → Date range; defaults to the last 30 days. */
export function dateRange({ from, to } = {}) {
  const end = to ? new Date(`${to}T23:59:59.999+05:30`) : new Date(`${istDay()}T23:59:59.999+05:30`)
  const start = from ? new Date(`${from}T00:00:00+05:30`) : new Date(end.getTime() - 30 * DAY_MS + 1)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw errors.validation([{ path: 'from', message: 'Choose a valid date range.' }])
  }
  if (end - start > MAX_RANGE_DAYS * DAY_MS) throw errors.validation([{ path: 'from', message: `The range can be at most ${MAX_RANGE_DAYS} days.` }])
  return { start, end }
}

const daysBetween = ({ start, end }) => {
  const days = []
  for (let t = start.getTime(); t <= end.getTime(); t += DAY_MS) days.push(istDay(new Date(t)))
  return [...new Set(days)]
}

const countBy = (Model, match, field, limit = 10) =>
  Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: limit }]).then((rows) =>
    rows.map((r) => ({ name: r._id ?? 'Unknown', count: r.count })),
  )

const perDay = (Model, match, field) =>
  Model.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: TIMEZONE } }, count: { $sum: 1 } } }]).then(
    (rows) => new Map(rows.map((r) => [r._id, r.count])),
  )

async function withProductNames(rows) {
  const products = await Product.find({ slug: { $in: rows.map((r) => r.name) } }).select('name slug')
  const names = new Map(products.map((p) => [p.slug, p.name]))
  return rows.map((r) => ({ slug: r.name, name: names.get(r.name) ?? r.name, count: r.count }))
}

/* ---------- service ---------- */

export function createAnalyticsService(config) {
  return {
    /** Stores one consented tracking batch: at most one session upsert and two inserts. */
    async ingest({ sid, session = {}, events }, req) {
      const ua = req.get('user-agent') ?? ''
      const agent = parseUserAgent(ua)
      if (agent.bot) return { stored: 0 }

      const now = new Date()
      const country = /^[A-Z]{2}$/.test(req.get('x-vercel-ip-country') ?? '') ? req.get('x-vercel-ip-country') : undefined
      const region = country ? (req.get('x-vercel-ip-country-region') ?? '').slice(0, 10) || undefined : undefined

      const pages = []
      const actions = []
      for (const e of events) {
        const path = cleanPath(e.path)
        if (!path) continue
        const product = productSlugOf(path)
        if (e.type === 'page_view') pages.push({ session: sid, path, product, ts: now })
        else actions.push({ session: sid, type: e.type, path, label: e.label?.slice(0, 100), product, device: agent.device, country, ts: now })
      }
      if (!pages.length && !actions.length) return { stored: 0 }

      const referrer = referrerHost(session.referrer, req.get('host'))
      const utm = session.utm ?? {}
      await Promise.all([
        VisitorSession.updateOne(
          { _id: sid },
          {
            $setOnInsert: {
              visitor: visitorKey(req.ip, ua, config.auth.jwtSecret, now),
              startedAt: now,
              landingPath: cleanPath(session.landing) ?? pages[0]?.path,
              referrer,
              source: (utm.source || referrer || 'direct').toLowerCase().slice(0, 100),
              medium: utm.medium?.toLowerCase() || (utm.source ? undefined : referrer ? 'referral' : 'none'),
              campaign: utm.campaign,
              device: agent.device,
              browser: agent.browser,
              os: agent.os,
              country,
              region,
              lang: session.lang,
            },
            $set: { lastSeenAt: now },
            $inc: { pageViews: pages.length, events: actions.length },
          },
          { upsert: true },
        ),
        pages.length && PageView.insertMany(pages, { ordered: false }),
        actions.length && VisitorEvent.insertMany(actions, { ordered: false }),
      ])
      return { stored: pages.length + actions.length }
    },

    async overview(query) {
      const range = dateRange(query)
      const ts = { $gte: range.start, $lte: range.end }
      const [sessions, visitors, pageViews, eventCounts, enquiries, reviews, viewsByDay, sessionsByDay, contactsByDay, topPages, topProducts] = await Promise.all([
        VisitorSession.countDocuments({ startedAt: ts }),
        VisitorSession.aggregate([{ $match: { startedAt: ts } }, { $group: { _id: '$visitor' } }, { $count: 'n' }]).then((r) => r[0]?.n ?? 0),
        PageView.countDocuments({ ts }),
        countBy(VisitorEvent, { ts }, 'type', 20),
        Enquiry.countDocuments({ createdAt: ts }),
        Testimonial.countDocuments({ createdAt: ts, source: 'website' }),
        perDay(PageView, { ts }, 'ts'),
        perDay(VisitorSession, { startedAt: ts }, 'startedAt'),
        perDay(VisitorEvent, { ts, type: { $in: ['whatsapp_click', 'phone_click'] } }, 'ts'),
        countBy(PageView, { ts }, 'path', 8),
        countBy(PageView, { ts, product: { $type: 'string' } }, 'product', 8).then(withProductNames),
      ])
      const events = Object.fromEntries(eventCounts.map((e) => [e.name, e.count]))
      return {
        range: { from: istDay(range.start), to: istDay(range.end) },
        totals: {
          visitors,
          sessions,
          pageViews,
          whatsappClicks: events.whatsapp_click ?? 0,
          phoneClicks: events.phone_click ?? 0,
          enquiries,
          reviews,
        },
        daily: daysBetween(range).map((date) => ({
          date,
          pageViews: viewsByDay.get(date) ?? 0,
          sessions: sessionsByDay.get(date) ?? 0,
          contacts: contactsByDay.get(date) ?? 0,
        })),
        topPages,
        topProducts,
      }
    },

    async audience(query) {
      const range = dateRange(query)
      const started = { startedAt: { $gte: range.start, $lte: range.end } }
      const ts = { ts: { $gte: range.start, $lte: range.end } }
      const [sources, mediums, devices, browsers, os, countries, regions, landingPages, pages, products, engagement] = await Promise.all([
        countBy(VisitorSession, started, 'source', 15),
        countBy(VisitorSession, started, 'medium', 10),
        countBy(VisitorSession, started, 'device'),
        countBy(VisitorSession, started, 'browser'),
        countBy(VisitorSession, started, 'os'),
        countBy(VisitorSession, started, 'country', 15),
        countBy(VisitorSession, { ...started, country: 'IN' }, 'region', 15),
        countBy(VisitorSession, started, 'landingPath', 15),
        countBy(PageView, ts, 'path', 25),
        countBy(PageView, { ...ts, product: { $type: 'string' } }, 'product', 25).then(withProductNames),
        VisitorSession.aggregate([
          { $match: started },
          { $group: { _id: null, pages: { $avg: '$pageViews' }, seconds: { $avg: { $divide: [{ $subtract: ['$lastSeenAt', '$startedAt'] }, 1000] } }, single: { $sum: { $cond: [{ $lte: ['$pageViews', 1] }, 1, 0] } }, n: { $sum: 1 } } },
        ]).then((r) => r[0]),
      ])
      return {
        range: { from: istDay(range.start), to: istDay(range.end) },
        engagement: {
          pagesPerSession: Math.round((engagement?.pages ?? 0) * 10) / 10,
          avgSessionSeconds: Math.round(engagement?.seconds ?? 0),
          singlePageRate: engagement?.n ? Math.round((engagement.single / engagement.n) * 100) : 0,
        },
        sources,
        mediums,
        devices,
        browsers,
        os,
        countries,
        regions,
        landingPages,
        pages,
        products,
      }
    },

    listEvents(query) {
      const { start, end } = dateRange(query)
      return paginate(VisitorEvent, query, { searchFields: ['path', 'label', 'product'], filterFields: ['type'], baseFilter: { ts: { $gte: start, $lte: end } } })
    },

    listSystemLogs(query) {
      const { start, end } = dateRange(query)
      return paginate(SystemLog, query, { searchFields: ['code', 'message', 'route'], filterFields: ['level'], baseFilter: { ts: { $gte: start, $lte: end } } })
    },

    listAdminActivity(query) {
      const { start, end } = dateRange(query)
      const baseFilter = { ts: { $gte: start, $lte: end } }
      if (query.entityType) baseFilter['entity.type'] = query.entityType
      return paginate(AdminActivityLog, query, { searchFields: ['action', 'actor.name', 'entity.label', 'summary'], filterFields: ['action'], baseFilter })
    },
  }
}
