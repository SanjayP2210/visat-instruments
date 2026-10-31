import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import en from './en'
import gu from './gu'

// Website language (English default, Gujarati optional). The choice is remembered in this
// browser and applied without a reload. Interface text comes from the dictionaries below;
// owner-managed content is localised separately (see services/siteData.js).
export const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'gu', label: 'ગુજરાતી', name: 'Gujarati' },
]
const DICTIONARIES = { en, gu }
const STORAGE_KEY = 'vi_lang'

function storedLanguage() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value in DICTIONARIES ? value : 'en'
  } catch {
    return 'en' // storage blocked (private mode etc.)
  }
}

/** Translates `key`, falling back to English, then to the key itself. `{name}` placeholders are filled from `vars`. */
export function translate(lang, key, vars) {
  const text = DICTIONARIES[lang]?.[key] ?? en[key] ?? key
  return vars ? text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m)) : text
}

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (key, vars) => translate('en', key, vars) })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(storedLanguage)

  const setLang = useCallback((code) => {
    if (!(code in DICTIONARIES)) return
    setLangState(code)
    try {
      window.localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // not remembered, but still switched for this visit
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => useContext(LanguageContext)
export const useT = () => useContext(LanguageContext).t
