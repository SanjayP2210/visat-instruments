import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSite } from '../../context/SiteData'
import { useT } from '../../i18n/LanguageContext'
import { getCategoryById } from '../../services/catalogService'
import { productEnquiryMessage, whatsappLink } from '../../utils/whatsapp'
import WhatsAppIcon from '../common/WhatsAppIcon'
import { PriceLine } from './PriceTag'
import ProductImage from './ProductImage'

export default function ProductCard({ product }) {
  const site = useSite()
  const t = useT()
  const category = getCategoryById(site, product.categoryId)
  const detailUrl = `/products/${product.slug}`

  return (
    <article className="group card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-navy-100 hover:shadow-[0_18px_40px_-20px_rgb(11_31_58/0.35)]">
      <Link to={detailUrl} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductImage image={product.image} label={product.name} />
        {category && (
          <span className="absolute top-3 left-3 rounded bg-navy-900/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
            {category.name}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        {product.brand && <p className="text-xs font-bold tracking-widest text-accent-600 uppercase">{product.brand.name}</p>}
        <h3 className="text-xl font-bold">
          <Link to={detailUrl} className="hover:text-accent-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-600">{product.summary}</p>
        <div className="mt-4">
          <PriceLine pricing={product.pricing} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-steel-200 pt-4">
          <Link to={detailUrl} className="btn-outline px-3 py-2.5 text-xs">
            {t('products.viewDetails')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <a
            href={whatsappLink(productEnquiryMessage(product, category?.name, site.business, t), site.business)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp px-3 py-2.5 text-xs"
            aria-label={t('products.enquireWhatsApp', { name: product.name })}
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            {t('cta.enquire')}
          </a>
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden" aria-hidden="true">
      <div className="aspect-[4/3] animate-pulse bg-navy-50" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-navy-50" />
        <div className="h-3 w-full animate-pulse rounded bg-navy-50" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-navy-50" />
        <div className="h-9 w-full animate-pulse rounded bg-navy-50" />
      </div>
    </div>
  )
}
