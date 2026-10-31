import { logAdmin } from '../services/logService.js'
import * as userService from '../services/userService.js'
import { sendData } from '../utils/http.js'

const userEntity = (user) => ({ type: 'user', id: user._id, label: user.name })

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
      const user = await userService.createUser(req.valid.body, config)
      await logAdmin({ actor: req.auth.user, action: 'user.create', entity: userEntity(user), summary: `Role: ${user.role}`, ip: req.ip })
      sendData(res, user, { status: 201 })
    },

    async update(req, res) {
      const { user, changes } = await userService.updateUser(req.valid.params.id, req.valid.body, req.auth.user)
      const permissions = changes.some((c) => c.field === 'role' || c.field === 'active')
      if (changes.length) {
        await logAdmin({ actor: req.auth.user, action: permissions ? 'user.permission_change' : 'user.update', entity: userEntity(user), summary: `Changed: ${changes.map((c) => c.field).join(', ')}`, changes, ip: req.ip })
      }
      sendData(res, user)
    },

    async resetPassword(req, res) {
      await userService.resetUserPassword(req.valid.params.id, req.valid.body.password, config)
      const user = await userService.getUser(req.valid.params.id)
      await logAdmin({ actor: req.auth.user, action: 'user.password_reset', entity: userEntity(user), ip: req.ip })
      sendData(res, { passwordReset: true })
    },

    async remove(req, res) {
      const user = await userService.deleteUser(req.valid.params.id, req.auth.user)
      await logAdmin({ actor: req.auth.user, action: 'user.delete', entity: userEntity(user), ip: req.ip })
      sendData(res, { deleted: true })
    },
  }
}
