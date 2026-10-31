import { Outlet } from 'react-router-dom'
import { SiteDataProvider } from '../../context/SiteData'
import { usePageTracking } from '../../hooks/usePageTracking'
import { LanguageProvider, useT } from '../../i18n/LanguageContext'
import ConsentBanner from '../common/ConsentBanner'
import ScrollToTop from '../common/ScrollToTop'
import FloatingWhatsApp from './FloatingWhatsApp'
import Footer from './Footer'
import Header from './Header'

export default function Layout() {
  return (
    <LanguageProvider>
      <SiteDataProvider>
        <Shell />
      </SiteDataProvider>
    </LanguageProvider>
  )
}

function Shell() {
  const t = useT()
  usePageTracking()
  return (
    <>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-navy-900 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t('nav.skip')}
        </a>
        <ScrollToTop />
        <Header />
        <main id="main" className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <FloatingWhatsApp />
        <ConsentBanner />
      </div>
    </>
  )
}
