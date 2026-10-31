// Website analytics and logs. Every report and log route is Admin only (Editors get 403).
// The public tracking beacon is mounted separately in routes/index.js (before the general limiter).
import { Router } from 'express'
import { respond } from '../controllers/contentController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/common.js'
import { ROLES } from '../models/User.js'
import { sendData } from '../utils/http.js'
import * as v from '../validators/analytics.js'

const list = (fn) => async (req, res) => {
  const { items, meta } = await fn(req.valid.query)
  sendData(res, items, { meta })
}

export function createAnalyticsRouter(config, analytics) {
  const router = Router()
  const adminOnly = [requireAuth(config), requireRole(ROLES.ADMIN)]

  router.get('/analytics/overview', ...adminOnly, validate({ query: v.reportQuery }), respond((req) => analytics.overview(req.valid.query)))
  router.get('/analytics/audience', ...adminOnly, validate({ query: v.reportQuery }), respond((req) => analytics.audience(req.valid.query)))
  router.get('/analytics/events', ...adminOnly, validate({ query: v.eventList }), list(analytics.listEvents))
  router.get('/logs/system', ...adminOnly, validate({ query: v.systemLogList }), list(analytics.listSystemLogs))
  router.get('/logs/admin-activity', ...adminOnly, validate({ query: v.adminActivityList }), list(analytics.listAdminActivity))

  return router
}

/** POST /public/track: consented, batched analytics beacon. Always answers 204 with no body. */
export const trackHandler = (analytics) => async (req, res) => {
  await analytics.ingest(req.valid.body, req)
  res.status(204).end()
}
