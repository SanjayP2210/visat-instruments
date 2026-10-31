import { labelOf, logAdmin } from '../services/logService.js'
import { sendData } from '../utils/http.js'

/** Standard list/get/create/update/delete handlers for a CRUD service. */
export function crudController(service) {
  return {
    async list(req, res) {
      const { items, meta } = await service.list(req.valid.query)
      sendData(res, items, { meta })
    },
    async get(req, res) {
      sendData(res, await service.get(req.valid.params.id))
    },
    async create(req, res) {
      sendData(res, await service.create(req.valid.body, req.auth.user), { status: 201 })
    },
    async update(req, res) {
      sendData(res, await service.update(req.valid.params.id, req.valid.body, req.auth.user))
    },
    async remove(req, res) {
      await service.remove(req.valid.params.id, req.auth.user)
      sendData(res, { deleted: true })
    },
  }
}

/**
 * Wraps a handler body: `fn(req)` returns the data to send.
 * `audit` ({ action, entity }) records admin activity once the change has succeeded.
 */
export const respond = (fn, status = 200, audit) => async (req, res) => {
  const data = await fn(req)
  if (audit) {
    const { id, key, page, ownerId, imageId } = req.valid?.params ?? {}
    await logAdmin({
      actor: req.auth.user,
      action: audit.action,
      entity: { type: audit.entity, id: id ?? key ?? page ?? ownerId ?? data?._id, label: labelOf(data) || key || page },
      summary: imageId ? `Image ${imageId}` : undefined,
    })
  }
  return sendData(res, data, { status })
}

export const uploaded = (req) => req.files ?? []
export const firstFile = (req) => (req.files ?? [])[0]
