import multer from 'multer'
import { ApiError, errors } from '../utils/http.js'
import { ALLOWED_IMAGE_TYPES, detectImageType } from '../utils/imageFile.js'

/**
 * Accepts image files in memory (never written to disk or MongoDB), checks size, count,
 * declared type and actual content. `field` is the multipart field name.
 */
export function imageUpload(config, media, { field = 'image', maxFiles = 1, required = true } = {}) {
  const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.media.maxBytes, files: maxFiles, fields: 20, fieldSize: 10 * 1024, parts: maxFiles + 20 },
    fileFilter: (_req, file, done) => {
      if (!ALLOWED_IMAGE_TYPES[file.mimetype]) return done(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', 'Only JPG, PNG and WebP images are allowed.'))
      done(null, true)
    },
  }).array(field, maxFiles)

  const maxMb = Math.round((config.media.maxBytes / 1024 / 1024) * 10) / 10

  return (req, res, next) => {
    try {
      media.requireStorage() // fail fast before reading the upload
    } catch (err) {
      return next(err)
    }
    parser(req, res, (err) => {
      if (err instanceof ApiError) return next(err)
      if (err?.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'FILE_TOO_LARGE', `Each image must be ${maxMb} MB or smaller.`))
      if (err?.code === 'LIMIT_FILE_COUNT' || err?.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(errors.validation([{ path: field, message: `Upload up to ${maxFiles} image(s) in the "${field}" field.` }]))
      }
      if (err) return next(errors.badRequest('The upload could not be read.'))

      const files = req.files ?? []
      if (required && files.length === 0) return next(errors.validation([{ path: field, message: 'Choose an image to upload.' }]))
      for (const file of files) {
        if (detectImageType(file.buffer) !== file.mimetype) {
          return next(new ApiError(415, 'UNSUPPORTED_FILE_TYPE', `"${file.originalname}" is not a valid ${ALLOWED_IMAGE_TYPES[file.mimetype].toUpperCase()} image.`))
        }
      }
      next()
    })
  }
}
