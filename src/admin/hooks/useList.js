import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

/**
 * Loads a paginated API list. Search, filters, sort and page live in the URL, so lists can be
 * bookmarked and the browser back button works. `filterKeys` are passed through as API filters.
 */
export function useList(path, { defaultSort, filterKeys = [], limit = 20 } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ items: [], meta: null, loading: true, error: null })
  const [reloadKey, setReloadKey] = useState(0)

  const filterKeyList = filterKeys.join(',') // stable dependency even when callers pass a new array
  const params = useMemo(() => {
    const p = { page: Number(searchParams.get('page')) || 1, limit, sort: searchParams.get('sort') || defaultSort, q: searchParams.get('q') || '' }
    for (const key of filterKeyList.split(',').filter(Boolean)) p[key] = searchParams.get(key) || ''
    return p
  }, [searchParams, defaultSort, filterKeyList, limit])

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: null }))
    api
      .get(path, params)
      .then(({ data, meta }) => active && setState({ items: data, meta, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ ...s, loading: false, error })))
    return () => {
      active = false
    }
  }, [path, params, reloadKey])

  const setParam = useCallback(
    (key, value) =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === '' || value === undefined || value === null) next.delete(key)
          else next.set(key, String(value))
          if (key !== 'page') next.delete('page') // new search/filter → first page
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )

  return { ...state, params, setParam, reload: () => setReloadKey((k) => k + 1) }
}
