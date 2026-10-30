// Starts the real API for e2e tests (test database, Cloudinary test folder).
import { loadTestEnv } from './env.mjs'

loadTestEnv()
process.env.PORT = process.env.E2E_API_PORT
process.env.ALLOWED_ORIGINS = process.env.E2E_WEB_ORIGIN

const { loadConfig } = await import('../server/src/config/env.js')
const { createApp } = await import('../server/src/app.js')
const config = loadConfig()
createApp(config).listen(config.port, () => console.log(`e2e API on :${config.port} (db ${config.db.dbName}, media folder ${config.media.folder})`))
