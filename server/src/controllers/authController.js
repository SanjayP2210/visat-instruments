import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import { logAdmin, logSystem, truncateIp } from '../services/logService.js'
import { csrfTokenFor } from '../services/tokenService.js'
import { ApiError, sendData } from '../utils/http.js'

const authEntity = (user) => ({ type: 'user', id: user._id, label: user.name })

export function authController(config) {
  return {
    async login(req, res) {
      const { email, password } = req.valid.body
      let result
      try {
        result = await authService.login({ email, password, ip: req.ip, userAgent: req.get('user-agent') }, config)
      } catch (err) {
        if (err instanceof ApiError) {
          // The email address is not logged: only that a sign-in failed and from which network.
          await logSystem({ level: 'warn', code: err.status === 423 ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_LOGIN_FAILED', message: err.message, req, status: err.status, context: { network: truncateIp(req.ip) } })
        }
        throw err
      }
      setSessionCookie(res, result.token, result.expiresAt, config)
      await logAdmin({ actor: result.user, action: 'auth.login', entity: authEntity(result.user), ip: req.ip })
      sendData(res, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt })
    },

    async logout(req, res) {
      await authService.logout(req.auth.session._id)
      clearSessionCookie(res, config)
      await logAdmin({ actor: req.auth.user, action: 'auth.logout', entity: authEntity(req.auth.user), ip: req.ip })
      sendData(res, { loggedOut: true })
    },

    me(req, res) {
      const { user, session } = req.auth
      sendData(res, { user, csrfToken: csrfTokenFor(session._id, config.auth.csrfSecret), expiresAt: session.expiresAt })
    },

    async changePassword(req, res) {
      const { currentPassword, newPassword } = req.valid.body
      await authService.changeOwnPassword(
        { userId: req.auth.user._id, sessionId: req.auth.session._id, currentPassword, newPassword },
        config,
      )
      await logAdmin({ actor: req.auth.user, action: 'auth.password_change', entity: authEntity(req.auth.user), ip: req.ip })
      sendData(res, { passwordChanged: true })
    },
  }
}
