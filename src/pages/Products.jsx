import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import CtaBand from '../components/common/CtaBand'
import PageHero from '../components/common/PageHero'
import CategoryFilter from '../components/products/CategoryFilter'
import ProductCard from '../components/products/ProductCard'
import { usePageTitle } from '../hooks/usePageTitle'
import { getCategories, getCategoryBySlug, getProducts } from '../services/catalogService'

export default function Products() {
  usePageTitle('Products')
  const [searchParams, setSearchParams] = useSearchParams()
  const categories = getCategories()

  const requested = searchParams.get('category') ?? ''
  const activeCategory = getCategoryBySlug(requested)
  const activeSlug = activeCategory ? activeCategory.slug : ''
  const visible = getProducts({ categorySlug: activeSlug || undefined })

  const counts = useMemo(() => {
    const all = getProducts()
    const result = { '': all.length }
    for (const cat of categories) result[cat.slug] = all.filter((p) => p.categoryId === cat.id).length
    return result
  }, [categories])

  const handleChange = (slug) => {
    setSearchParams(slug ? { category: slug } : {}, { replace: true, preventScrollReset: true })
  }

  return (
    <>
      <PageHero
        eyebrow="Product catalogue"
        title="Products"
        intro="Weighing indicators, electronic scales, junction boxes, communication modules, weighbridges and weighbridge software."
        crumbs={[{ label: 'Products' }]}
      />

      <section className="section">
        <div className="container-x">
          <CategoryFilter categories={categories} active={activeSlug} counts={counts} onChange={handleChange} />

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">{activeCategory ? activeCategory.name : 'All Products'}</h2>
              <p className="mt-1 text-sm text-steel-600" aria-live="polite">
                {activeCategory ? activeCategory.description : 'Browse the complete range.'} Showing {visible.length}{' '}
                {visible.length === 1 ? 'product' : 'products'}.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <div key={product.id} className="animate-fade-in">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

          <p className="mt-10 flex items-start gap-3 rounded-lg border border-steel-200 bg-navy-50 p-4 text-sm text-steel-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" aria-hidden="true" />
            Product photos are actual VISAT INSTRUMENTS products. Capacities, technical specifications and prices are
            confirmed on enquiry for your specific requirement.
          </p>
        </div>
      </section>

      <CtaBand title="Can't find what you need?" text="Tell us your weighing requirement and we will suggest suitable options." />
    </>
  )
}
