// Seeds the approved website content (src/data/*) into the configured database.
// Usage: npm run seed:content            (creates missing records only)
//        npm run seed:content -- --force (also refreshes text of existing records; never images)
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import * as models from '../models/index.js'
import { seedContent } from '../services/seedService.js'

async function main() {
  const config = loadConfig()
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in server/.env.')
  await connectDatabase(config.db)
  console.log(`Connected to database "${config.db.dbName}".`)
  for (const model of Object.values(models).filter((m) => typeof m?.syncIndexes === 'function')) await model.syncIndexes()

  const force = process.argv.includes('--force')
  const summary = await seedContent({ force })
  console.log(`Content seed complete${force ? ' (force refresh)' : ''}:`)
  for (const [name, s] of Object.entries(summary)) console.log(`  ${name.padEnd(16)} created ${s.created}, updated ${s.updated}, unchanged ${s.skipped}`)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
