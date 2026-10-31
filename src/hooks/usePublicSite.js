import { useEffect, useState } from 'react'
import { publicApi } from '../utils/publicApi'

// Loads the public website data (GET /api/public/site) and shares it between components.
// Reviews in it are already limited to approved + published + consent recorded.
// One request is shared by every caller; it is refetched when older than REFRESH_MS and
// `refreshKey` changes (e.g. on navigation), so admin changes appear without a full reload.
const REFRESH_MS = 60 * 1000
let cache = null // { promise, at }

function load() {
  if (!cache || Date.now() - cache.at > REFRESH_MS) {
    const promise = publicApi.site().catch((err) => {
      cache = null // allow a retry on the next mount
      throw err
    })
    cache = { promise, at: Date.now() }
  }
  return cache.promise
}

export function usePublicSite(refreshKey) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  useEffect(() => {
    let active = true
    load()
      .then((data) => active && setState((s) => (s.data === data ? s : { data, loading: false, error: null })))
      // A failed refresh keeps the data already shown.
      .catch((error) => active && setState((s) => (s.data ? s : { data: null, loading: false, error })))
    return () => {
      active = false
    }
  }, [refreshKey])
  return state
}
