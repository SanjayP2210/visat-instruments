// In-memory test double for the image storage adapter (same interface as cloudinaryStorage).
// Used only by automated tests; real Cloudinary is verified with `npm run media:check`.
import { randomUUID } from 'node:crypto'

export const TEST_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

export function createFakeStorage() {
  const files = new Map()
  const state = { failDestroy: false, urlLength: 0 }
  return {
    provider: 'fake',
    files,
    state,
    async upload(buffer, { folder }) {
      const publicId = `test/${folder}/${randomUUID()}`
      files.set(publicId, buffer.length)
      const url = `https://res.example.test/${publicId}.png${state.urlLength ? `?${'x'.repeat(state.urlLength)}` : ''}`
      return { url, publicId, width: 1, height: 1, bytes: buffer.length, format: 'png' }
    },
    async destroy(publicId) {
      if (state.failDestroy) throw new Error('storage unavailable')
      files.delete(publicId)
      return 'ok'
    },
    async list() {
      return { publicIds: [...files.keys()], nextCursor: undefined }
    },
  }
}
