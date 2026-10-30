// Products, specifications and image references ↔ storage records
// (Products / Product_Specifications sheets; future `products` collection with embedded specs).
import { imageCategoryFor } from '../model/form'

const trim = (v) => String(v ?? '').trim()

export function toProductRecords(products) {
  return products.map((p) => ({
    id: p.id,
    name: trim(p.name),
    category: p.category,
    imageCategory: imageCategoryFor(p.category),
    description: trim(p.description),
    capacity: trim(p.capacity),
    modelNumber: trim(p.modelNumber),
    brand: trim(p.brand),
    priceNote: trim(p.priceNote),
    applications: trim(p.applications),
    warranty: trim(p.warranty),
    specifications: p.specifications.map((s) => ({ id: s.id, label: trim(s.label), value: trim(s.value), unit: trim(s.unit) })),
    // Only server-confirmed uploads are stored; pending local files never enter the document.
    images: p.images.map(({ fileId, name, mimeType, sizeBytes, sha256 }) => ({ fileId, name, mimeType, sizeBytes, sha256 })),
  }))
}
