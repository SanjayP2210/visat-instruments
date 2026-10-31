import { business as builtInBusiness } from '../data/business'
import { translate } from '../i18n/LanguageContext'

const english = (key, vars) => translate('en', key, vars)

// `biz` is the live business profile from useBusiness(); the built-in one is the fallback.
// `t` is the current-language translator from useT(); messages default to English.
export function whatsappLink(message, biz = builtInBusiness) {
  if (!message) return biz.whatsapp.url
  return `${biz.whatsapp.url}?text=${encodeURIComponent(message)}`
}

export function productEnquiryMessage(product, categoryName, biz = builtInBusiness, t = english) {
  return [
    t('wa.hello', { name: biz.name }),
    t('wa.product', { product: `${product.name}${categoryName ? ` (${categoryName})` : ''}` }),
    t('wa.productAsk'),
  ].join('\n')
}

export const generalEnquiryText = (biz = builtInBusiness, t = english) => t('wa.general', { name: biz.name })
export const generalEnquiryMessage = generalEnquiryText()
