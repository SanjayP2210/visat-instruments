// User and role management (Admin only). Guards against locking everyone out.
import { ROLES, User } from '../models/User.js'
import { errors } from '../utils/http.js'
import { paginate } from '../utils/listQuery.js'
import { revokeUserSessions } from './authService.js'
import { hashPassword } from './passwordService.js'

export function listUsers(query) {
  return paginate(User, query, { searchFields: ['name', 'email'], filterFields: ['role', 'active'] })
}

export async function getUser(id) {
  const user = await User.findById(id)
  if (!user) throw errors.notFound('User not found.')
  return user
}

export async function createUser({ name, email, password, role }, config) {
  if (await User.exists({ email })) throw errors.conflict('A user with this email already exists.', [{ path: 'email', message: 'Already in use.' }])
  const passwordHash = await hashPassword(password, config.auth.bcryptRounds)
  return User.create({ name, email, passwordHash, role, passwordChangedAt: new Date() })
}

async function assertAnotherActiveAdmin(userId) {
  const others = await User.countDocuments({ role: ROLES.ADMIN, active: true, _id: { $ne: userId } })
  if (others === 0) throw errors.conflict('At least one active Admin is required.')
}

export async function updateUser(id, changes, actor) {
  const user = await getUser(id)
  const self = String(user._id) === String(actor._id)
  const losesAdmin = user.role === ROLES.ADMIN && user.active && (changes.role === ROLES.EDITOR || changes.active === false)

  if (self && (changes.role === ROLES.EDITOR || changes.active === false)) {
    throw errors.conflict('You cannot remove your own Admin access or deactivate yourself.')
  }
  if (losesAdmin) await assertAnotherActiveAdmin(user._id)
  if (changes.email && changes.email !== user.email && (await User.exists({ email: changes.email }))) {
    throw errors.conflict('A user with this email already exists.', [{ path: 'email', message: 'Already in use.' }])
  }

  const permissionsChanged = (changes.role && changes.role !== user.role) || changes.active === false
  Object.assign(user, changes)
  await user.save()
  if (permissionsChanged) await revokeUserSessions(user._id) // take effect immediately
  return user
}

export async function resetUserPassword(id, password, config) {
  const user = await getUser(id)
  await User.updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(password, config.auth.bcryptRounds), passwordChangedAt: new Date(), failedLoginCount: 0 }, $unset: { lockUntil: 1 } },
  )
  await revokeUserSessions(user._id)
}

export async function deleteUser(id, actor) {
  const user = await getUser(id)
  if (String(user._id) === String(actor._id)) throw errors.conflict('You cannot delete your own account.')
  if (user.role === ROLES.ADMIN && user.active) await assertAnotherActiveAdmin(user._id)
  await revokeUserSessions(user._id)
  await user.deleteOne()
}
