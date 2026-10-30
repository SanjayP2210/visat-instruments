import * as userService from '../services/userService.js'
import { sendData } from '../utils/http.js'

export function userController(config) {
  return {
    async list(req, res) {
      const { items, meta } = await userService.listUsers(req.valid.query)
      sendData(res, items, { meta })
    },

    async get(req, res) {
      sendData(res, await userService.getUser(req.valid.params.id))
    },

    async create(req, res) {
      sendData(res, await userService.createUser(req.valid.body, config), { status: 201 })
    },

    async update(req, res) {
      sendData(res, await userService.updateUser(req.valid.params.id, req.valid.body, req.auth.user))
    },

    async resetPassword(req, res) {
      await userService.resetUserPassword(req.valid.params.id, req.valid.body.password, config)
      sendData(res, { passwordReset: true })
    },

    async remove(req, res) {
      await userService.deleteUser(req.valid.params.id, req.auth.user)
      sendData(res, { deleted: true })
    },
  }
}
