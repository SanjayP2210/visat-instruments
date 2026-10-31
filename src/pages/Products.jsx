import { ChevronLeft, ChevronRight, Info, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import PageHero from '../components/common/PageHero'
import CategoryFilter from '../components/products/CategoryFilter'
import ProductCard, { ProductCardSkeleton } from '../components/products/ProductCard'
import { useSite } from '../context/SiteData'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'
import { getCategories, getCategoryBySlug, getProducts } from '../services/catalogService'

const PAGE_SIZE = 12

export default function Products() {
  const t = useT()
  usePageTitle(t('nav.products'), { page: 'products' })
  const site = useSite()
  const [searchParams, setSearchParams] = useSearchParams()
  const categories = getCategories(site)

  const requested = searchParams.get('category') ?? ''
  const query = searchParams.get('q') ?? ''
  const activeCategory = getCategoryBySlug(site, requested)
  const activeSlug = activeCategory ? activeCategory.slug : ''
  const matching = getProducts(site, { categorySlug: activeSlug || undefined, query })
  const pages = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Number(searchParams.get('page')) || 1))
  const visible = matching.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const counts = useMemo(() => {
    const all = getProducts(site, { query })
    const result = { '': all.length }
    for (const cat of categories) result[cat.slug] = all.filter((p) => p.categoryId === cat.id).length
    return result
  }, [site, categories, query])

  // Keeps the other filters; changing the category or search goes back to page 1.
  const update = (changes) => {
    const next = { category: activeSlug, q: query, page: String(page), ...changes }
    if ('category' in changes || 'q' in changes) next.page = '1'
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([k, v]) => v && !(k === 'page' && v === '1'))), { replace: true, preventScrollReset: true })
  }

  const loading = site.status === 'loading'

  return (
    <>
      <PageHero
        eyebrow={t('products.eyebrow')}
        title={t('nav.products')}
        intro={t('products.intro')}
        crumbs={[{ label: t('nav.products') }]}
      />

      <section className="section">
        <div className="container-x">
          <div className="mb-6 max-w-md">
            <label htmlFor="product-search" className="sr-only">
              {t('products.search')}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-steel-500" aria-hidden="true" />
              <input
                id="product-search"
                type="search"
                className="field-input pl-9"
                placeholder={t('products.search')}
                value={query}
                onChange={(e) => update({ q: e.target.value })}
              />
            </div>
          </div>

          <CategoryFilter categories={categories} active={activeSlug} counts={counts} onChange={(slug) => update({ category: slug })} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{activeCategory ? activeCategory.name : t('products.all')}</h2>
              {!loading && (
                <p className="mt-1 text-sm text-steel-600" aria-live="polite">
                  {activeCategory ? activeCategory.description : t('products.browse')}{' '}
                  {query ? t('products.showingFor', { count: matching.length, query }) : t('products.showing', { count: matching.length })}
                </p>
              )}
            </div>
          </div>

          {site.status === 'offline' && (
            <p className="mt-6 rounded-lg border border-steel-200 bg-white p-4 text-sm text-steel-600" role="status">
              {t('products.offline')}
            </p>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
            {loading
              ? Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)
              : visible.map((product) => (
                  <div key={product.id} className="animate-fade-in">
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>

          {!loading && matching.length === 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-steel-300 p-8 text-center text-sm text-steel-600">
              {t('products.none')}
            </p>
          )}

          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label={t('products.pages')}>
              <button type="button" className="btn-outline px-3 py-2 text-xs" disabled={page === 1} onClick={() => update({ page: String(page - 1) })}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {t('common.previous')}
              </button>
              <span className="px-3 text-sm text-steel-600">
                {t('products.page', { page, pages })}
              </span>
              <button type="button" className="btn-outline px-3 py-2 text-xs" disabled={page === pages} onClick={() => update({ page: String(page + 1) })}>
                {t('common.next')} <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          )}

          <p className="mt-10 flex items-start gap-3 rounded-lg border border-steel-200 bg-navy-50 p-4 text-sm text-steel-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
            {t('products.photoNote')}
          </p>
        </div>
      </section>

      <CtaBand title={t('products.ctaTitle')} text={t('products.ctaText')} />
    </>
  )
}
