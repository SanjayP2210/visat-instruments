import mongoose from 'mongoose'

// Unknown fields in filters are dropped. Request data reaches queries only after strict
// zod validation (plain strings/numbers/booleans), so it cannot carry `$` query operators.
mongoose.set('strictQuery', true)

// Cached on globalThis so warm serverless invocations (and hot reloads) reuse one connection.
const cache = (globalThis.__visatMongo ??= { promise: null })

export class DatabaseNotConfiguredError extends Error {}

/** Connects once and reuses the connection. Safe to call on every request. */
export async function connectDatabase({ uri, dbName }) {
  if (!uri) throw new DatabaseNotConfiguredError('MongoDB connection string is not configured.')
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { dbName, serverSelectionTimeoutMS: 10000, maxPoolSize: 10 })
      .then((m) => m.connection)
      .catch((err) => {
        cache.promise = null // allow a retry on the next request
        throw err
      })
  }
  return cache.promise
}

export async function disconnectDatabase() {
  cache.promise = null
  await mongoose.disconnect()
}

export function databaseState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown'
}
