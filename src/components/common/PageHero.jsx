import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n/LanguageContext'

export default function PageHero({ eyebrow, title, intro, crumbs = [] }) {
  const t = useT()
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <div className="grid-lines absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-navy-800/60 lg:block" aria-hidden="true" />
      <div className="container-x relative py-14 sm:py-20">
        <nav aria-label={t('nav.breadcrumb')} className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-navy-100/70">
            <li>
              <Link to="/" className="hover:text-white">
                {t('nav.home')}
              </Link>
            </li>
            {crumbs.map((crumb) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-white">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-3 max-w-3xl text-4xl font-bold sm:text-5xl">{title}</h1>
        {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-100/80 sm:text-lg">{intro}</p>}
      </div>
      <div className="h-1 bg-accent-500" aria-hidden="true" />
    </section>
  )
}
