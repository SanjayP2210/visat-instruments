import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCategoryById } from '../../services/catalogService'
import { productEnquiryMessage, whatsappLink } from '../../utils/whatsapp'
import WhatsAppIcon from '../common/WhatsAppIcon'
import ProductImage from './ProductImage'

export default function ProductCard({ product }) {
  const category = getCategoryById(product.categoryId)
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
        <h3 className="text-xl font-bold">
          <Link to={detailUrl} className="hover:text-accent-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-600">{product.summary}</p>
        <p className="mt-4 text-xs font-semibold text-steel-500">Specifications &amp; price: on enquiry</p>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-steel-200 pt-4">
          <Link to={detailUrl} className="btn-outline px-3 py-2.5 text-xs">
            View details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <a
            href={whatsappLink(productEnquiryMessage(product, category?.name))}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp px-3 py-2.5 text-xs"
            aria-label={`Enquire about ${product.name} on WhatsApp`}
          >
            <WhatsAppIcon className="h-3.5 w-3.5" />
            Enquire
          </a>
        </div>
      </div>
    </article>
  )
}
