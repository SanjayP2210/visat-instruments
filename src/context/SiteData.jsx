import { createContext, useContext, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { usePublicSite } from '../hooks/usePublicSite'
import { useLanguage } from '../i18n/LanguageContext'
import { buildSite, staticSite } from '../services/siteData'

// One shared copy of the public website data for every page (a single /api/public/site
// request, refreshed by usePublicSite). status: 'loading' | 'live' | 'offline'.
// While loading, only the built-in contact details are used; lists show skeletons instead
// of built-in products, so live records are never replaced by static ones.
const SiteDataContext = createContext(staticSite('loading'))

export function SiteDataProvider({ children }) {
  const { pathname } = useLocation()
  const { lang } = useLanguage()
  const { data, loading } = usePublicSite(pathname)
  const site = useMemo(() => (data ? buildSite(data, lang) : staticSite(loading ? 'loading' : 'offline')), [data, loading, lang])

  // Owner-managed favicon (Branding & Media) replaces the built-in one without a redeploy.
  const favicon = site.assets.favicon?.src
  useEffect(() => {
    if (!favicon) return
    const link = document.querySelector('link[rel="icon"]')
    if (link) link.href = favicon
  }, [favicon])

  return <SiteDataContext.Provider value={site}>{children}</SiteDataContext.Provider>
}

export const useSite = () => useContext(SiteDataContext)
export const useBusiness = () => useContext(SiteDataContext).business
