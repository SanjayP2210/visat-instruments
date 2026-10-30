import { AlertCircle, CheckCircle2, ImagePlus, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { IMAGE_RULES } from '../../services/imageService'
import StoredImage from '../StoredImage'
import { Alert } from '../ui'

function UploadTile({ upload, onRetry, onDiscard }) {
  return (
    <li className="relative overflow-hidden rounded-lg border border-steel-200 bg-white">
      <img src={upload.previewUrl} alt={`Selected photo ${upload.file.name}`} className="aspect-square w-full object-cover opacity-70" />
      <div className="absolute inset-x-0 bottom-0 bg-white/95 p-2 text-xs">
        {upload.status === 'error' ? (
          <>
            <p className="flex items-start gap-1 font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {upload.error}
            </p>
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => onRetry(upload.localId)} className="inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline">
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Retry
              </button>
              <button type="button" onClick={() => onDiscard(upload.localId)} className="inline-flex items-center gap-1 font-semibold text-steel-600 hover:underline">
                <X className="h-3 w-3" aria-hidden="true" /> Discard
              </button>
            </div>
          </>
        ) : (
          <p className="flex items-center gap-1 font-semibold text-navy-800" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            {upload.status === 'uploading' ? 'Uploading…' : 'Waiting to upload'}
          </p>
        )}
      </div>
    </li>
  )
}

export default function ImagesStep({ form, uploads, onAddFiles, onRetry, onDiscard, onRemoveStored, locked }) {
  const [rejections, setRejections] = useState({})
  const [removing, setRemoving] = useState('')

  if (!form.products.length) return <Alert>Add products first, then upload their photos here.</Alert>

  const handleFiles = (product, fileList) => {
    const pendingCount = uploads.filter((u) => u.productId === product.id).length
    const result = onAddFiles(product, Array.from(fileList), product.images.length + pendingCount)
    setRejections((r) => ({ ...r, [product.id]: result.rejected }))
  }

  const removeStored = async (product, image) => {
    if (!window.confirm(`Remove ${image.name} from ${product.name || 'this product'}?`)) return
    setRemoving(image.fileId)
    try {
      await onRemoveStored(product.id, image.fileId)
    } catch (err) {
      window.alert(err.message)
    } finally {
      setRemoving('')
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        Upload clear, original photos of your actual products. JPG, PNG or WebP, up to 5 MB each and {IMAGE_RULES.maxPerProduct} per
        product. Each photo is stored in your private Google Drive folder as soon as it uploads.
      </Alert>
      {form.products.map((p) => {
        const pending = uploads.filter((u) => u.productId === p.id)
        const inputId = `${p.id}-files`
        return (
          <section key={p.id} className="rounded-xl border border-steel-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold">{p.name || 'Unnamed product'}</h3>
              <span className="text-xs font-semibold text-steel-500">
                {p.images.length} uploaded{pending.length ? ` · ${pending.length} in progress` : ''}
              </span>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {p.images.map((img) => (
                <li key={img.fileId} className="relative overflow-hidden rounded-lg border border-steel-200">
                  <StoredImage fileId={img.fileId} alt={`${p.name} photo ${img.name}`} className="aspect-square w-full" />
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-white/95 p-0.5 text-green-600" title="Saved to Google Drive">
                    <CheckCircle2 className="h-4 w-4" aria-label="Saved to Google Drive" />
                  </span>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() => removeStored(p, img)}
                      disabled={removing === img.fileId}
                      className="absolute top-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-red-700 hover:bg-white disabled:opacity-60"
                      aria-label={`Remove photo ${img.name}`}
                    >
                      {removing === img.fileId ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  )}
                  <p className="truncate px-2 py-1 text-[11px] text-steel-600" title={img.name}>
                    {img.name}
                  </p>
                </li>
              ))}
              {pending.map((u) => (
                <UploadTile key={u.localId} upload={u} onRetry={onRetry} onDiscard={onDiscard} />
              ))}
            </ul>

            {!locked && (
              <label
                htmlFor={inputId}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFiles(p, e.dataTransfer.files)
                }}
                className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-steel-300 bg-navy-50 p-5 text-center text-sm text-steel-600 hover:border-navy-700"
              >
                <ImagePlus className="h-6 w-6 text-navy-700" aria-hidden="true" />
                <span>
                  <span className="font-semibold text-navy-900">Choose photos</span> or drag them here
                </span>
                <input
                  id={inputId}
                  type="file"
                  multiple
                  accept={IMAGE_RULES.accept}
                  className="sr-only"
                  onChange={(e) => {
                    handleFiles(p, e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
            )}
            {rejections[p.id]?.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs font-medium text-red-700">
                {rejections[p.id].map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
