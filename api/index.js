// Vercel serverless function for every /api/* request (see vercel.json). It runs the same
// Express app as local development (server/src/app.js) with the configuration taken from the
// Vercel environment variables. Nothing here starts a server or listens on a port.
import { createApp } from '../server/src/app.js'
import { connectDatabase } from '../server/src/config/database.js'
import { ConfigError, loadConfig } from '../server/src/config/env.js'

// Built once per function instance and reused by warm invocations. The MongoDB connection is
// cached on globalThis by connectDatabase(), so warm requests reuse it as well.
let config
let app
let startupError

try {
  config = loadConfig()
  app = createApp(config)
} catch (err) {
  startupError = err
  // ConfigError messages list variable names and rules only, never their values.
  console.error(err instanceof ConfigError ? err.message : `API start-up failed: ${err.message}`)
}

const unavailable = (res, message) => {
  res.statusCode = 503
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message } }))
}

export default async function handler(req, res) {
  if (startupError) return unavailable(res, 'The service is not configured correctly. Please try again later.')

  if (config.db.configured) {
    try {
      await connectDatabase(config.db)
    } catch (err) {
      console.error(`MongoDB connection failed: ${err.name}`)
      // The health check still answers (it reports the database state); everything else waits.
      if (!req.url?.startsWith('/api/health')) return unavailable(res, 'The service is temporarily unavailable. Please try again shortly.')
    }
  }
  return app(req, res)
}
