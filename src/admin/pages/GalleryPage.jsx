import { ArrowDown, ArrowUp, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useId, useState } from 'react'
import { api, checkImage } from '../api/client'
import { ImagePreview, UploadProgress } from '../components/ImageField'
import { ListToolbar, Pagination } from '../components/ListView'
import { UploadLimit, useMediaStatus } from '../components/MediaStatus'
import GujaratiFields, { cleanGu } from '../components/GujaratiFields'
import { useToast } from '../components/Toast'
import { Badge, ConfirmDialog, EmptyState, ErrorState, Modal, PageHeader, Select, Spinner, TextArea, TextInput, Toggle } from '../components/ui'
import { useList } from '../hooks/useList'

const TYPES = [
  { value: 'product', label: 'Product' },
  { value: 'installation', label: 'Installation' },
  { value: 'project', label: 'Project' },
  { value: 'promotional', label: 'Promotional' },
]
const titleFromFile = (name) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 120) || 'Gallery image'

function EditItem({ item, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ title: item.title, caption: item.caption ?? '', alt: item.image?.alt ?? '', type: item.type, location: item.location ?? '', active: item.active, gu: item.gu ?? {} })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    if (form.title.trim().length < 2) return setErrors({ title: 'Title must be at least 2 characters.' })
    setBusy(true)
    try {
      await api.patch(`/gallery/${item.id}`, { ...form, gu: cleanGu(form.gu) })
      toast.success('Gallery item saved.')
      onSaved()
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Edit gallery item" onClose={onClose} footer={<><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" onClick={save} disabled={busy}>Save</button></>}>
      <div className="grid gap-4">
        <ImagePreview image={item.image} className="aspect-[4/3] w-full" />
        <TextInput id="g-title" label="Title" required value={form.title} onChange={(v) => set('title', v)} error={errors.title} />
        <TextArea id="g-caption" label="Description" value={form.caption} onChange={(v) => set('caption', v)} rows={2} maxLength={300} />
        <TextInput id="g-alt" label="Alt text" value={form.alt} onChange={(v) => set('alt', v)} hint="Describes the photo for screen readers." />
        <Select id="g-type" label="Type" value={form.type} onChange={(v) => set('type', v)} options={TYPES} />
        <TextInput id="g-location" label="Location" value={form.location} onChange={(v) => set('location', v)} hint="Only if confirmed by the business." />
        <GujaratiFields id="g" fields={[{ name: 'title', label: 'Title', maxLength: 120 }, { name: 'caption', label: 'Description', type: 'textarea', rows: 2, maxLength: 300 }, { name: 'alt', label: 'Alt text', maxLength: 300 }]} english={form} value={form.gu} onChange={(v) => set('gu', v)} />
        <Toggle id="g-active" label="Shown on the website" checked={form.active} onChange={(v) => set('active', v)} />
      </div>
    </Modal>
  )
}

