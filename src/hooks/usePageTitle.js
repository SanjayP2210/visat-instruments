import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useSite } from '../context/SiteData'
import { useLanguage } from '../i18n/LanguageContext'

const OG_LOCALE = { en: 'en_IN', gu: 'gu_IN' }
const DEFAULT_IMAGE = '/images/branding/visat-instruments-logo-240.png'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!content) return el?.remove()
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

const absolute = (url) => (url ? new URL(url, window.location.origin).href : '')

/**
 * Page title plus SEO and social-sharing tags.
 * `page` picks the admin-managed SEO settings (SEO page in the admin panel); `seo` holds
 * record-level values (e.g. a product's own SEO fields) that take priority.
 */
export function usePageTitle(title, { page, seo = {}, description, image } = {}) {
  const site = useSite()
  const { lang, t } = useLanguage()
  const { pathname } = useLocation()
  const pageSeo = (page && site.seo[page]) || {}
  const name = site.business.name

  const fullTitle = seo.title || pageSeo.title || (title ? `${title} | ${name}` : t('seo.defaultTitle', { name }))
  const metaDescription = seo.description || pageSeo.description || description || t('seo.defaultDescription')
  const shareImage = absolute(image || pageSeo.ogImage?.url || site.assets['og-default']?.src || DEFAULT_IMAGE)
  const keywords = (seo.keywords?.length ? seo.keywords : pageSeo.keywords)?.join(', ')

  useEffect(() => {
    const url = window.location.origin + pathname
    document.title = fullTitle
    setMeta('name', 'description', metaDescription)
    setMeta('name', 'keywords', keywords)
    setCanonical(url)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:locale', OG_LOCALE[lang])
    setMeta('property', 'og:site_name', name)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', metaDescription)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', shareImage)
    setMeta('name', 'twitter:card', 'summary_large_image')
  }, [fullTitle, metaDescription, keywords, shareImage, name, pathname, lang])
}
