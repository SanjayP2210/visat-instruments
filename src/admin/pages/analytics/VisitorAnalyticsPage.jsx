import { BarList, DateRangeFilter, Panel, StatTile, useReport } from '../../components/analytics'
import { ErrorState, PageHeader, Spinner } from '../../components/ui'

const duration = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
const countryName = (code) => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

export default function VisitorAnalyticsPage() {
  const { data, error, loading, reload } = useReport('/analytics/audience')
  return (
    <>
      <PageHeader title="Visitor analytics" description="Where visitors come from, what they use and what they look at. Locations are approximate (country / state)." />
      <DateRangeFilter />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Spinner />
      ) : (
        <div className={`space-y-5 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <ul className="grid gap-3 sm:grid-cols-3">
            <li><StatTile label="Pages per visit" value={data.engagement.pagesPerSession} /></li>
            <li><StatTile label="Average visit length" value={duration(data.engagement.avgSessionSeconds)} /></li>
            <li><StatTile label="Single-page visits" value={`${data.engagement.singlePageRate}%`} /></li>
          </ul>
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Traffic sources"><BarList rows={data.sources} /></Panel>
            <Panel title="Channel (medium)"><BarList rows={data.mediums} /></Panel>
            <Panel title="Landing pages"><BarList rows={data.landingPages} /></Panel>
            <Panel title="Devices"><BarList rows={data.devices} /></Panel>
            <Panel title="Browsers"><BarList rows={data.browsers} /></Panel>
            <Panel title="Operating systems"><BarList rows={data.os} /></Panel>
            <Panel title="Countries"><BarList rows={data.countries} labelOf={(r) => (r.name === 'Unknown' ? 'Unknown' : countryName(r.name))} /></Panel>
            <Panel title="Indian states (region code)"><BarList rows={data.regions} /></Panel>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Popular pages"><BarList rows={data.pages} /></Panel>
            <Panel title="Product views"><BarList rows={data.products} /></Panel>
          </div>
        </div>
      )}
    </>
  )
}
