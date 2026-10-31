// Image upload/deletion on top of a storage adapter, with cleanup guarantees:
// - files uploaded for a request that then fails are deleted again (no orphans);
// - files that are replaced or removed are deleted from storage;
// - deletions that fail are queued in MediaCleanup and retried later.
import { MediaCleanup } from '../models/media.js'
import { errors } from '../utils/http.js'
import { logSystem } from './logService.js'

export function createMediaService(storage) {
  const requireStorage = () => {
    if (!storage) throw errors.unavailable('MEDIA_NOT_CONFIGURED', 'Image uploads are not configured yet.')
    return storage
  }

  async function uploadOne(file, { folder, alt = '' }) {
    const target = requireStorage()
    try {
      const stored = await target.upload(file.buffer, { folder })
      return { ...stored, alt }
    } catch (err) {
      await logSystem({ level: 'error', code: 'CLOUDINARY_UPLOAD_FAILED', message: err.message, context: { folder, size: file.size, type: file.mimetype } })
      err.logged = true // the error handler does not log it a second time
      throw err
    }
  }

  /** Deletes a stored image; local site images (no publicId) are left alone. Never throws. */
  async function remove(image, reason = 'removed') {
    const publicId = typeof image === 'string' ? image : image?.publicId
    if (!publicId) return
    try {
      await requireStorage().destroy(publicId)
      await MediaCleanup.deleteOne({ publicId })
    } catch (err) {
      await logSystem({ level: 'warn', code: 'CLOUDINARY_DELETE_FAILED', message: err.message, context: { reason } })
      await MediaCleanup.updateOne(
        { publicId },
        { $set: { reason, lastError: String(err.message).slice(0, 500) }, $inc: { attempts: 1 } },
        { upsert: true },
      ).catch(() => {})
    }
  }

  return {
    get configured() {
      return Boolean(storage)
    },
    requireStorage,
    remove,

    /**
     * Uploads files, then runs `save(images)`. If anything fails, every file uploaded
     * by this call is deleted again, so storage never keeps files the database doesn't know.
     */
    async uploadThen(files, { folder, alt }, save) {
      const uploaded = []
      try {
        for (const file of files) uploaded.push(await uploadOne(file, { folder, alt }))
        return await save(uploaded)
      } catch (err) {
        await Promise.all(uploaded.map((img) => remove(img, 'rolled back after failed save')))
        throw err
      }
    },

    async removeMany(images, reason) {
      await Promise.all((images ?? []).map((img) => remove(img, reason)))
    },

    /** Retries queued deletions. Returns { deleted, failed }. */
    async retryCleanup() {
      requireStorage()
      const queued = await MediaCleanup.find().limit(200)
      let deleted = 0
      for (const item of queued) {
        try {
          await storage.destroy(item.publicId)
          await item.deleteOne()
          deleted += 1
        } catch (err) {
          item.attempts += 1
          item.lastError = String(err.message).slice(0, 500)
          await item.save()
        }
      }
      return { deleted, failed: queued.length - deleted }
    },
  }
}
