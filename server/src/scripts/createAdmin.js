// Creates the first Admin user from INITIAL_ADMIN_* in server/.env and builds database indexes.
// Usage: npm run seed:admin   (does nothing if an Admin already exists)
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import * as models from '../models/index.js'
import { isStrongPassword, PASSWORD_RULES } from '../services/passwordService.js'
import { createUser } from '../services/userService.js'
import { createUserBody } from '../validators/auth.js'

async function main() {
  const config = loadConfig()
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in server/.env.')

  const { name, email, password } = config.initialAdmin
  if (!email || !password) throw new Error('Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in server/.env.')
  if (!isStrongPassword(password)) throw new Error(`INITIAL_ADMIN_PASSWORD is too weak. ${PASSWORD_RULES}`)

  await connectDatabase(config.db)
  console.log(`Connected to database "${config.db.dbName}".`)

  for (const model of Object.values(models).filter((m) => typeof m?.syncIndexes === 'function')) {
    await model.syncIndexes()
  }
  console.log('Indexes are up to date.')

  if (await models.User.exists({ role: models.ROLES.ADMIN })) {
    console.log('An Admin user already exists. Nothing to do.')
    return
  }
  const input = createUserBody.parse({ name: name || 'Site Administrator', email, password, role: models.ROLES.ADMIN })
  const admin = await createUser(input, config)
  console.log(`Created Admin ${admin.email}. Remove INITIAL_ADMIN_PASSWORD from server/.env now.`)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
