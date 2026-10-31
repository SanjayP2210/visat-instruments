import { RefreshCw, Trash2, Upload } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { api, checkImage } from '../api/client'
import { ImagePreview, UploadProgress } from '../components/ImageField'
import { UploadLimit, useMediaStatus } from '../components/MediaStatus'
import { useToast } from '../components/Toast'
import { Badge, ConfirmDialog, ErrorState, PageHeader, Spinner, Toggle } from '../components/ui'

// Slots of the /api/media/assets library. Single slots keep one image (uploading replaces it).
const SLOTS = [
  { slot: 'logo', label: 'Business logo', multiple: false, hint: 'Square or wide logo, PNG with transparent background works best.' },
  { slot: 'header-logo', label: 'Header logo', multiple: false },
  { slot: 'footer-logo', label: 'Footer logo', multiple: false },
  { slot: 'favicon', label: 'Favicon', multiple: false, hint: 'Square PNG, at least 192×192 px.' },
  { slot: 'og-default', label: 'Default social-sharing image', multiple: false, hint: 'About 1200×630 px.' },
  { slot: 'home-banner', label: 'Homepage hero banners', multiple: true, hint: 'Original photographs only.' },
  { slot: 'about-image', label: 'About Us images', multiple: true, hint: 'Original photographs only.' },
]

function AssetCard({ asset, onChanged, onDelete }) {
  const toast = useToast()
  const { configured, maxBytes } = useMediaStatus()
  const [progress, setProgress] = useState(null)
  const [alt, setAlt] = useState(asset.image?.alt ?? '')

  const patch = async (changes, message) => {
    try {
      await api.patch(`/media/assets/${asset.id}`, changes)
      toast.success(message)
      onChanged()
    } catch (err) {
      toast.error(err.message)
    }
  }
  const replace = async (file) => {
    if (!file) return
    const problem = checkImage(file, maxBytes)
    if (problem) return toast.error(problem)
    setProgress(0)
    try {
      await api.upload('PUT', `/media/assets/${asset.id}/image`, { files: [file], fields: { alt }, onProgress: setProgress })
      toast.success('Image replaced.')
      onChanged()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="card space-y-3 p-3">
      <ImagePreview image={asset.image} className="aspect-video w-full" />
      {progress !== null && <UploadProgress value={progress} />}
      <label className="block text-xs font-semibold text-steel-600">
        Alt text
        <input className="field-input mt-1 py-2" value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} onBlur={() => alt !== (asset.image?.alt ?? '') && patch({ alt }, 'Alt text saved.')} />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle id={`asset-active-${asset.id}`} label={asset.active ? 'In use' : 'Not in use'} checked={asset.active} onChange={(v) => patch({ active: v }, v ? 'Image is now in use.' : 'Image is no longer in use.')} />
        <label className={`btn-outline ml-auto cursor-pointer px-2.5 py-1.5 text-xs ${configured ? '' : 'pointer-events-none opacity-50'}`}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Replace
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Replace image" onChange={(e) => { replace(e.target.files[0]); e.target.value = '' }} />
        </label>
        <button
          type="button"
          onClick={() => onDelete(asset)}
          disabled={asset.active}
          title={asset.active ? 'In use on the website — switch it off or replace it first.' : 'Delete'}
          className="btn-outline px-2.5 py-1.5 text-xs text-red-700"
          aria-label="Delete image"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {asset.active && <p className="text-[11px] text-steel-500">In use on the website — switch off or replace before deleting.</p>}
    </div>
  )
}

function SlotSection({ slot, assets, onChanged, onDelete }) {
  const id = useId()
  const toast = useToast()
  const { configured, maxBytes } = useMediaStatus()
  const [progress, setProgress] = useState(null)
  const canAdd = slot.multiple || assets.length === 0

  const add = async (file) => {
    if (!file) return
    const problem = checkImage(file, maxBytes)
    if (problem) return toast.error(problem)
    setProgress(0)
    try {
      await api.upload('POST', '/media/assets', { files: [file], fields: { slot: slot.slot, title: slot.label, alt: slot.label }, onProgress: setProgress })
      toast.success(`${slot.label} uploaded.`)
      onChanged()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <section className="card space-y-4 p-5" aria-labelledby={`${id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-bold">
            {slot.label} {slot.multiple && <Badge>{assets.length}</Badge>}
          </h2>
          {slot.hint && <p className="text-xs text-steel-500">{slot.hint}</p>}
        </div>
        {canAdd && progress === null && (
          <>
            <label htmlFor={id} className={`btn-navy cursor-pointer px-3 py-2 text-xs ${configured ? '' : 'pointer-events-none opacity-50'}`}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Upload
            </label>
            <input id={id} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Upload ${slot.label}`} disabled={!configured} onChange={(e) => { add(e.target.files[0]); e.target.value = '' }} />
          </>
        )}
      </div>
      <UploadLimit />
      {progress !== null && (
        <div className="space-y-1">
          <UploadProgress value={progress} />
          <p className="text-xs text-steel-600">Uploading… {progress}%</p>
        </div>
      )}
      {assets.length === 0 ? (
        <p className="rounded-lg border border-dashed border-steel-300 bg-navy-50 p-4 text-sm text-steel-600">Not uploaded yet — the website uses its built-in default.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} onChanged={onChanged} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function BrandingPage() {
  const toast = useToast()
  const { configured } = useMediaStatus()
  const [assets, setAssets] = useState(null)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = () => {
    setError(null)
    api.get('/media/assets', { limit: 100, sort: 'sortOrder' }).then(({ data }) => setAssets(data)).catch(setError)
  }
  useEffect(load, [])

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/media/assets/${deleting.id}`)
      toast.success('Image deleted.')
      setDeleting(null)
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Branding & Media" description="Logos, favicon, banners and sharing images used across the website. Files are stored in Cloudinary via the server." />
      {!configured && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Image uploads are not configured on the server.</p>}
      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : !assets ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          {SLOTS.map((s) => (
            <SlotSection key={s.slot} slot={s} assets={assets.filter((a) => a.slot === s.slot)} onChanged={load} onDelete={setDeleting} />
          ))}
        </div>
      )}
      {deleting && <ConfirmDialog title="Delete this image?" message="It will be deleted from storage. This cannot be undone." busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  )
}
