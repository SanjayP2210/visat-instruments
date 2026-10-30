// Login, sessions and password changes. Independent of Express: takes plain values, returns plain values.
import { Session } from '../models/Session.js'
import { User } from '../models/User.js'
import { errors } from '../utils/http.js'
import { burnPasswordCheck, hashPassword, verifyPassword } from './passwordService.js'
import { csrfTokenFor, newSessionId, signSessionToken, verifySessionToken } from './tokenService.js'

const INVALID_LOGIN = 'Incorrect email or password.'

export async function login({ email, password, ip, userAgent }, config) {
  const { auth } = config
  const user = await User.findOne({ email }).select('+passwordHash +failedLoginCount +lockUntil')

  if (!user || !user.active) {
    await burnPasswordCheck(password)
    throw errors.unauthenticated(INVALID_LOGIN)
  }
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw errors.locked('Too many failed sign-in attempts. Try again later.')
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = await User.findOneAndUpdate({ _id: user._id }, { $inc: { failedLoginCount: 1 } }, { new: true }).select('+failedLoginCount')
    if (failed.failedLoginCount >= auth.loginMaxAttempts) {
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLoginCount: 0, lockUntil: new Date(Date.now() + auth.loginLockMinutes * 60 * 1000) } },
      )
    }
    throw errors.unauthenticated(INVALID_LOGIN)
  }

  await User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } })
  const session = await createSession(user._id, { ip, userAgent }, config)
  return { user: await User.findById(user._id), ...session }
}

export async function createSession(userId, { ip, userAgent }, config) {
  const sessionId = newSessionId()
  const expiresAt = new Date(Date.now() + config.auth.sessionHours * 60 * 60 * 1000)
  await Session.create({ _id: sessionId, user: userId, expiresAt, ip: String(ip || '').slice(0, 100), userAgent: String(userAgent || '').slice(0, 300) })
  return {
    token: signSessionToken({ userId, sessionId, expiresAt }, config.auth.jwtSecret),
    csrfToken: csrfTokenFor(sessionId, config.auth.csrfSecret),
    expiresAt,
  }
}

/** Resolves a session token to { user, session } if the session is live and the user active. */
export async function resolveSession(token, config) {
  const claims = token && verifySessionToken(token, config.auth.jwtSecret)
  if (!claims) return null
  const session = await Session.findById(claims.sessionId)
  if (!session || String(session.user) !== claims.userId || session.expiresAt <= new Date()) return null
  const user = await User.findById(session.user)
  if (!user || !user.active) return null
  return { user, session }
}

export function logout(sessionId) {
  return Session.deleteOne({ _id: sessionId })
}

export function revokeUserSessions(userId, { exceptSessionId } = {}) {
  const filter = { user: userId }
  if (exceptSessionId) filter._id = { $ne: exceptSessionId }
  return Session.deleteMany(filter)
}

export async function changeOwnPassword({ userId, sessionId, currentPassword, newPassword }, config) {
  const user = await User.findById(userId).select('+passwordHash')
  if (!user) throw errors.unauthenticated()
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw errors.validation([{ path: 'currentPassword', message: 'Your current password is incorrect.' }])
  }
  user.passwordHash = await hashPassword(newPassword, config.auth.bcryptRounds)
  user.passwordChangedAt = new Date()
  await user.save()
  await revokeUserSessions(userId, { exceptSessionId: sessionId }) // sign out other devices
}
