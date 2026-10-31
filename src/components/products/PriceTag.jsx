import { useT } from '../../i18n/LanguageContext'

// Product price as entered by the owner in the admin panel. "Request quote" never shows an
// amount; discounts are only shown when the API calculated one from both prices.
const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n)

const AVAILABILITY = {
  'in-stock': { label: 'price.inStock', className: 'bg-green-50 text-green-800 ring-green-200' },
  'made-to-order': { label: 'price.madeToOrder', className: 'bg-navy-50 text-navy-800 ring-navy-100' },
  'out-of-stock': { label: 'price.outOfStock', className: 'bg-red-50 text-red-800 ring-red-200' },
}

export const isPriced = (pricing) => pricing?.type === 'fixed' || pricing?.type === 'starting-from'

function gstNote(pricing, t) {
  const rate = pricing.gstRate != null
  if (pricing.gst === 'inclusive') return rate ? t('price.gstInclRate', { rate: pricing.gstRate }) : t('price.gstIncl')
  if (pricing.gst === 'exclusive') return rate ? t('price.gstExclRate', { rate: pricing.gstRate }) : t('price.gstExcl')
  return ''
}

export function Availability({ pricing }) {
  const t = useT()
  const a = AVAILABILITY[pricing?.availability]
  if (!a) return null
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${a.className}`}>{t(a.label)}</span>
}

/** Short price line for product cards. */
export function PriceLine({ pricing }) {
  const t = useT()
  if (!isPriced(pricing)) return <p className="text-sm font-semibold text-steel-600" data-testid="price">{t('price.onRequest')}</p>
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm" data-testid="price">
      {pricing.type === 'starting-from' && <span className="text-xs font-semibold text-steel-500">{t('price.from')}</span>}
      <span className="text-lg font-bold text-navy-900">{inr(pricing.sellingPrice)}</span>
      {pricing.originalPrice && <s className="text-xs text-steel-500">{inr(pricing.originalPrice)}</s>}
      {pricing.discountPercent > 0 && <span className="text-xs font-bold text-green-700">{t('price.off', { percent: pricing.discountPercent })}</span>}
      {gstNote(pricing, t) && <span className="w-full text-[11px] text-steel-500">{gstNote(pricing, t)}</span>}
    </p>
  )
}

/** Full price block for the product details page. */
export default function PriceTag({ pricing }) {
  const t = useT()
  if (!isPriced(pricing)) {
    return (
      <div className="rounded-xl border border-steel-200 bg-navy-50 p-4" data-testid="product-price">
        <p className="text-lg font-bold text-navy-900">{t('price.onRequest')}</p>
        <p className="mt-1 text-sm text-steel-600">{t('price.quoteHint')}</p>
        {pricing?.availability && <div className="mt-2"><Availability pricing={pricing} /></div>}
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-steel-200 p-4" data-testid="product-price">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {pricing.type === 'starting-from' && <span className="text-sm font-semibold text-steel-500">{t('price.startingFrom')}</span>}
        <span className="font-display text-3xl font-bold text-navy-900">{inr(pricing.sellingPrice)}</span>
        {pricing.originalPrice && (
          <s className="text-base text-steel-500">
            <span className="sr-only">{t('price.original')} </span>
            {inr(pricing.originalPrice)}
          </s>
        )}
      </div>
      {pricing.discountAmount > 0 && (
        <p className="mt-1 text-sm font-semibold text-green-700">
          {t('price.save', { amount: inr(pricing.discountAmount), percent: pricing.discountPercent })}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-steel-600">
        {gstNote(pricing, t) && <span>{gstNote(pricing, t)}</span>}
        <Availability pricing={pricing} />
      </div>
      {pricing.additionalCharges && <p className="mt-2 text-xs text-steel-600">{pricing.additionalCharges}</p>}
    </div>
  )
}
