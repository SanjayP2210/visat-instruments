import { AlertTriangle, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useToast } from '../components/Toast'
import { Badge, ConfirmDialog, ErrorState, Modal, PageHeader, Spinner, StringList, TextArea, TextInput, Toggle } from '../components/ui'

// Sections the API accepts. Unconfirmed sections must stay unpublished until the business confirms them.
const SECTIONS = [
  { key: 'home', label: 'Homepage' },
  { key: 'about', label: 'About Us' },
  { key: 'weighbridge', label: 'Weighbridge solutions' },
  { key: 'contact', label: 'Contact' },
  { key: 'why-choose-us', label: 'Why choose us' },
  { key: 'spare-parts', label: 'Spare parts & accessories' },
  { key: 'manufacturing', label: 'Manufacturing capabilities', unconfirmed: true },
  { key: 'taglines', label: 'Taglines', unconfirmed: true },
  { key: 'marketing-claims', label: 'Marketing claims', unconfirmed: true },
]

// Simple sections ({ title?, intro?, items?: string[] }) get a form; others a JSON editor.
const isSimple = (data) =>
  Object.entries(data ?? {}).every(([k, v]) => (k === 'title' || k === 'intro' ? typeof v === 'string' : k === 'items' ? Array.isArray(v) && v.every((x) => typeof x === 'string') : false))

function SectionEditor({ section, current, onClose, onSaved }) {
  const toast = useToast()
  const data = current?.data ?? {}
  const simple = isSimple(data)
  const [form, setForm] = useState({ title: data.title ?? '', intro: data.intro ?? '', items: data.items ?? [] })
  const [json, setJson] = useState(JSON.stringify(data, null, 2))
  const [published, setPublished] = useState(Boolean(current?.published))
  const [error, setError] = useState('')
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async (force = false) => {
    let body
    if (simple) {
      body = {}
      if (form.title || 'title' in data) body.title = form.title
      if (form.intro || 'intro' in data) body.intro = form.intro
      if (form.items.length || 'items' in data) body.items = form.items.filter((x) => x.trim())
    } else {
      try {
        body = JSON.parse(json)
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
      } catch {
        return setError('Enter valid JSON (an object, e.g. { "title": "…" }).')
      }
    }
    if (section.unconfirmed && published && !current?.published && !force) return setConfirmPublish(true)
    setBusy(true)
    setError('')
    try {
      await api.put(`/content/${section.key}`, { data: body, published })
      toast.success(`${section.label} saved${published ? ' and published' : ''}.`)
      onSaved()
    } catch (err) {
      setError(Object.values(err.fieldErrors ?? {})[0] ?? err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={section.label} onClose={onClose} wide footer={<><button type="button" className="btn-outline" onClick={onClose}>Cancel</button><button type="button" className="btn-primary" onClick={() => save()} disabled={busy}>Save</button></>}>
      <div className="space-y-4">
        {section.unconfirmed && (
          <p className="flex gap-2 rounded-lg border border-accent-100 bg-accent-50 p-3 text-sm text-navy-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
            This content is not confirmed by the business. Keep it unpublished until it is confirmed.
          </p>
        )}
        {simple ? (
          <>
            <TextInput id="c-title" label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
            <TextArea id="c-intro" label="Introduction" value={form.intro} onChange={(v) => setForm((f) => ({ ...f, intro: v }))} rows={3} />
            <StringList id="c-items" label="Items" value={form.items} onChange={(v) => setForm((f) => ({ ...f, items: v }))} max={50} />
          </>
        ) : (
          <TextArea id="c-json" label="Content (JSON)" value={json} onChange={setJson} rows={14} className="font-mono" hint="Structured content. Keep the existing keys; the website reads them." />
        )}
        <Toggle id="c-published" label="Published on the website" checked={published} onChange={setPublished} />
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      </div>
      {confirmPublish && (
        <ConfirmDialog
          title="Publish unconfirmed content?"
          message={`“${section.label}” has not been confirmed by the business. Publish it only if it has now been confirmed.`}
          confirmLabel="Yes, it is confirmed"
          onCancel={() => setConfirmPublish(false)}
          onConfirm={() => { setConfirmPublish(false); save(true) }}
        />
      )}
    </Modal>
  )
}

export default function ContentPage() {
  const [sections, setSections] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const load = () => {
    setError(null)
    api.get('/content').then(({ data }) => setSections(Object.fromEntries(data.map((s) => [s.key, s])))).catch(setError)
  }
  useEffect(load, [])

  return (
    <>
      <PageHeader title="Website content" description="Editable content sections. Only published sections appear on the website." />
      {error ? (
        <ErrorState error={error} onRetry={load} />
      ) : !sections ? (
        <Spinner />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const current = sections[s.key]
            return (
              <li key={s.key} className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold">{s.label}</p>
                  <p className="mt-1 flex flex-wrap gap-1.5">
                    {!current ? <Badge>Not set up</Badge> : current.published ? <Badge tone="green">Published</Badge> : <Badge>Unpublished</Badge>}
                    {s.unconfirmed && <Badge tone="orange">Unconfirmed</Badge>}
                  </p>
                </div>
                <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => setEditing(s)} aria-label={`Edit ${s.label}`}>
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {editing && <SectionEditor section={editing} current={sections?.[editing.key]} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />}
    </>
  )
}
