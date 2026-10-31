import { DateRangeFilter, EVENT_LABELS } from '../../components/analytics'
import { DataTable, ListToolbar, Pagination } from '../../components/ListView'
import { Badge, formatDate, PageHeader } from '../../components/ui'
import { useList } from '../../hooks/useList'

const TONES = { whatsapp_click: 'green', phone_click: 'navy', email_click: 'grey', enquiry_submit: 'orange', review_submit: 'orange' }

const columns = [
  { key: 'ts', label: 'Time', render: (e) => <span className="whitespace-nowrap">{formatDate(e.ts)}</span> },
  { key: 'type', label: 'Interaction', render: (e) => <Badge tone={TONES[e.type]}>{EVENT_LABELS[e.type] ?? e.type}</Badge> },
  { key: 'label', label: 'Where', render: (e) => e.label || '—' },
  { key: 'path', label: 'Page', render: (e) => <span className="font-mono text-xs">{e.path}</span> },
  { key: 'device', label: 'Device', render: (e) => <span className="capitalize">{e.device || '—'}</span> },
  { key: 'country', label: 'Country', render: (e) => e.country || '—' },
]

export default function VisitorActivityPage() {
  const list = useList('/analytics/events', { defaultSort: '-ts', filterKeys: ['from', 'to', 'type'], limit: 25 })
  return (
    <>
      <PageHeader title="Visitor activity" description="Contact clicks and form submissions from visitors who allowed analytics. No personal details are stored." />
      <DateRangeFilter />
      <ListToolbar
        list={list}
        searchPlaceholder="Search page or product…"
        filters={[{ key: 'type', label: 'Interaction', options: Object.entries(EVENT_LABELS).map(([value, label]) => ({ value, label })) }]}
        sortOptions={[
          { value: '-ts', label: 'Newest first' },
          { value: 'ts', label: 'Oldest first' },
          { value: 'type', label: 'Interaction' },
        ]}
      />
      <DataTable list={list} columns={columns} emptyTitle="No visitor activity in this period" />
      <Pagination list={list} />
    </>
  )
}
