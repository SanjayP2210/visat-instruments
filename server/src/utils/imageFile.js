// Image type detection from file content ("magic bytes"), so a renamed file or a script
// disguised as an image is rejected regardless of its declared MIME type or extension.
export const ALLOWED_IMAGE_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
})

export function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return ''
  const b = (i) => buffer[i]
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg'
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47 && b(4) === 0x0d && b(5) === 0x0a) return 'image/png'
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) {
    return 'image/webp'
  }
  return ''
}
