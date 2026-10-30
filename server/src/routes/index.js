import { Router } from 'express'
import { connectDatabase, databaseState } from '../config/database.js'
import { authController } from '../controllers/authController.js'
import { userController } from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ensureDatabase, notFound, validate } from '../middleware/common.js'
import { createRateLimiter } from '../middleware/rateLimit.js'
import { originCheck } from '../middleware/security.js'
import { ROLES } from '../models/User.js'
import { sendData } from '../utils/http.js'
import { changePasswordBody, createUserBody, listUsersQuery, loginBody, resetPasswordBody, updateUserBody } from '../validators/auth.js'
import { idParams } from '../validators/common.js'
import { createContentRouter } from './content.js'

export function createApiRouter(config, deps) {
  const router = Router()
  const auth = requireAuth(config)
  const adminOnly = [auth, requireRole(ROLES.ADMIN)]
  const authCtl = authController(config)
  const userCtl = userController(config)

  // Health: works without a database so deployments can be checked.
  router.get('/health', async (_req, res) => {
    let database = 'not-configured'
    if (config.db.configured) {
      database = await connectDatabase(config.db).then(() => databaseState(), () => 'unavailable')
    }
    sendData(res, { status: 'ok', database })
  })

  router.use(originCheck(config))
  router.use(ensureDatabase(config))
  router.use(createRateLimiter('api', { windowMs: config.rateLimit.windowMs, limit: config.rateLimit.max }))

  /* ---------- auth ---------- */
  const loginLimiter = createRateLimiter('login', {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.loginMax,
    skipSuccessfulRequests: true,
  })
  router.post('/auth/login', loginLimiter, validate({ body: loginBody }), authCtl.login)
  router.post('/auth/logout', auth, authCtl.logout)
  router.get('/auth/me', auth, authCtl.me)
  router.patch('/auth/password', auth, validate({ body: changePasswordBody }), authCtl.changePassword)

  /* ---------- users (Admin only) ---------- */
  router.get('/users', ...adminOnly, validate({ query: listUsersQuery }), userCtl.list)
  router.post('/users', ...adminOnly, validate({ body: createUserBody }), userCtl.create)
  router.get('/users/:id', ...adminOnly, validate({ params: idParams }), userCtl.get)
  router.patch('/users/:id', ...adminOnly, validate({ params: idParams, body: updateUserBody }), userCtl.update)
  router.put('/users/:id/password', ...adminOnly, validate({ params: idParams, body: resetPasswordBody }), userCtl.resetPassword)
  router.delete('/users/:id', ...adminOnly, validate({ params: idParams }), userCtl.remove)

  router.use(createContentRouter(config, deps))

  router.use(notFound)
  return router
}
