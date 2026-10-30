import { ImageOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { imageService } from '../services/imageService'

// Photo stored in Drive, loaded through the authorised API (Drive files stay private).
export default function StoredImage({ fileId, alt, className = '' }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setFailed(false)
    imageService
      .previewUrl(fileId)
      .then((url) => active && setSrc(url))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
  }, [fileId])

  return (
    <div className={`grid place-items-center overflow-hidden bg-navy-50 ${className}`}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : failed ? (
        <ImageOff className="h-6 w-6 text-steel-500" aria-label="Photo could not be loaded" />
      ) : (
        <Loader2 className="h-5 w-5 animate-spin text-steel-500" aria-label="Loading photo" />
      )}
    </div>
  )
}
