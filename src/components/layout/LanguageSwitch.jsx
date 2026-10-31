import { LANGUAGES, useLanguage } from '../../i18n/LanguageContext'

export default function LanguageSwitch({ className = '', dark = false }) {
  const { lang, setLang, t } = useLanguage()
  return (
    <div role="group" aria-label={t('lang.choose')} className={`inline-flex rounded-md p-0.5 ring-1 ${dark ? 'ring-white/20' : 'ring-steel-200'} ${className}`}>
      {LANGUAGES.map((l) => {
        const active = l.code === lang
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            onClick={() => setLang(l.code)}
            aria-pressed={active}
            title={l.name}
            className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${
              active ? 'bg-navy-900 text-white' : dark ? 'text-navy-100/80 hover:text-white' : 'text-steel-600 hover:text-navy-900'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
