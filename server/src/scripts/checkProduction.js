// Read-only production readiness check: `npm run prod:check` (reads server/.env.production.local).
// Validates the settings exactly as the deployed Vercel function will, then connects to the
// production database and reports what is there. Never prints a connection string or secret,
// and never writes to the database.
import mongoose from 'mongoose'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { ConfigError, loadConfig } from '../config/env.js'
import { Category, Product, Service } from '../models/catalog.js'
import { User } from '../models/User.js'

async function main() {
  const config = loadConfig({ ...process.env, VERCEL: '1' }) // same rules as on Vercel
  console.log(`Configuration: valid for production (database "${config.db.dbName}", Cloudinary folder "${config.media.folder}", origins ${config.http.allowedOrigins.length}).`)

  await connectDatabase(config.db)
  await mongoose.connection.db.command({ ping: 1 }) // allowed for a readWrite-only user
  console.log(`MongoDB: connected to "${mongoose.connection.db.databaseName}".`)

  const [users, admins, categories, products, services] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'admin' }),
    Category.countDocuments(),
    Product.countDocuments(),
    Service.countDocuments(),
  ])
  console.log(`Contents: ${users} user(s) (${admins} admin), ${categories} categories, ${products} products, ${services} services.`)
  if (!products) console.log('Next: npm run prod:seed:content')
  if (!admins) console.log('Next: npm run prod:seed:admin (in your own terminal; the password is typed at a hidden prompt)')
}

main()
  .catch((err) => {
    // Configuration errors list variable names and rules only; other errors show their type.
    console.error(err instanceof ConfigError ? err.message : `Check failed: ${err.name}${err.codeName ? ` (${err.codeName})` : ''}`)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
