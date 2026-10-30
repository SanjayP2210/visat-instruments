import { ArrowLeft, Check, Info, Maximize2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ContactButtons from '../components/common/ContactButtons'
import Lightbox from '../components/common/Lightbox'
import PageHero from '../components/common/PageHero'
import PendingBadge from '../components/common/PendingBadge'
import SectionHeading from '../components/common/SectionHeading'
import ProductCard from '../components/products/ProductCard'
import ProductImage from '../components/products/ProductImage'
import { PENDING } from '../data/products'
import { usePageTitle } from '../hooks/usePageTitle'
import { getCategoryById, getProductBySlug, getRelatedProducts } from '../services/catalogService'
import { productEnquiryMessage } from '../utils/whatsapp'
import NotFound from './NotFound'

export default function ProductDetail() {
  const { slug } = useParams()
  const product = getProductBySlug(slug)
  usePageTitle(product?.name ?? 'Product not found')
  const [preview, setPreview] = useState(false)

  if (!product) return <NotFound />

  const category = getCategoryById(product.categoryId)
  const related = getRelatedProducts(product)

  return (
    <>
      <PageHero
        eyebrow={category?.name}
        title={product.name}
        crumbs={[
          { label: 'Products', to: '/products' },
          ...(category ? [{ label: category.name, to: `/products?category=${category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <button
              type="button"
              onClick={() => setPreview(true)}
              className="group relative block w-full overflow-hidden rounded-2xl border border-steel-200"
              aria-label={`Enlarge photo of ${product.name}`}
            >
              <ProductImage image={{ ...product.image, fit: 'contain' }} eager />
              <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-navy-900/85 px-3 py-1.5 text-xs font-semibold text-white">
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                Enlarge
              </span>
            </button>
            <p className="mt-3 text-xs text-steel-500">Actual product photograph.</p>
          </div>

          <div>
            {category && (
              <Link
                to={`/products?category=${category.slug}`}
                className="text-xs font-bold tracking-widest text-accent-600 uppercase hover:underline"
              >
                {category.name}
              </Link>
            )}
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">Overview</h2>
            <p className="mt-4 text-base leading-relaxed text-steel-600">{product.description}</p>

            <h3 className="mt-8 text-lg font-bold">Key features (as pictured)</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {product.highlights.map((h) => (
                <li key={h} className="flex gap-2 text-sm text-navy-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
                  {h}
                </li>
              ))}
            </ul>

            <div className="mt-8 overflow-hidden rounded-xl border border-steel-200">
              <div className="flex items-center justify-between gap-3 bg-navy-50 px-4 py-3">
                <h3 className="text-lg font-bold">Specifications</h3>
                <PendingBadge>Details on enquiry</PendingBadge>
              </div>
              <table className="w-full text-sm">
                <caption className="sr-only">Specifications for {product.name}</caption>
                <tbody className="divide-y divide-steel-200">
                  {product.specifications.map((spec) => (
                    <tr key={spec.label}>
                      <th scope="row" className="w-1/2 px-4 py-3 text-left font-medium text-steel-600">
                        {spec.label}
                      </th>
                      <td
                        className={`px-4 py-3 font-semibold ${spec.value === PENDING ? 'text-accent-600' : 'text-navy-900'}`}
                      >
                        {spec.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 flex gap-2 text-xs text-steel-500">
              <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
              Details marked “{PENDING}” are awaiting confirmation and will be shared for your requirement.
            </p>

            <ContactButtons message={productEnquiryMessage(product, category?.name)} className="mt-8" />

            <Link to="/products" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-600 hover:text-navy-900">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to all products
            </Link>
          </div>
        </div>
      </section>

      <section className="section bg-navy-50">
        <div className="container-x">
          <SectionHeading eyebrow="More products" title="You may also need" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {preview && (
        <Lightbox
          items={[{ src: product.image.src, alt: product.image.alt, title: product.name, caption: product.summary }]}
          index={0}
          onClose={() => setPreview(false)}
          onChange={() => {}}
        />
      )}
    </>
  )
}
