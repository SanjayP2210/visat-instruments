import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics, trackPageView } from '../services/analytics'

/** Records a page view per route change (only with analytics consent; duplicates are ignored). */
export function usePageTracking() {
  const { pathname } = useLocation()
  useEffect(() => {
    initAnalytics()
    trackPageView(pathname)
  }, [pathname])
}
