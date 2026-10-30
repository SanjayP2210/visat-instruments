// Product photos: validated in the browser, then uploaded one at a time. The server
// re-checks type, size and content, stores the file in Drive and returns its reference.
import { callApi } from '../api/client'

export const IMAGE_RULES = {
  maxBytes: 5 * 1024 * 1024,
  maxPerProduct: 12,
  types: ['image/jpeg', 'image/png', 'image/webp'],
  accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
}

export function checkImageFile(file) {
  if (!IMAGE_RULES.types.includes(file.type)) return 'Only JPG, PNG and WebP photos are allowed.'
  if (file.size > IMAGE_RULES.maxBytes) return 'Photos must be 5 MB or smaller.'
  if (file.size === 0) return 'This file is empty.'
  return ''
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

const previewCache = new Map()

export const imageService = {
  /** Resolves with the server's file reference once the photo is stored in Drive. */
  async upload({ formId, product, file }) {
    const buffer = await file.arrayBuffer()
    const sha256 = await sha256Hex(buffer)
    return callApi(
      'image.upload',
      {
        formId,
        productId: product.id,
        imageCategory: product.imageCategory,
        fileName: file.name,
        mimeType: file.type,
        sha256,
        base64: toBase64(buffer),
      },
      { timeoutMs: 90000 },
    )
  },

  remove: (fileId) => callApi('image.remove', { fileId }),

  /** Object URL for a stored photo (fetched through the authorised API, cached per session). */
  async previewUrl(fileId) {
    if (!previewCache.has(fileId)) {
      const pending = callApi('image.get', { fileId }).then(({ mimeType, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
      })
      previewCache.set(fileId, pending)
      pending.catch(() => previewCache.delete(fileId))
    }
    return previewCache.get(fileId)
  },
}
