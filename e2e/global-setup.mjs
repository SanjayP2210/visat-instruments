// Prepares the Atlas test database: empty it, seed the approved content, create one Admin
// and one Editor with random one-time passwords (shared with the tests via env).
import { randomBytes } from 'node:crypto'
import { loadTestEnv } from './env.mjs'

export default async function globalSetup() {
  loadTestEnv()
  const { loadConfig } = await import('../server/src/config/env.js')
  const { connectDatabase, disconnectDatabase } = await import('../server/src/config/database.js')
  const models = await import('../server/src/models/index.js')
  const { seedContent } = await import('../server/src/services/seedService.js')
  const { createUser } = await import('../server/src/services/userService.js')

  const config = loadConfig()
  const connection = await connectDatabase(config.db)
  await connection.dropDatabase()
  for (const model of Object.values(models).filter((m) => typeof m?.syncIndexes === 'function')) await model.syncIndexes()
  await seedContent()

  const password = () => `E2e-${randomBytes(12).toString('base64url')}1`
  process.env.E2E_ADMIN_EMAIL = 'e2e-admin@example.com'
  process.env.E2E_ADMIN_PASSWORD = password()
  process.env.E2E_EDITOR_EMAIL = 'e2e-editor@example.com'
  process.env.E2E_EDITOR_PASSWORD = password()
  await createUser({ name: 'E2E Admin', email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, role: 'admin' }, config)
  await createUser({ name: 'E2E Editor', email: process.env.E2E_EDITOR_EMAIL, password: process.env.E2E_EDITOR_PASSWORD, role: 'editor' }, config)
  await disconnectDatabase()
}
