import { useState } from 'react'
import { DateRangeFilter } from '../../components/analytics'
import { DataTable, ListToolbar, Pagination } from '../../components/ListView'
import { Badge, formatDate, Modal, PageHeader } from '../../components/ui'
import { useList } from '../../hooks/useList'

const LEVELS = [
  { value: 'critical', label: 'Critical', tone: 'red' },
  { value: 'error', label: 'Error', tone: 'orange' },
  { value: 'warn', label: 'Warning', tone: 'navy' },
  { value: 'info', label: 'Info', tone: 'grey' },
]
const levelBadge = (level) => {
  const l = LEVELS.find((x) => x.value === level) ?? LEVELS[3]
  return <Badge tone={l.tone}>{l.label}</Badge>
}

function LogDetail({ log, onClose }) {
  return (
    <Modal title={log.code} onClose={onClose} wide footer={<button type="button" className="btn-outline" onClick={onClose}>Close</button>}>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="font-semibold text-steel-600">Time</dt>
        <dd>{formatDate(log.ts)}</dd>
        <dt className="font-semibold text-steel-600">Severity</dt>
        <dd>{levelBadge(log.level)}</dd>
        <dt className="font-semibold text-steel-600">Message</dt>
        <dd className="break-words">{log.message || '—'}</dd>
        <dt className="font-semibold text-steel-600">Request</dt>
        <dd className="font-mono text-xs break-all">{log.route ? `${log.method} ${log.route}` : '—'}{log.status ? ` → ${log.status}` : ''}</dd>
        <dt className="font-semibold text-steel-600">Request ID</dt>
        <dd className="font-mono text-xs">{log.requestId || '—'}</dd>
        <dt className="font-semibold text-steel-600">Context</dt>
        <dd>{log.context ? <pre className="overflow-x-auto rounded bg-navy-50 p-3 text-xs">{JSON.stringify(log.context, null, 2)}</pre> : '—'}</dd>
      </dl>
    </Modal>
  )
}

export default function SystemLogsPage() {
  const list = useList('/logs/system', { defaultSort: '-ts', filterKeys: ['from', 'to', 'level'], limit: 25 })
  const [open, setOpen] = useState(null)
  const columns = [
    { key: 'ts', label: 'Time', render: (l) => <span className="whitespace-nowrap">{formatDate(l.ts)}</span> },
    { key: 'level', label: 'Severity', render: (l) => levelBadge(l.level) },
    { key: 'code', label: 'Code', render: (l) => <span className="font-mono text-xs font-semibold">{l.code}</span> },
    { key: 'message', label: 'Message', className: 'max-w-md', render: (l) => <span className="line-clamp-2">{l.message}</span> },
    { key: 'route', label: 'Route', render: (l) => (l.route ? <span className="font-mono text-xs">{l.method} {l.route}</span> : '—') },
    { key: 'status', label: 'Status', render: (l) => l.status ?? '—' },
  ]
  return (
    <>
      <PageHeader title="System logs" description="API errors, failed sign-ins, blocked requests, database and image-storage problems. Kept for 90 days." />
      <DateRangeFilter />
      <ListToolbar
        list={list}
        searchPlaceholder="Search code, message or route…"
        filters={[{ key: 'level', label: 'Severity', options: LEVELS }]}
        sortOptions={[
          { value: '-ts', label: 'Newest first' },
          { value: 'ts', label: 'Oldest first' },
          { value: 'level', label: 'Severity' },
          { value: 'code', label: 'Code' },
        ]}
      />
      <DataTable
        list={list}
        columns={columns}
        emptyTitle="No log entries in this period"
        actions={(l) => (
          <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => setOpen(l)}>
            Details
          </button>
        )}
      />
      <Pagination list={list} />
      {open && <LogDetail log={open} onClose={() => setOpen(null)} />}
    </>
  )
}
