// Single image: preview, upload/replace with progress, remove. Files go to the backend,
// which stores them in Cloudinary; this component never sees storage credentials.
import { ImageOff, Loader2, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { api, checkImage } from '../api/client'
import { limitMb, useMediaStatus } from './MediaStatus'
import { useToast } from './Toast'
import { ConfirmDialog } from './ui'

export function ImagePreview({ image, alt, className = 'h-32 w-32' }) {
  if (!image?.url) {
    return (
      <div className={`grid place-items-center rounded-lg border border-dashed border-steel-300 bg-navy-50 text-steel-500 ${className}`}>
        <ImageOff className="h-6 w-6" aria-label="No image" />
      </div>
    )
  }
  return <img src={image.url} alt={alt ?? image.alt ?? ''} className={`rounded-lg border border-steel-200 bg-navy-50 object-contain ${className}`} />
}

export function UploadProgress({ value }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-steel-200" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
      <div className="h-full bg-accent-500 transition-all" style={{ width: `${value}%` }} />
    </div>
  )
}

/**
 * @param image        current image ({ url, alt }) or null
 * @param uploadPath   PUT endpoint that accepts the file (field "image")
 * @param removePath   DELETE endpoint (omit to hide "Remove")
 * @param onSaved      called with the updated record returned by the API
 */
export default function ImageField({ label, image, uploadPath, removePath, onSaved, altDefault = '', hint }) {
  const id = useId()
  const toast = useToast()
  const { configured, maxBytes } = useMediaStatus()
  const [progress, setProgress] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)

  const choose = async (file) => {
    if (!file) return
    const problem = checkImage(file, maxBytes)
    if (problem) return toast.error(problem)
    setProgress(0)
    try {
      const { data } = await api.upload('PUT', uploadPath, { files: [file], fields: { alt: image?.alt || altDefault }, onProgress: setProgress })
      onSaved(data)
      toast.success(image?.url ? 'Image replaced.' : 'Image uploaded.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProgress(null)
    }
  }

  const remove = async () => {
    setRemoving(true)
    try {
      const { data } = await api.del(removePath)
      onSaved(data)
      toast.success('Image removed.')
      setConfirming(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div>
      {label && <p className="mb-1.5 text-sm font-semibold text-navy-900">{label}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <ImagePreview image={image} />
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          {progress !== null ? (
            <>
              <UploadProgress value={progress} />
              <p className="flex items-center gap-1.5 text-xs text-steel-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Uploading… {progress}%
              </p>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <label htmlFor={id} className={`btn-outline cursor-pointer px-3 py-2 text-xs ${configured ? '' : 'pointer-events-none opacity-50'}`}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                {image?.url ? 'Replace' : 'Upload'}
              </label>
              <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!configured} onChange={(e) => { choose(e.target.files[0]); e.target.value = '' }} />
              {removePath && image?.url && (
                <button type="button" onClick={() => setConfirming(true)} className="btn-outline px-3 py-2 text-xs text-red-700">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-steel-500">{configured ? `${hint ? `${hint} ` : ''}JPG, PNG or WebP, up to ${limitMb(maxBytes)} MB.` : 'Image uploads are not configured on the server.'}</p>
        </div>
      </div>
      {confirming && <ConfirmDialog title="Remove image?" message="The image will be deleted from storage." confirmLabel="Remove" busy={removing} onConfirm={remove} onCancel={() => setConfirming(false)} />}
    </div>
  )
}
