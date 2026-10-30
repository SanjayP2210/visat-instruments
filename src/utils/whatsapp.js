import { business } from '../data/business'

export function whatsappLink(message) {
  if (!message) return business.whatsapp.url
  return `${business.whatsapp.url}?text=${encodeURIComponent(message)}`
}

export function productEnquiryMessage(product, categoryName) {
  const lines = [
    `Hello ${business.name},`,
    `I would like to enquire about: ${product.name}${categoryName ? ` (${categoryName})` : ''}.`,
    'Please share details on availability, specifications and price.',
  ]
  return lines.join('\n')
}

export const generalEnquiryMessage = `Hello ${business.name}, I would like to enquire about your weighing products and services.`
