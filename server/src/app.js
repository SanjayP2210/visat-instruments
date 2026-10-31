// Builds the Express app. No server is started and nothing here depends on the hosting
// platform: server.js (local) and the Vercel function both wrap this.
import { randomUUID } from 'node:crypto'
import cookieParser from 'cookie-parser'
import express from 'express'
import helmet from 'helmet'
import { errorHandler, notFound } from './middleware/common.js'
import { corsMiddleware } from './middleware/security.js'
import { createApiRouter } from './routes/index.js'
import { createContentServices } from './services/contentService.js'
import { createMediaService } from './services/mediaService.js'
import { createSiteServices } from './services/siteService.js'
import { createCloudinaryStorage } from './services/storage/cloudinaryStorage.js'

/**
 * @param config   loadConfig() result
 * @param options  { storage } image storage adapter; defaults to Cloudinary from config (null if not configured)
 */
export function createApp(config, { storage = createCloudinaryStorage(config.media) } = {}) {
  const media = createMediaService(storage)
  const deps = { media, content: createContentServices(media), site: createSiteServices(media) }

  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.http.trustProxy)

  app.use(helmet())
  app.use('/api', corsMiddleware(config))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  app.use((req, res, next) => {
    req.id = randomUUID() // ties a system log entry to the request
    res.set('X-Request-Id', req.id)
    res.set('Cache-Control', 'no-store') // API responses may contain private data
    next()
  })

  app.use('/api', createApiRouter(config, deps))
  app.use(notFound)
  app.use(errorHandler(config))
  return app
}
