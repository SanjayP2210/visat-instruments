// Shared pieces for the Analytics & Logs pages: date range filter, report loader, stat tiles,
// the traffic trend chart and ranked bar lists.
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api/client'
import { EmptyState } from './ui'

// Validated categorical pair (light surface, CVD-safe): series 1 blue, series 2 orange.
export const SERIES = ['#2a62c9', '#dc5f0a']

const isoDay = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const daysAgo = (n) => isoDay(new Date(Date.now() - n * 86400000))
const PRESETS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
]

/** Date range kept in the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD); defaults to the last 30 days. */
export function useDateRange() {
  const [params] = useSearchParams()
  return { from: params.get('from') || daysAgo(29), to: params.get('to') || isoDay(new Date()) }
}

export function DateRangeFilter() {
  const [, setParams] = useSearchParams()
  const { from, to } = useDateRange()
  const set = (next) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(next)) (v ? p.set(k, v) : p.delete(k))
        p.delete('page')
        return p
      },
      { replace: true },
    )
  const today = isoDay(new Date())
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick date ranges">
        {PRESETS.map((p) => {
          const active = from === daysAgo(p.days - 1) && to === today
          return (
            <button key={p.days} type="button" aria-pressed={active} onClick={() => set({ from: daysAgo(p.days - 1), to: today })} className={`rounded-md border px-3 py-2 text-xs font-semibold ${active ? 'border-navy-900 bg-navy-900 text-white' : 'border-steel-200 bg-white text-navy-900 hover:border-navy-900'}`}>
              {p.label}
            </button>
          )
        })}
      </div>
      <label className="text-xs font-semibold text-steel-600">
        From
        <input type="date" value={from} max={to} onChange={(e) => e.target.value && set({ from: e.target.value })} className="field-input mt-1 py-2" />
      </label>
      <label className="text-xs font-semibold text-steel-600">
        To
        <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && set({ to: e.target.value })} className="field-input mt-1 py-2" />
      </label>
    </div>
  )
}

/** Loads a report for the current date range. */
export function useReport(path) {
  const { from, to } = useDateRange()
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [key, setKey] = useState(0)
  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .get(path, { from, to })
      .then(({ data }) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      active = false
    }
  }, [path, from, to, key])
  return { ...state, reload: useCallback(() => setKey((k) => k + 1), []) }
}

const number = (n) => Number(n ?? 0).toLocaleString('en-IN')

export function StatTile({ label, value, hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-steel-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold text-navy-900 tabular-nums">{typeof value === 'number' ? number(value) : value}</p>
      {hint && <p className="mt-0.5 text-xs text-steel-500">{hint}</p>}
    </div>
  )
}

export function Panel({ title, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h2 className="mb-4 text-base font-bold">{title}</h2>
      {children}
    </section>
  )
}

const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-steel-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-bold text-navy-900">{shortDate(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-navy-900">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} aria-hidden="true" />
          <span className="text-steel-600">{p.name}</span>
          <span className="ml-auto font-semibold tabular-nums">{number(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

/** Daily line chart (one shared y-axis), with a table view for screen readers and exact values. */
export function TrendChart({ data, series }) {
  if (!data?.length) return <EmptyState title="No data for this period" />
  return (
    <>
      <div className="h-64" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="#dde3ea" vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={{ stroke: '#dde3ea' }} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#667085' }} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#667085', strokeDasharray: '3 3' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#0b1f3a' }} />
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={SERIES[i]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-steel-600">Show as table</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-steel-600">
              <tr>
                <th scope="col" className="py-1">Date</th>
                {series.map((s) => (
                  <th key={s.key} scope="col" className="py-1 text-right">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.date} className="border-t border-steel-200">
                  <td className="py-1">{row.date}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1 text-right tabular-nums">{number(row[s.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  )
}

/** Ranked list with proportional bars (single hue: magnitude only). */
export function BarList({ rows, labelOf = (r) => r.name, empty = 'No data for this period' }) {
  if (!rows?.length) return <p className="text-sm text-steel-500">{empty}</p>
  const max = Math.max(...rows.map((r) => r.count), 1)
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const label = labelOf(r)
        return (
          <li key={label} className="relative flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm" title={`${label}: ${number(r.count)} (${Math.round((r.count / total) * 100)}%)`}>
            <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(r.count / max) * 100}%`, background: `${SERIES[0]}1f` }} aria-hidden="true" />
            <span className="relative truncate text-navy-900">{label}</span>
            <span className="relative font-semibold text-navy-900 tabular-nums">{number(r.count)}</span>
          </li>
        )
      })}
    </ul>
  )
}

export const EVENT_LABELS = {
  whatsapp_click: 'WhatsApp click',
  phone_click: 'Phone click',
  email_click: 'Email click',
  enquiry_submit: 'Enquiry submitted',
  review_submit: 'Review submitted',
}
