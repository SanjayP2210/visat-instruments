// Creates the first Admin user and builds database indexes. Does nothing if an Admin already exists.
//
// Usage (development):  npm run seed:admin
// Usage (preview/prod):  node --env-file=.env.production.local src/scripts/createAdmin.js
//   (a git-ignored env file holding that environment's MONGODB_URI / MONGODB_DB and secrets)
//
// The password is typed at a hidden prompt (twice) and never stored. INITIAL_ADMIN_PASSWORD is
// still accepted for automated setups, but should not be kept in any file afterwards.
// Before writing, you must type the database name to confirm the target.
// Further Admins (e.g. a second person) are created by an Admin in the admin panel → Users.
import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import * as models from '../models/index.js'
import { isStrongPassword, PASSWORD_RULES } from '../services/passwordService.js'
import { createUser } from '../services/userService.js'
import { createUserBody } from '../validators/auth.js'

/** Reads one line from the terminal; `hidden` input is not echoed. */
function ask(question, { hidden = false } = {}) {
  if (!process.stdin.isTTY) throw new Error('Run this script in an interactive terminal (or set the values as environment variables).')
  return new Promise((resolve) => {
    // Hidden input: readline writes to a muted stream, so typed characters are never echoed.
    if (hidden) process.stdout.write(question)
    const output = hidden ? new Writable({ write: (_chunk, _enc, done) => done() }) : process.stdout
    const rl = createInterface({ input: process.stdin, output, terminal: true })
    rl.question(hidden ? '' : question, (answer) => {
      rl.close()
      if (hidden) process.stdout.write('\n')
      resolve(answer.trim())
    })
  })
}

async function main() {
  const config = loadConfig()
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in the env file.')
  const { dbName } = config.db

  const name = config.initialAdmin.name || (await ask('Admin name: '))
  const email = config.initialAdmin.email || (await ask('Admin email: '))
  let password = config.initialAdmin.password
  if (!password) {
    password = await ask('Password (hidden): ', { hidden: true })
    if (!isStrongPassword(password)) throw new Error(`The password is too weak. ${PASSWORD_RULES}`)
    if ((await ask('Repeat password (hidden): ', { hidden: true })) !== password) throw new Error('The passwords do not match.')
  } else if (!isStrongPassword(password)) {
    throw new Error(`INITIAL_ADMIN_PASSWORD is too weak. ${PASSWORD_RULES}`)
  }
  const input = createUserBody.parse({ name: name || 'Site Administrator', email, password, role: models.ROLES.ADMIN })

  if (process.stdin.isTTY && (await ask(`Target database is "${dbName}". Type its name to continue: `)) !== dbName) {
    throw new Error('Cancelled: the database name did not match. Nothing was changed.')
  }

  await connectDatabase(config.db)
  console.log(`Connected to database "${dbName}".`)

  for (const model of Object.values(models).filter((m) => typeof m?.syncIndexes === 'function')) {
    await model.syncIndexes()
  }
  console.log('Indexes are up to date.')

  if (await models.User.exists({ role: models.ROLES.ADMIN })) {
    console.log('An Admin user already exists. Nothing to do. (Add more Admins in the admin panel → Users.)')
    return
  }
  const admin = await createUser(input, config)
  console.log(`Created Admin ${admin.email} in "${dbName}".`)
  if (config.initialAdmin.password) console.log('Remove INITIAL_ADMIN_PASSWORD from the env file now.')
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
