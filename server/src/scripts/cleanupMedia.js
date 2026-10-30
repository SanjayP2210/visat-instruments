// Cloudinary cleanup.
//   npm run media:cleanup                     retry deletions queued after earlier failures
//   npm run media:cleanup -- --orphans        also list files in Cloudinary that nothing references
//   npm run media:cleanup -- --orphans --apply   …and delete those orphaned files
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import { loadConfig } from '../config/env.js'
import { findOrphans } from '../services/mediaInventory.js'
import { createMediaService } from '../services/mediaService.js'
import { createCloudinaryStorage } from '../services/storage/cloudinaryStorage.js'

async function main() {
  const config = loadConfig()
  const storage = createCloudinaryStorage(config.media)
  if (!storage) throw new Error('Cloudinary is not configured in server/.env.')
  if (!config.db.configured) throw new Error('MONGODB_URI is not set in server/.env.')
  await connectDatabase(config.db)

  const { deleted, failed } = await createMediaService(storage).retryCleanup()
  console.log(`Queued deletions: ${deleted} deleted, ${failed} still failing.`)

  if (process.argv.includes('--orphans')) {
    const orphans = await findOrphans(storage)
    console.log(`Unreferenced files in "${config.media.folder}": ${orphans.length}`)
    orphans.slice(0, 50).forEach((id) => console.log(`  ${id}`))
    if (process.argv.includes('--apply')) {
      for (const id of orphans) await storage.destroy(id)
      console.log(`Deleted ${orphans.length} unreferenced file(s).`)
    } else if (orphans.length) {
      console.log('Nothing deleted. Re-run with --apply to delete them.')
    }
  }
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => disconnectDatabase().catch(() => {}))
