// Cleans up after e2e tests: empties the Atlas test database and deletes every file in the
// Cloudinary *test* folder (never the development or production folders).
import { loadTestEnv, TEST_CLOUDINARY_FOLDER } from './env.mjs'

export default async function globalTeardown() {
  loadTestEnv()
  const { loadConfig } = await import('../server/src/config/env.js')
  const { connectDatabase, disconnectDatabase } = await import('../server/src/config/database.js')
  const { createCloudinaryStorage } = await import('../server/src/services/storage/cloudinaryStorage.js')

  const config = loadConfig()
  const connection = await connectDatabase(config.db)
  await connection.dropDatabase()
  await disconnectDatabase()

  if (config.media.folder !== TEST_CLOUDINARY_FOLDER) throw new Error('Refusing to clean a non-test Cloudinary folder')
  const storage = createCloudinaryStorage(config.media)
  if (!storage) return
  let removed = 0
  let page
  do {
    page = await storage.list({ nextCursor: page?.nextCursor })
    for (const id of page.publicIds) {
      if (!id.startsWith(`${TEST_CLOUDINARY_FOLDER}/`)) continue
      await storage.destroy(id)
      removed += 1
    }
  } while (page.nextCursor)
  console.log(`e2e teardown: test database emptied, ${removed} test image(s) removed from Cloudinary.`)
}
