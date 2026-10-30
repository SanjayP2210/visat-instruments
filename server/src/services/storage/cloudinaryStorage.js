// Cloudinary adapter. The rest of the app depends only on this small interface
// ({ upload, destroy, list }), so storage can be swapped (or faked in tests).
import { v2 as cloudinary } from 'cloudinary'

export function createCloudinaryStorage(media) {
  if (!media.configured) return null
  cloudinary.config({ cloud_name: media.cloudName, api_key: media.apiKey, api_secret: media.apiSecret, secure: true })

  return {
    provider: 'cloudinary',
    rootFolder: media.folder,

    /** Uploads an image buffer; resolves with stored metadata. */
    upload(buffer, { folder }) {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${media.folder}/${folder}`,
            resource_type: 'image',
            allowed_formats: ['jpg', 'png', 'webp'],
            unique_filename: true,
            overwrite: false,
          },
          (error, result) => {
            if (error) return reject(new Error(error.message || 'Cloudinary upload failed'))
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              bytes: result.bytes,
              format: result.format,
            })
          },
        )
        stream.end(buffer)
      })
    },

    /** Deletes an image. "not found" counts as deleted. */
    async destroy(publicId) {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
      if (result.result !== 'ok' && result.result !== 'not found') throw new Error(`Cloudinary delete failed: ${result.result}`)
      return result.result
    },

    /** Lists stored public IDs under this site's folder (for orphan cleanup). */
    async list({ nextCursor } = {}) {
      const res = await cloudinary.api.resources({ type: 'upload', resource_type: 'image', prefix: `${media.folder}/`, max_results: 500, next_cursor: nextCursor })
      return { publicIds: res.resources.map((r) => r.public_id), nextCursor: res.next_cursor }
    },
  }
}
