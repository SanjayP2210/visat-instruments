import { useState } from 'react'
import { DateRangeFilter } from '../../components/analytics'
import { DataTable, ListToolbar, Pagination } from '../../components/ListView'
import { Badge, formatDate, Modal, PageHeader } from '../../components/ui'
import { useList } from '../../hooks/useList'

const ENTITY_TYPES = [
  ['user', 'Users & sign-in'],
  ['product', 'Products'],
  ['category', 'Categories'],
  ['brand', 'Brands'],
  ['service', 'Services'],
  ['gallery', 'Gallery'],
  ['branding', 'Branding & media'],
  ['review', 'Reviews'],
  ['enquiry', 'Enquiries'],
  ['business_profile', 'Business profile'],
  ['content', 'Website content'],
  ['seo', 'SEO'],
  ['media', 'Media storage'],
].map(([value, label]) => ({ value, label }))

const verbTone = (action) => (/delete|remove/.test(action) ? 'red' : /create|add|login/.test(action) ? 'green' : /price|permission|moderate|password/.test(action) ? 'orange' : 'navy')
const readable = (action) => action.replace('.', ' · ').replaceAll('_', ' ')
const show = (v) => (v === undefined || v === null || v === '' ? '—' : String(v))

function ActivityDetail({ entry, onClose }) {
  return (
    <Modal title={readable(entry.action)} onClose={onClose} wide footer={<button type="button" className="btn-outline" onClick={onClose}>Close</button>}>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-steel-600">Time</dt>
        <dd>{formatDate(entry.ts)}</dd>
        <dt className="font-semibold text-steel-600">By</dt>
        <dd>{entry.actor?.name ?? '—'} <span className="text-steel-500 capitalize">({entry.actor?.role})</span></dd>
        <dt className="font-semibold text-steel-600">Item</dt>
        <dd>{entry.entity?.label || entry.entity?.id || '—'} <span className="text-steel-500">({entry.entity?.type})</span></dd>
        {entry.ip && (
          <>
            <dt className="font-semibold text-steel-600">Network</dt>
            <dd className="font-mono text-xs">{entry.ip}</dd>
          </>
        )}
      </dl>
      {entry.changes?.length > 0 && (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs text-steel-600 uppercase">
            <tr>
              <th scope="col" className="py-1">Field</th>
              <th scope="col" className="py-1">Before</th>
              <th scope="col" className="py-1">After</th>
            </tr>
          </thead>
          <tbody>
            {entry.changes.map((c) => (
              <tr key={c.field} className="border-t border-steel-200">
                <td className="py-1.5 font-mono text-xs">{c.field}</td>
                <td className="py-1.5">{'from' in c || 'to' in c ? show(c.from) : <span className="text-steel-500">changed</span>}</td>
                <td className="py-1.5">{'from' in c || 'to' in c ? show(c.to) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

export default function AdminActivityPage() {
  const list = useList('/logs/admin-activity', { defaultSort: '-ts', filterKeys: ['from', 'to', 'entityType'], limit: 25 })
  const [open, setOpen] = useState(null)
  const columns = [
    { key: 'ts', label: 'Time', render: (a) => <span className="whitespace-nowrap">{formatDate(a.ts)}</span> },
    { key: 'actor', label: 'By', render: (a) => <span className="font-semibold">{a.actor?.name ?? '—'}</span> },
    { key: 'action', label: 'Action', render: (a) => <Badge tone={verbTone(a.action)}>{readable(a.action)}</Badge> },
    { key: 'entity', label: 'Item', render: (a) => a.entity?.label || '—' },
    { key: 'summary', label: 'Summary', className: 'max-w-sm', render: (a) => <span className="line-clamp-2 text-steel-600">{a.summary || ''}</span> },
  ]
  return (
    <>
      <PageHeader title="Admin activity" description="Who changed what in the admin panel, and when. Passwords and other secrets are never recorded. Kept for 2 years." />
      <DateRangeFilter />
      <ListToolbar
        list={list}
        searchPlaceholder="Search person, action or item…"
        filters={[{ key: 'entityType', label: 'Area', options: ENTITY_TYPES }]}
        sortOptions={[
          { value: '-ts', label: 'Newest first' },
          { value: 'ts', label: 'Oldest first' },
          { value: 'action', label: 'Action' },
        ]}
      />
      <DataTable
        list={list}
        columns={columns}
        emptyTitle="No admin activity in this period"
        actions={(a) => (
          <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(a)}>
            Details
          </button>
        )}
      />
      <Pagination list={list} />
      {open && <ActivityDetail entry={open} onClose={() => setOpen(null)} />}
    </>
  )
}
