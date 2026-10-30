import { existsSync } from 'node:fs'

// Load server/.env for the test database settings (MONGODB_URI_TEST / MONGODB_DB_TEST) if present.
if (existsSync('.env')) process.loadEnvFile('.env')
