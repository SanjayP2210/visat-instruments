import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import ImageField, { ImagePreview } from '../components/ImageField'
import { useToast } from '../components/Toast'
import { ErrorState, Modal, PageHeader, Spinner, StringList, TextArea, TextInput } from '../components/ui'

const PAGES = [
  { page: 'home', label: 'Home' },
  { page: 'about', label: 'About Us' },
  { page: 'products', label: 'Products' },
  { page: 'weighbridge-solutions', label: 'Weighbridge Solutions' },
  { page: 'services', label: 'Services' },
  { page: 'gallery', label: 'Gallery' },
  { page: 'contact', label: 'Contact Us' },
]

function EditSeo({ page, current, onClose, onSaved }) {
  const toast = useToast()
  const [form, setForm] = useState({ title: current?.title ?? '', description: current?.description ?? '', keywords: current?.keywords ?? [] })
  const [record, setRecord] = useState(current)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const close = () => (record !== current ? onSaved() : onClose()) // refresh if the image changed
  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/seo/${page.page}`, { ...form, keywords: form.keywords.filter((k) => k.trim()) })
      toast.success(`SEO for ${page.label} saved.`)
      onSaved()
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={`SEO — ${page.label}`} onClose={close} wide footer={<><button type="button" className="btn-outline" onClick={close}>Cancel</button><button type="button" className="btn-primary" onClick={save} disabled={busy}>Save</button></>}>
      <div className="space-y-4">
        <TextInput id="seo-title" label="Meta title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} maxLength={70} hint={`${form.title.length}/70 characters`} error={errors.title} />
        <TextArea id="seo-desc" label="Meta description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} maxLength={170} rows={3} hint={`${form.description.length}/170 characters`} error={errors.description} />
        <StringList id="seo-keywords" label="Keywords" value={form.keywords} onChange={(v) => setForm((f) => ({ ...f, keywords: v }))} placeholder="e.g. weighbridge Ahmedabad" />
        <ImageField label="Social-sharing image" image={record?.ogImage} uploadPath={`/seo/${page.page}/image`} removePath={`/seo/${page.page}/image`} onSaved={setRecord} altDefault={`${page.label} page`} hint="Shown when the page is shared (about 1200×630 px works best)." />
      </div>
    </Modal>
  )
}

export default function SeoPage() {
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = () => {
    setError(null)
    api.get('/seo').then(({ data }) => setSettings(Object.fromEntries(data.map((s) => [s.page, s])))).catch(setError)
  }
  useEffect(load, [])

  return (
    <>
      <PageHeader title="SEO settings" description="Search titles, descriptions and sharing images for each page. Product and service SEO is edited on each product or service." />
      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : !settings ? (
        <Spinner />
      ) : (
        <ul className="space-y-3">
          {PAGES.map((p) => {
            const s = settings[p.page]
            return (
              <li key={p.page} className="card flex flex-wrap items-center gap-4 p-4">
                <ImagePreview image={s?.ogImage} className="h-14 w-24" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{p.label}</p>
                  <p className="truncate text-sm text-navy-800">{s?.title || <span className="text-steel-500">No title set</span>}</p>
                  <p className="truncate text-xs text-steel-500">{s?.description || 'No description set'}</p>
                </div>
                <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => setEditing(p)} aria-label={`Edit SEO for ${p.label}`}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <EditSeo page={editing} current={settings?.[editing.page]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}
