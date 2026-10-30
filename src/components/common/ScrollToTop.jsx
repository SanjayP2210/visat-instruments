import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scrolls to the top on page change, or to the #section when the URL has a hash.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
    if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' })
    else window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}
