import { Eye, Phone, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DataTable, ListToolbar, Pagination } from '../components/ListView'
import { useToast } from '../components/Toast'
import { Badge, ConfirmDialog, formatDate, Modal, PageHeader, Select, TextArea } from '../components/ui'
import { useList } from '../hooks/useList'

const STATUSES = [
  { value: 'new', label: 'New', tone: 'orange' },
  { value: 'in-progress', label: 'In progress', tone: 'navy' },
  { value: 'resolved', label: 'Resolved', tone: 'green' },
  { value: 'closed', label: 'Closed', tone: 'grey' },
]
const TYPES = [
  { value: 'general', label: 'General' },
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
]
const statusBadge = (s) => {
  const st = STATUSES.find((x) => x.value === s) ?? STATUSES[0]
  return <Badge tone={st.tone}>{st.label}</Badge>
}

function EnquiryDetail({ enquiry, onClose, onSaved }) {
  const toast = useToast()
  const [status, setStatus] = useState(enquiry.status)
  const [notes, setNotes] = useState(enquiry.notes ?? '')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      const { data } = await api.patch(`/enquiries/${enquiry.id}`, { status, notes })
      toast.success('Enquiry updated.')
      onSaved(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  const about = enquiry.product?.name ?? enquiry.service?.title ?? enquiry.interest
  return (
    <Modal
      title={`Enquiry from ${enquiry.name}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn-outline" onClick={onClose}>Close</button>
          <button type="button" className="btn-primary" onClick={save} disabled={busy}>Save</button>
        </>
      }
    >
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
        <dt className="font-semibold text-steel-600">Received</dt>
        <dd>{formatDate(enquiry.createdAt)}</dd>
        <dt className="font-semibold text-steel-600">Phone</dt>
        <dd>
          <a href={`tel:${enquiry.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 font-semibold text-navy-900 hover:underline">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {enquiry.phone}
          </a>
        </dd>
        {enquiry.email && (
          <>
            <dt className="font-semibold text-steel-600">Email</dt>
            <dd><a href={`mailto:${enquiry.email}`} className="hover:underline">{enquiry.email}</a></dd>
          </>
        )}
        <dt className="font-semibold text-steel-600">Type</dt>
        <dd className="capitalize">{enquiry.type}{about ? ` — ${about}` : ''}</dd>
        <dt className="font-semibold text-steel-600">Message</dt>
        <dd className="whitespace-pre-line">{enquiry.message}</dd>
      </dl>
      <div className="mt-6 grid gap-4 border-t border-steel-200 pt-5">
        <Select id="enquiry-status" label="Status" value={status} onChange={setStatus} options={STATUSES} />
        <TextArea id="enquiry-notes" label="Internal notes" value={notes} onChange={setNotes} rows={3} maxLength={3000} hint="Visible to staff only." />
      </div>
    </Modal>
  )
}

export default function EnquiriesPage() {
  const { isAdmin } = useAuth()
  const toast = useToast()
  const list = useList('/enquiries', { defaultSort: '-createdAt', filterKeys: ['status', 'type'] })
  const [open, setOpen] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/enquiries/${deleting.id}`)
      toast.success('Enquiry deleted.')
      setDeleting(null)
      list.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Enquiries" description="Messages sent through the website enquiry form." />
      <ListToolbar
        list={list}
        searchPlaceholder="Search name, phone, email or message…"
        filters={[{ key: 'status', label: 'Status', options: STATUSES }, { key: 'type', label: 'Type', options: TYPES }]}
        sortOptions={[{ value: '-createdAt', label: 'Newest first' }, { value: 'createdAt', label: 'Oldest first' }, { value: 'status', label: 'Status' }]}
      />
      <DataTable
        list={list}
        emptyTitle="No enquiries yet"
        columns={[
          { key: 'createdAt', label: 'Received', render: (e) => formatDate(e.createdAt) },
          { key: 'name', label: 'Customer', render: (e) => <><span className="font-semibold">{e.name}</span><span className="block text-xs text-steel-500">{e.phone}</span></> },
          { key: 'type', label: 'About', render: (e) => <><span className="capitalize">{e.type}</span><span className="block text-xs text-steel-500">{e.product?.name ?? e.service?.title ?? e.interest ?? ''}</span></> },
          { key: 'status', label: 'Status', render: (e) => statusBadge(e.status) },
        ]}
        actions={(e) => (
          <div className="inline-flex gap-1.5">
            <button type="button" onClick={() => setOpen(e)} className="btn-outline px-2.5 py-1.5 text-xs" aria-label={`View enquiry from ${e.name}`}>
              <Eye className="h-3.5 w-3.5" aria-hidden="true" /> View
            </button>
            {isAdmin && (
              <button type="button" onClick={() => setDeleting(e)} className="btn-outline px-2.5 py-1.5 text-xs text-red-700" aria-label={`Delete enquiry from ${e.name}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      />
      <Pagination list={list} />
      {open && <EnquiryDetail enquiry={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload() }} />}
      {deleting && <ConfirmDialog title="Delete this enquiry?" message={`The enquiry from ${deleting.name} will be permanently deleted.`} busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  )
}
