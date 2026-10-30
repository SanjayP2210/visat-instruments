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
      await service.remove(req.valid.params.id)
      sendData(res, { deleted: true })
    },
  }
}

/** Wraps a handler body: `fn(req)` returns the data to send. */
export const respond = (fn, status = 200) => async (req, res) => sendData(res, await fn(req), { status })

export const uploaded = (req) => req.files ?? []
export const firstFile = (req) => (req.files ?? [])[0]
