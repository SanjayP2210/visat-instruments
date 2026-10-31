// Consent-based website analytics. Nothing is tracked, sent or loaded (including Google
// Analytics) until the visitor allows analytics; rejecting or withdrawing stops it again.
// Events are queued and sent in small batches to our own API (POST /api/public/track).
//
// Tracked: page views, WhatsApp/phone/email link clicks, enquiry and review submissions.
// Never sent: form contents, query strings (except utm_*), cookies or anything from /admin.

const CONSENT_KEY = 'vi_analytics_consent' // localStorage: { analytics: boolean, at }
const SID_KEY = 'vi_sid' // sessionStorage: per-tab session ID, removed when consent is withdrawn
const META_KEY = 'vi_sid_meta' // sessionStorage: session details already sent
const GA_ID = (import.meta.env.VITE_GA4_ID ?? '').trim()
const ENDPOINT = '/api/public/track'
const FLUSH_MS = 4000
const MAX_BATCH = 20

const storage = (kind) => {
  try {
    return window[kind]
  } catch {
    return null
  }
}

function readConsent() {
  try {
    const saved = JSON.parse(storage('localStorage')?.getItem(CONSENT_KEY) ?? 'null')
    if (typeof saved?.analytics === 'boolean') return saved.analytics ? 'granted' : 'denied'
  } catch {
    /* ignore malformed value */
  }
  // Global Privacy Control counts as a "no" until the visitor chooses otherwise.
  return typeof navigator !== 'undefined' && navigator.globalPrivacyControl ? 'denied' : null
}

/* ---------- consent state (observable, for the banner) ---------- */
const state = { consent: typeof window === 'undefined' ? null : readConsent(), settingsOpen: false }
const listeners = new Set()
const notify = () => listeners.forEach((fn) => fn({ ...state }))

export const getConsentState = () => ({ ...state })
export function subscribeConsent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export function openConsentSettings() {
  state.settingsOpen = true
  notify()
}
export function closeConsentSettings() {
  state.settingsOpen = false
  notify()
}

export function setAnalyticsConsent(granted) {
  try {
    storage('localStorage')?.setItem(CONSENT_KEY, JSON.stringify({ analytics: granted, at: new Date().toISOString() }))
  } catch {
    /* storage blocked: the choice applies to this page only */
  }
  const wasGranted = state.consent === 'granted'
  state.consent = granted ? 'granted' : 'denied'
  state.settingsOpen = false
  notify()
  if (granted && wasGranted) return // confirming an existing choice changes nothing
  if (granted) {
    startGoogleAnalytics()
    lastPath = null
    trackPageView(window.location.pathname) // count the page the visitor is on
  } else {
    queue.length = 0
    clearTimeout(timer)
    stopGoogleAnalytics()
    storage('sessionStorage')?.removeItem(SID_KEY)
    storage('sessionStorage')?.removeItem(META_KEY)
  }
}

const allowed = () => state.consent === 'granted'

/* ---------- queue and sending ---------- */
const queue = []
let timer
let lastPath = null
const recentClicks = new Map()

function sessionId() {
  const ss = storage('sessionStorage')
  let sid = ss?.getItem(SID_KEY)
  if (!sid) {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    sid = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    ss?.setItem(SID_KEY, sid)
  }
  return sid
}

// Session details (landing page, referrer, campaign) are sent once per session.
const landing = typeof window === 'undefined' ? null : { path: window.location.pathname, search: window.location.search, referrer: document.referrer }

function sessionDetails() {
  const ss = storage('sessionStorage')
  if (ss?.getItem(META_KEY)) return undefined
  ss?.setItem(META_KEY, '1')
  const params = new URLSearchParams(landing.search)
  const utm = Object.fromEntries(
    [['source', 'utm_source'], ['medium', 'utm_medium'], ['campaign', 'utm_campaign']]
      .map(([k, p]) => [k, params.get(p)?.slice(0, k === 'medium' ? 50 : 100)])
      .filter(([, v]) => v),
  )
  const lang = document.documentElement.lang
  return {
    landing: landing.path,
    ...(landing.referrer ? { referrer: landing.referrer.slice(0, 500) } : {}),
    ...(Object.keys(utm).length ? { utm } : {}),
    ...(lang === 'en' || lang === 'gu' ? { lang } : {}),
  }
}

