// Local development server: `npm run dev` (reads server/.env).
import { createApp } from './app.js'
import { connectDatabase } from './config/database.js'
import { ConfigError, loadConfig } from './config/env.js'

let config
try {
  config = loadConfig()
} catch (err) {
  if (err instanceof ConfigError) {
    console.error(`${err.message}\n\nCopy server/.env.example to server/.env and fill in the values.`)
    process.exit(1)
  }
  throw err
}

if (!config.db.configured) {
  console.warn('MONGODB_URI is not set: the API will start, but database routes return 503 until it is configured.')
} else {
  connectDatabase(config.db)
    .then(() => console.log(`Connected to MongoDB database "${config.db.dbName}".`))
    .catch((err) => console.error(`Could not connect to MongoDB: ${err.message}`))
}

createApp(config).listen(config.port, () => {
  console.log(`VISAT INSTRUMENTS API (${config.env}) listening on http://localhost:${config.port}/api`)
})
