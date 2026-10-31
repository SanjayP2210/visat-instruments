import { ArrowLeft, Check, Info, Mail, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ContactButtons from '../components/common/ContactButtons'
import Lightbox from '../components/common/Lightbox'
import PageHero from '../components/common/PageHero'
import PendingBadge from '../components/common/PendingBadge'
import SectionHeading from '../components/common/SectionHeading'
import PriceTag from '../components/products/PriceTag'
import ProductCard from '../components/products/ProductCard'
import ProductImage from '../components/products/ProductImage'
import { useSite } from '../context/SiteData'
import { PENDING } from '../data/products'
import { usePageTitle } from '../hooks/usePageTitle'
import { useT } from '../i18n/LanguageContext'
import { getCategoryById, getProductBySlug, getRelatedProducts } from '../services/catalogService'
import { productEnquiryMessage } from '../utils/whatsapp'
import NotFound from './NotFound'

// The price block replaces any old "Price: On enquiry" specification row.
const isPriceRow = (spec) => /^price$/i.test(spec.label.trim())

function DetailSkeleton() {
  return (
    <section className="section" aria-busy="true">
      <div className="container-x grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-navy-50" />
        <div className="space-y-4">
          <div className="h-8 w-1/2 animate-pulse rounded bg-navy-50" />
          <div className="h-4 w-full animate-pulse rounded bg-navy-50" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-navy-50" />
          <div className="h-24 w-full animate-pulse rounded bg-navy-50" />
        </div>
      </div>
    </section>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const site = useSite()
  const t = useT()
  const loading = site.status === 'loading'
  const product = loading ? null : getProductBySlug(site, slug)
  usePageTitle(loading ? t('nav.products') : (product?.name ?? t('products.notFound')), {
    seo: product?.seo,
    description: product?.summary,
    image: product?.image?.src,
  })
  const [preview, setPreview] = useState(null) // index of the enlarged photo
  const [selected, setSelected] = useState({ slug, index: 0 }) // photo shown, reset per product
  const active = selected.slug === slug ? selected.index : 0
  const setActive = (index) => setSelected({ slug, index })

  if (loading) {
    return (
      <>
        <PageHero eyebrow={t('nav.products')} title={t('products.loading')} crumbs={[{ label: t('nav.products'), to: '/products' }]} />
        <DetailSkeleton />
      </>
    )
  }
  if (!product) return <NotFound />

  const category = getCategoryById(site, product.categoryId)
  const related = getRelatedProducts(site, product)
  const images = product.images
  const shown = images[Math.min(active, images.length - 1)]
  const specifications = product.specifications.filter((s) => !isPriceRow(s))

  return (
    <>
      <PageHero
        eyebrow={category?.name}
        title={product.name}
        crumbs={[
          { label: t('nav.products'), to: '/products' },
          ...(category ? [{ label: category.name, to: `/products?category=${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            {shown ? (
              <>
                <button
                  type="button"
                  onClick={() => setPreview(Math.min(active, images.length - 1))}
                  className="group relative block w-full overflow-hidden rounded-2xl border border-steel-200"
                  aria-label={t('products.enlargeOf', { name: product.name })}
                >
                  <ProductImage image={{ ...shown, fit: 'contain' }} eager />
                  <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-navy-900/85 px-3 py-1.5 text-xs font-semibold text-white">
                    <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('products.enlarge')}
                  </span>
                </button>
                {images.length > 1 && (
                  <ul className="mt-3 grid grid-cols-5 gap-2" aria-label={t('products.morePhotos')}>
                    {images.map((img, i) => (
                      <li key={img.src}>
                        <button
                          type="button"
                          onClick={() => setActive(i)}
                          aria-label={t('products.showPhoto', { n: i + 1, count: images.length })}
                          aria-current={i === active ? 'true' : undefined}
                          className={`block w-full overflow-hidden rounded-lg border-2 ${i === active ? 'border-accent-500' : 'border-transparent hover:border-steel-300'}`}
                        >
                          <ProductImage image={{ ...img, fit: 'cover' }} aspect="aspect-square" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-steel-500">{t('products.actualPhoto')}</p>
              </>
            ) : (
              <ProductImage image={null} label={product.name} className="rounded-2xl border border-steel-200" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {category && (
                <Link
                  to={`/products?category=${category.slug}`}
                  className="text-xs font-bold tracking-widest text-accent-600 uppercase hover:underline"
                >
                  {category.name}
                </Link>
              )}
              {product.brand && <span className="text-xs font-bold tracking-widest text-steel-500 uppercase">{t('products.brand', { brand: product.brand.name })}</span>}
            </div>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{t('products.overview')}</h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">{product.description}</p>

            <div className="mt-6">
              <PriceTag pricing={product.pricing} />
            </div>

            {product.highlights.length > 0 && (
              <>
                <h3 className="mt-8 text-lg font-bold">{t('products.features')}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex gap-2 text-sm text-navy-800">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
                      {h}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {specifications.length > 0 && (
              <div className="mt-8 overflow-hidden rounded-xl border border-steel-200">
                <div className="flex items-center justify-between gap-3 bg-navy-50 px-4 py-3">
                  <h3 className="text-lg font-bold">{t('products.specifications')}</h3>
                  {specifications.some((s) => s.value === PENDING) && <PendingBadge>{t('products.detailsOnEnquiry')}</PendingBadge>}
                </div>
                <table className="w-full text-sm">
                  <caption className="sr-only">{t('products.specsFor', { name: product.name })}</caption>
                  <tbody className="divide-y divide-steel-200">
                    {specifications.map((spec) => (
                      <tr key={spec.label}>
                        <th scope="row" className="w-1/2 px-4 py-3 text-left font-medium text-steel-600">
                          {spec.label}
                        </th>
                        <td className={`px-4 py-3 font-semibold ${spec.value === PENDING ? 'text-accent-600' : 'text-navy-900'}`}>{spec.value === PENDING ? t('products.onEnquiry') : spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {specifications.some((s) => s.value === PENDING) && (
              <p className="mt-4 flex gap-2 text-xs text-steel-500">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t('products.pendingNote', { pending: t('products.onEnquiry') })}
              </p>
            )}

            <ContactButtons message={productEnquiryMessage(product, category?.name, site.business, t)} className="mt-8" />
            <Link to={`/contact?product=${product.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:text-accent-600">
              <Mail className="h-4 w-4" aria-hidden="true" />
              {t('products.enquiryForm')}
            </Link>

            <Link to="/products" className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-steel-600 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('products.back')}
            </Link>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section bg-navy-50">
          <div className="container-x">
            <SectionHeading eyebrow={t('products.moreEyebrow')} title={t('products.moreTitle')} />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {preview !== null && images.length > 0 && (
        <Lightbox
          items={images.map((img) => ({ src: img.src, alt: img.alt, title: product.name, caption: product.summary }))}
          index={preview}
          onClose={() => setPreview(null)}
          onChange={setPreview}
        />
      )}
    </>
  )
}