function flush(unloading = false) {
  clearTimeout(timer)
  if (!allowed() || !queue.length) return
  const events = queue.splice(0, MAX_BATCH)
  const session = sessionDetails()
  const body = JSON.stringify({ sid: sessionId(), ...(session ? { session } : {}), events })
  // When the page is being hidden or closed, sendBeacon is the reliable way to deliver.
  // Failures are ignored on purpose: analytics must never affect the visitor.
  const beaconed = unloading && navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))
  if (!beaconed) fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true, credentials: 'same-origin' }).catch(() => {})
  if (queue.length) flush(unloading)
}

function enqueue(event) {
  queue.push(event)
  if (queue.length >= MAX_BATCH) flush()
  else {
    clearTimeout(timer)
    timer = setTimeout(flush, FLUSH_MS)
  }
}

/* ---------- public API ---------- */

/** Records a page view. Repeated calls for the same path (re-renders, StrictMode) are ignored. */
export function trackPageView(path) {
  if (!allowed() || path === lastPath || path.startsWith('/admin')) return
  lastPath = path
  enqueue({ type: 'page_view', path })
  gtagEvent('page_view', { page_path: path, page_location: window.location.origin + path, page_title: document.title })
}

const GA_EVENT_NAMES = { enquiry_submit: 'generate_lead', review_submit: 'review_submit' }

/** Records an interaction: whatsapp_click | phone_click | email_click | enquiry_submit | review_submit. */
export function trackEvent(type, label) {
  if (!allowed()) return
  const path = window.location.pathname
  const key = `${type}|${label}|${path}`
  const now = Date.now()
  if (now - (recentClicks.get(key) ?? 0) < 1500) return // double clicks / duplicate handlers
  recentClicks.set(key, now)
  enqueue({ type, path, ...(label ? { label: String(label).slice(0, 100) } : {}) })
  gtagEvent(GA_EVENT_NAMES[type] ?? type, label ? { link_location: label } : {})
}

function linkType(href) {
  if (href.startsWith('tel:')) return 'phone_click'
  if (href.startsWith('mailto:')) return 'email_click'
  if (/^(https?:\/\/(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/|whatsapp:)/i.test(href)) return 'whatsapp_click'
  return null
}

function onClick(e) {
  const link = e.target instanceof Element ? e.target.closest('a[href]') : null
  if (!link) return
  const type = linkType(link.getAttribute('href') ?? '')
  if (!type) return
  const label = link.dataset.trackLabel || (link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : 'page')
  trackEvent(type, label)
}

let started = false
/** Installs the listeners once. Safe to call repeatedly. */
export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  document.addEventListener('click', onClick, true)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true))
  window.addEventListener('pagehide', () => flush(true))
  if (allowed()) startGoogleAnalytics()
}

/* ---------- Google Analytics 4 (optional, only with consent) ---------- */
let gaLoaded = false

function gtag() {
  window.dataLayer.push(arguments) // gtag.js expects the arguments object
}

function startGoogleAnalytics() {
  if (!GA_ID) return
  window[`ga-disable-${GA_ID}`] = false
  if (gaLoaded) {
    gtag('consent', 'update', { analytics_storage: 'granted' })
    return
  }
  gaLoaded = true
  window.dataLayer = window.dataLayer || []
  // Consent Mode v2: analytics only; advertising storage and personalisation stay denied.
  gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
  gtag('js', new Date())
  gtag('config', GA_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`
  document.head.appendChild(script)
}

function stopGoogleAnalytics() {
  if (!GA_ID) return
  window[`ga-disable-${GA_ID}`] = true
  if (gaLoaded) gtag('consent', 'update', { analytics_storage: 'denied' })
  // Remove GA cookies (_ga, _ga_<id>) on this host and every parent domain GA may have used
  // (e.g. ".visat.co.in" for www.visat.co.in). Browsers ignore invalid domains such as ".co.in".
  const labels = window.location.hostname.split('.')
  const domains = ['', ...labels.slice(0, -1).map((_, i) => `.${labels.slice(i).join('.')}`)]
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n.startsWith('_ga'))) {
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
  }
}

function gtagEvent(name, params) {
  if (GA_ID && gaLoaded && allowed()) gtag('event', name, params)
}
