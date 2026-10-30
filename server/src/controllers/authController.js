import { clearSessionCookie, setSessionCookie } from '../middleware/auth.js'
import * as authService from '../services/authService.js'
import { csrfTokenFor } from '../services/tokenService.js'
import { sendData } from '../utils/http.js'

export function authController(config) {
  return {
    async login(req, res) {
      const { email, password } = req.valid.body
      const result = await authService.login({ email, password, ip: req.ip, userAgent: req.get('user-agent') }, config)
      setSessionCookie(res, result.token, result.expiresAt, config)
      sendData(res, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt })
    },

    async logout(req, res) {
      await authService.logout(req.auth.session._id)
      clearSessionCookie(res, config)
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
      sendData(res, { passwordChanged: true })
    },
  }
}
