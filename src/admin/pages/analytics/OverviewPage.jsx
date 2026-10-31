import { DateRangeFilter, BarList, Panel, StatTile, TrendChart, useReport } from '../../components/analytics'
import { ErrorState, PageHeader, Spinner } from '../../components/ui'

const TILES = [
  { key: 'visitors', label: 'Unique visitors', hint: 'Counted per day' },
  { key: 'sessions', label: 'Visits (sessions)' },
  { key: 'pageViews', label: 'Page views' },
  { key: 'whatsappClicks', label: 'WhatsApp clicks' },
  { key: 'phoneClicks', label: 'Phone clicks' },
  { key: 'enquiries', label: 'Contact enquiries', hint: 'All received' },
  { key: 'reviews', label: 'Reviews submitted', hint: 'From the website' },
]

export default function OverviewPage() {
  const { data, error, loading, reload } = useReport('/analytics/overview')
  return (
    <>
      <PageHeader title="Analytics overview" description="Website traffic from visitors who allowed analytics. Enquiries and reviews count every submission." />
      <DateRangeFilter />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Spinner />
      ) : (
        <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {TILES.map((t) => (
              <li key={t.key}>
                <StatTile label={t.label} value={data.totals[t.key]} hint={t.hint} />
              </li>
            ))}
          </ul>
          <Panel title="Daily traffic">
            <TrendChart data={data.daily} series={[{ key: 'pageViews', label: 'Page views' }, { key: 'sessions', label: 'Visits' }]} />
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Popular pages">
              <BarList rows={data.topPages} />
            </Panel>
            <Panel title="Most viewed products">
              <BarList rows={data.topProducts} />
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}
