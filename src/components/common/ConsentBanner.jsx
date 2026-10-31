import { useEffect, useState } from 'react'
import { useT } from '../../i18n/LanguageContext'
import { closeConsentSettings, getConsentState, setAnalyticsConsent, subscribeConsent } from '../../services/analytics'

// Asks for analytics consent on the first visit; reopened from "Cookie preferences" in the footer.
export default function ConsentBanner() {
  const t = useT()
  const [{ consent, settingsOpen }, setState] = useState(getConsentState)
  useEffect(() => subscribeConsent(setState), [])

  if (consent && !settingsOpen) return null

  return (
    <section
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-body"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-xl border border-steel-200 bg-white p-5 shadow-2xl sm:inset-x-6"
    >
      <h2 id="consent-title" className="font-display text-lg font-bold text-navy-900">
        {t('consent.title')}
      </h2>
      <p id="consent-body" className="mt-1.5 text-sm text-steel-600">
        {t('consent.body')}
      </p>
      {consent && <p className="mt-2 text-xs font-semibold text-steel-500">{t(consent === 'granted' ? 'consent.granted' : 'consent.denied')}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setAnalyticsConsent(true)}>
          {t('consent.accept')}
        </button>
        <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setAnalyticsConsent(false)}>
          {t('consent.reject')}
        </button>
        {consent && (
          <button type="button" className="ml-auto px-3 py-2 text-sm font-semibold text-steel-600 hover:text-navy-900" onClick={closeConsentSettings}>
            {t('consent.close')}
          </button>
        )}
      </div>
    </section>
  )
}
