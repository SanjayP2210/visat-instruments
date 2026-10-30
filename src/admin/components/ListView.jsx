// Reusable list pieces: toolbar (search, filters, sort), data table and pagination.
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState, ErrorState, Spinner } from './ui'

export function ListToolbar({ list, searchPlaceholder = 'Search…', filters = [], sortOptions = [] }) {
  const [q, setQ] = useState(list.params.q)
  useEffect(() => setQ(list.params.q), [list.params.q])
  useEffect(() => {
    const t = setTimeout(() => q !== list.params.q && list.setParam('q', q.trim()), 350)
    return () => clearTimeout(t)
  }, [q, list])

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="relative min-w-52 flex-1">
        <span className="sr-only">Search</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel-500" aria-hidden="true" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} className="field-input pl-9" />
      </label>
      {filters.map((f) => (
        <label key={f.key} className="text-xs font-semibold text-steel-600">
          {f.label}
          <select value={list.params[f.key]} onChange={(e) => list.setParam(f.key, e.target.value)} className="field-input mt-1 py-2">
            <option value="">All</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {sortOptions.length > 0 && (
        <label className="text-xs font-semibold text-steel-600">
          Sort by
          <select value={list.params.sort} onChange={(e) => list.setParam('sort', e.target.value)} className="field-input mt-1 py-2">
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}

/** columns: [{ key, label, render(item), className }] */
export function DataTable({ list, columns, rowKey = 'id', emptyTitle = 'No records found', emptyHint, actions }) {
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />
  if (list.loading && !list.items.length) return <Spinner className="py-10" />
  if (!list.items.length) {
    return <EmptyState title={list.params.q ? 'No matches for your search' : emptyTitle}>{list.params.q ? 'Try a different search or clear the filters.' : emptyHint}</EmptyState>
  }
  return (
    <div className={`overflow-x-auto rounded-xl border border-steel-200 bg-white ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b border-steel-200 bg-navy-50 text-xs font-bold tracking-wide text-steel-600 uppercase">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-4 py-3 ${c.className ?? ''}`}>
                {c.label}
              </th>
            ))}
            {actions && (
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-steel-200">
          {list.items.map((item) => (
            <tr key={item[rowKey]} className="hover:bg-navy-50/50">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                  {c.render ? c.render(item) : item[c.key]}
                </td>
              ))}
              {actions && <td className="px-4 py-3 text-right whitespace-nowrap">{actions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ list }) {
  const meta = list.meta
  if (!meta || meta.total === 0) return null
  const from = (meta.page - 1) * meta.limit + 1
  const to = Math.min(meta.page * meta.limit, meta.total)
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-steel-600">
      <p>
        Showing {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-outline px-3 py-2" disabled={meta.page <= 1} onClick={() => list.setParam('page', meta.page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <span>
          Page {meta.page} of {meta.totalPages}
        </span>
        <button type="button" className="btn-outline px-3 py-2" disabled={meta.page >= meta.totalPages} onClick={() => list.setParam('page', meta.page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
