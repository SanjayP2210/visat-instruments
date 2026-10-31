import mongoose from 'mongoose'
import { cleanJson } from './shared.js'

// Operational logs and the admin audit trail. Separate collections with their own retention;
// both store only allow-listed, redacted context (see services/logService.js).
const DAY = 24 * 60 * 60
export const LOG_LEVELS = Object.freeze(['info', 'warn', 'error', 'critical'])

const systemLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: LOG_LEVELS, required: true },
    code: { type: String, required: true, maxlength: 60 },
    message: { type: String, maxlength: 500 },
    method: { type: String, maxlength: 10 },
    route: { type: String, maxlength: 200 },
    status: { type: Number },
    requestId: { type: String, maxlength: 40 },
    context: { type: mongoose.Schema.Types.Mixed },
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'system_logs' },
)
systemLogSchema.index({ ts: 1 }, { expireAfterSeconds: 90 * DAY })
systemLogSchema.index({ level: 1, ts: -1 })
systemLogSchema.index({ code: 1, ts: -1 })
cleanJson(systemLogSchema)

const adminActivitySchema = new mongoose.Schema(
  {
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, maxlength: 100 },
      role: { type: String, maxlength: 20 },
    },
    action: { type: String, required: true, maxlength: 60 }, // e.g. "product.update"
    entity: {
      type: { type: String, maxlength: 40 },
      id: { type: String, maxlength: 60 },
      label: { type: String, maxlength: 150 },
    },
    summary: { type: String, maxlength: 300 },
    changes: [{ _id: false, field: { type: String, maxlength: 80 }, from: mongoose.Schema.Types.Mixed, to: mongoose.Schema.Types.Mixed }],
    ip: { type: String, maxlength: 50 }, // truncated (last block removed)
    ts: { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'admin_activity_logs' },
)
adminActivitySchema.index({ ts: 1 }, { expireAfterSeconds: 730 * DAY })
adminActivitySchema.index({ 'actor.id': 1, ts: -1 })
adminActivitySchema.index({ 'entity.type': 1, 'entity.id': 1, ts: -1 })
adminActivitySchema.index({ action: 1, ts: -1 })
cleanJson(adminActivitySchema)

export const SystemLog = mongoose.models.SystemLog || mongoose.model('SystemLog', systemLogSchema)
export const AdminActivityLog = mongoose.models.AdminActivityLog || mongoose.model('AdminActivityLog', adminActivitySchema)