export default function GalleryPage() {
  const inputId = useId()
  const toast = useToast()
  const { configured, maxBytes } = useMediaStatus()
  const list = useList('/gallery', { defaultSort: 'sortOrder', filterKeys: ['type', 'active'], limit: 24 })
  const [uploads, setUploads] = useState([])
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState('')

  const uploadFiles = async (fileList) => {
    const files = [...fileList]
    const problems = files.map((f) => checkImage(f, maxBytes)).filter(Boolean)
    if (problems.length) return toast.error(problems.join(' '))
    const nextOrder = Math.max(0, ...list.items.map((i) => i.sortOrder ?? 0)) + 1
    let ok = 0
    for (const [i, file] of files.entries()) {
      const key = `${file.name}-${i}`
      setUploads((u) => [...u, { key, name: file.name, progress: 0 }])
      try {
        await api.upload('POST', '/gallery', {
          files: [file],
          fields: { title: titleFromFile(file.name), alt: titleFromFile(file.name), sortOrder: nextOrder + i },
          onProgress: (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))),
        })
        ok += 1
      } catch (err) {
        toast.error(`${file.name}: ${err.message}`)
      } finally {
        setUploads((u) => u.filter((x) => x.key !== key))
      }
    }
    if (ok) toast.success(`${ok} image${ok > 1 ? 's' : ''} added to the gallery. Add titles and descriptions with “Edit”.`)
    list.reload()
  }

  const act = async (key, fn, message) => {
    setBusy(key)
    try {
      await fn()
      if (message) toast.success(message)
      list.reload()
      return true
    } catch (err) {
      toast.error(err.message)
      return false
    } finally {
      setBusy('')
    }
  }

  // Swap display order with the neighbour.
  const move = (index, delta) => {
    const a = list.items[index]
    const b = list.items[index + delta]
    const aOrder = a.sortOrder ?? 0
    const bOrder = b.sortOrder === aOrder ? aOrder + delta : b.sortOrder ?? 0
    return act(`move-${a.id}`, async () => {
      await api.patch(`/gallery/${a.id}`, { sortOrder: bOrder })
      await api.patch(`/gallery/${b.id}`, { sortOrder: aOrder })
    })
  }

  const replace = (item, file) => {
    if (!file) return
    const problem = checkImage(file, maxBytes)
    if (problem) return toast.error(problem)
    return act(`replace-${item.id}`, () => api.upload('PUT', `/gallery/${item.id}/image`, { files: [file], fields: { alt: item.image?.alt } }), 'Image replaced.')
  }

  return (
    <>
      <PageHeader
        title="Gallery"
        description="Original photographs of products, installations and projects."
        actions={
          <>
            <label htmlFor={inputId} className={`btn-primary cursor-pointer ${configured ? '' : 'pointer-events-none opacity-50'}`}>
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload images
            </label>
            <input id={inputId} type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!configured} onChange={(e) => { uploadFiles(e.target.files); e.target.value = '' }} />
          </>
        }
      />
      <UploadLimit className="mb-4" />
      {uploads.length > 0 && (
        <ul className="mb-4 space-y-2">
          {uploads.map((u) => (
            <li key={u.key} className="card p-3 text-sm">
              <p className="mb-1 font-semibold">Uploading {u.name}… {u.progress}%</p>
              <UploadProgress value={u.progress} />
            </li>
          ))}
        </ul>
      )}
      <ListToolbar
        list={list}
        searchPlaceholder="Search title, description or location…"
        filters={[{ key: 'type', label: 'Type', options: TYPES }, { key: 'active', label: 'Shown', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }]}
        sortOptions={[{ value: 'sortOrder', label: 'Display order' }, { value: '-createdAt', label: 'Newest' }, { value: 'title', label: 'Title A–Z' }]}
      />
      {list.error ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.loading && !list.items.length ? (
        <Spinner />
      ) : !list.items.length ? (
        <EmptyState title="No gallery images">Upload original photographs with “Upload images”.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.items.map((item, i) => (
            <li key={item.id} className={`card overflow-hidden ${busy.endsWith(item.id) ? 'opacity-60' : ''}`}>
              <ImagePreview image={item.image} className="aspect-[4/3] w-full rounded-none border-0" />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <Badge tone={item.active ? 'green' : 'grey'}>{item.active ? 'Shown' : 'Hidden'}</Badge>
                </div>
                <p className="text-xs text-steel-500 capitalize">{item.type}{item.location ? ` · ${item.location}` : ''}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button type="button" className="btn-outline px-2 py-1.5 text-xs" onClick={() => setEditing(item)} aria-label={`Edit ${item.title}`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                  </button>
                  <button type="button" className="btn-outline px-2 py-1.5 text-xs" disabled={i === 0 || Boolean(busy) || list.params.sort !== 'sortOrder'} onClick={() => move(i, -1)} aria-label={`Move ${item.title} earlier`}>
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button type="button" className="btn-outline px-2 py-1.5 text-xs" disabled={i === list.items.length - 1 || Boolean(busy) || list.params.sort !== 'sortOrder'} onClick={() => move(i, 1)} aria-label={`Move ${item.title} later`}>
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <label className={`btn-outline cursor-pointer px-2 py-1.5 text-xs ${configured ? '' : 'pointer-events-none opacity-50'}`}>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Replace
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`Replace image for ${item.title}`} onChange={(e) => { replace(item, e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <button type="button" className="btn-outline ml-auto px-2 py-1.5 text-xs text-red-700" onClick={() => setDeleting(item)} aria-label={`Delete ${item.title}`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination list={list} />
      {editing && <EditItem item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); list.reload() }} />}
      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.title}”?`}
          message="The gallery item and its image will be deleted."
          busy={busy === `delete-${deleting.id}`}
          onConfirm={async () => (await act(`delete-${deleting.id}`, () => api.del(`/gallery/${deleting.id}`), 'Gallery item deleted.')) && setDeleting(null)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
