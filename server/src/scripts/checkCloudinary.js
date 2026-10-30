// Verifies the Cloudinary configuration with a real upload and delete of a 1×1 test image.
// Usage: npm run media:check   (never prints credentials)
import { loadConfig } from '../config/env.js'
import { createCloudinaryStorage } from '../services/storage/cloudinaryStorage.js'

const TEST_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

async function main() {
  const config = loadConfig()
  const storage = createCloudinaryStorage(config.media)
  if (!storage) throw new Error('Cloudinary is not configured: set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in server/.env.')

  console.log(`Uploading a test image to folder "${config.media.folder}/_healthcheck"…`)
  const stored = await storage.upload(TEST_PNG, { folder: '_healthcheck' })
  console.log(`  uploaded: ${stored.format} ${stored.width}×${stored.height}, ${stored.bytes} bytes, HTTPS URL: ${stored.url.startsWith('https://')}`)
  const result = await storage.destroy(stored.publicId)
  console.log(`  deleted: ${result}`)
  console.log('Cloudinary is configured correctly.')
}

main().catch((err) => {
  console.error(`Cloudinary check failed: ${err.message}`)
  process.exitCode = 1
})
