// Product image manager: add several images (with progress), preview, alt text, fit,
// reorder, replace and delete. The first image is the main photo on the website.
import { ArrowLeft, ArrowRight, Loader2, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { api, checkImage } from '../api/client'
import { ImagePreview, UploadProgress } from './ImageField'
import { useMediaStatus } from './MediaStatus'
import { useToast } from './Toast'
import { ConfirmDialog } from './ui'

const MAX_IMAGES = 12

export default function ProductImages({ product, onSaved }) {
  const inputId = useId()
  const toast = useToast()
  const { configured, maxBytes } = useMediaStatus()
  const [progress, setProgress] = useState(null)
  const [busy, setBusy] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [alts, setAlts] = useState({})
  const images = product.images ?? []
  const base = `/products/${product.id}/images`

  const run = async (key, fn, message) => {
    setBusy(key)
    try {
      const { data } = await fn()
      onSaved(data)
      if (message) toast.success(message)
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setBusy('')
    }
  }

  const add = async (fileList) => {
    const files = [...fileList]
    if (!files.length) return
    const problems = files.map((f) => checkImage(f, maxBytes)).filter(Boolean)
    if (problems.length) return toast.error(problems.join(' '))
    if (images.length + files.length > MAX_IMAGES) return toast.error(`A product can have at most ${MAX_IMAGES} images (it has ${images.length}).`)
    setProgress(0)
    try {
      const { data } = await api.upload('POST', base, { field: 'images', files, fields: { alt: product.name }, onProgress: setProgress })
      onSaved(data)
      toast.success(files.length === 1 ? 'Image uploaded.' : `${files.length} images uploaded.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProgress(null)
    }
  }

  const replace = (image, file) => {
    if (!file) return
    const problem = checkImage(file, maxBytes)
    if (problem) return toast.error(problem)
    return run(`replace-${image.id}`, () => api.upload('PUT', `${base}/${image.id}`, { files: [file], fields: { alt: image.alt } }), 'Image replaced.')
  }

  const move = (index, delta) => {
    const order = images.map((i) => i.id)
    const [moved] = order.splice(index, 1)
    order.splice(index + delta, 0, moved)
    return run('order', () => api.put(`${base}/order`, { order }), 'Image order saved.')
  }

  const saveDetails = (image, changes) => run(`edit-${image.id}`, () => api.patch(`${base}/${image.id}`, changes), 'Image details saved.')

  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${inputId}-title`} className="text-xl font-bold">
            Product images
          </h2>
          <p className="text-xs text-steel-500">
            {images.length}/{MAX_IMAGES}. The first image is the main photo. Without images the website shows “Photo coming soon”. Use original photographs only.
          </p>
        </div>
        {progress === null && (
          <>
            <label htmlFor={inputId} className={`btn-navy cursor-pointer px-3 py-2 text-xs ${configured && images.length < MAX_IMAGES ? '' : 'pointer-events-none opacity-50'}`}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Add images
            </label>
            <input id={inputId} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!configured} onChange={(e) => { add(e.target.files); e.target.value = '' }} />
          </>
        )}
      </div>
      {progress !== null && (
        <div className="space-y-1">
          <UploadProgress value={progress} />
          <p className="text-xs text-steel-600">Uploading… {progress}%</p>
        </div>
      )}
      {!configured && <p className="text-sm text-red-700">Image uploads are not configured on the server.</p>}

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-steel-300 bg-navy-50 p-6 text-center text-sm text-steel-600">No images yet — the website shows “Photo coming soon”.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, i) => {
            const alt = alts[image.id] ?? image.alt ?? ''
            return (
              <li key={image.id} className="card space-y-3 p-3">
                <div className="relative">
                  <ImagePreview image={image} className="aspect-[4/3] w-full" />
                  {i === 0 && <span className="absolute top-2 left-2 rounded bg-navy-900 px-2 py-0.5 text-[11px] font-bold text-white">Main</span>}
                  {busy.endsWith(image.id) && <Loader2 className="absolute top-2 right-2 h-5 w-5 animate-spin text-navy-900" aria-label="Saving" />}
                </div>
                <label className="block text-xs font-semibold text-steel-600">
                  Alt text
                  <input className="field-input mt-1 py-2" value={alt} maxLength={300} onChange={(e) => setAlts((a) => ({ ...a, [image.id]: e.target.value }))} onBlur={() => alt !== (image.alt ?? '') && saveDetails(image, { alt })} />
                </label>
                <label className="block text-xs font-semibold text-steel-600">
                  Display
                  <select className="field-input mt-1 py-2" value={image.fit ?? 'cover'} onChange={(e) => saveDetails(image, { fit: e.target.value })}>
                    <option value="cover">Fill frame (crop edges)</option>
                    <option value="contain">Show whole photo</option>
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" className="btn-outline px-2 py-1.5 text-xs" disabled={i === 0 || Boolean(busy)} onClick={() => move(i, -1)} aria-label={`Move image ${i + 1} earlier`}>
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-outline px-2 py-1.5 text-xs" disabled={i === images.length - 1 || Boolean(busy)} onClick={() => move(i, 1)} aria-label={`Move image ${i + 1} later`}>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <label className={`btn-outline cursor-pointer px-2 py-1.5 text-xs ${configured ? '' : 'pointer-events-none opacity-50'}`}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Replace image ${i + 1}`} onChange={(e) => { replace(image, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <button type="button" className="btn-outline ml-auto px-2 py-1.5 text-xs text-red-700" onClick={() => setDeleting(image)} aria-label={`Delete image ${i + 1}`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete image?"
          message="This image will be removed from the product and deleted from storage."
          busy={busy === `delete-${deleting.id}`}
          onConfirm={async () => (await run(`delete-${deleting.id}`, () => api.del(`${base}/${deleting.id}`), 'Image deleted.')) && setDeleting(null)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}
