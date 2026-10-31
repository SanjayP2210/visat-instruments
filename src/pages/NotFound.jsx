import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'

export default function NotFound() {
  const t = useT()
  usePageTitle(t('notFound.title'))
  return (
    <section className="section">
      <div className="container-x max-w-xl text-center">
        <p className="font-display text-7xl font-bold text-accent-500">404</p>
        <h1 className="mt-4 text-3xl font-bold">{t('notFound.title')}</h1>
        <p className="mt-3 text-steel-600">{t('notFound.text')}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-navy">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('notFound.home')}
          </Link>
          <Link to="/products" className="btn-outline">
            {t('notFound.products')}
          </Link>
        </div>
      </div>
    </section>
  )
}
