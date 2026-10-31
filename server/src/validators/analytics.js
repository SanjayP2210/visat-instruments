import { z } from 'zod'
import { EVENT_TYPES } from '../models/analytics.js'
import { LOG_LEVELS } from '../models/logs.js'
import { listQuery } from './common.js'

const short = (max) => z.string().trim().max(max)

/* ---------- public tracking beacon (sent only after analytics consent) ---------- */
export const trackBody = z
  .object({
    sid: z.string().regex(/^[A-Za-z0-9_-]{16,40}$/),
    session: z
      .object({
        landing: short(300).optional(),
        referrer: short(500).optional(),
        utm: z.object({ source: short(100).optional(), medium: short(50).optional(), campaign: short(100).optional() }).strict().optional(),
        lang: z.enum(['en', 'gu']).optional(),
      })
      .strict()
      .optional(),
    events: z
      .array(z.object({ type: z.enum(['page_view', ...EVENT_TYPES]), path: short(300), label: short(100).optional() }).strict())
      .min(1)
      .max(20),
  })
  .strict()

/* ---------- admin reports ---------- */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.')
const range = { from: day.optional(), to: day.optional() }

export const reportQuery = z.object(range).strict()

export const eventList = listQuery({ sortFields: ['ts', 'type'], defaultSort: '-ts', filters: { ...range, type: z.enum(EVENT_TYPES).optional() } })

export const systemLogList = listQuery({ sortFields: ['ts', 'level', 'code'], defaultSort: '-ts', filters: { ...range, level: z.enum(LOG_LEVELS).optional() } })

export const adminActivityList = listQuery({
  sortFields: ['ts', 'action'],
  defaultSort: '-ts',
  filters: { ...range, action: short(60).optional(), entityType: z.string().regex(/^[a-z_]{1,40}$/).optional() },
})
