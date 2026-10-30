// Owner-information form model: a single JSON document with stable IDs.
// Shape mirrors FORM_SCHEMA in apps-script/Code.gs and the field mapping in
// docs/owner-information/DATA-MODEL.md.
import { business } from '../../data/business'
import { categories, products as catalogue } from '../../data/products'

export const SCHEMA_VERSION = 1

export const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`

// Product categories offered in the form, each mapped to its Drive photo folder.
export const PRODUCT_CATEGORIES = [
  ...categories.map((c) => ({
    name: c.name,
    imageCategory:
      {
        'cat-indicators': 'indicators',
        'cat-scales': 'weighing-scales',
        'cat-junction-boxes': 'junction-boxes',
        'cat-weighbridges': 'weighbridges',
      }[c.id] ?? 'other',
  })),
  { name: 'Other', imageCategory: 'other' },
]

export const imageCategoryFor = (categoryName) =>
  PRODUCT_CATEGORIES.find((c) => c.name === categoryName)?.imageCategory ?? 'other'

export const SERVICE_TYPES = ['Installation', 'Repair', 'Maintenance', 'Calibration', 'Other']
export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'to-confirm', label: 'To be confirmed' },
]

export function newSpecification() {
  return { id: newId('SPEC'), label: '', value: '', unit: '' }
}

export function newProduct(partial = {}) {
  const product = {
    id: newId('PRD'),
    name: '',
    category: '',
    imageCategory: 'other',
    description: '',
    capacity: '',
    modelNumber: '',
    brand: '',
    priceNote: '',
    applications: '',
    warranty: '',
    specifications: [],
    images: [],
    ...partial,
  }
  product.imageCategory = imageCategoryFor(product.category)
  return product
}

export function newService(type = '') {
  return { id: newId('SVC'), type, offered: '', description: '', coverageArea: '', charges: '', turnaround: '' }
}

// Products currently shown on the website, offered as a starting point for the owner to correct.
export function catalogueProducts() {
  return catalogue.map((p) =>
    newProduct({
      name: p.name,
      category: categories.find((c) => c.id === p.categoryId)?.name ?? '',
      description: p.description,
    }),
  )
}

export function emptyForm() {
  return {
    schemaVersion: SCHEMA_VERSION,
    business: {
      businessName: business.name,
      contactPerson: business.contactPerson ?? '',
      phone: business.phone.display,
      whatsapp: business.phone.display,
      email: '',
      address: business.address.lines.slice(0, 2).join(', '),
      city: business.address.city,
      state: business.address.state,
      pincode: business.address.pincode,
      gstin: '',
      description: '',
      workingHours: '',
      serviceAreas: '',
    },
    products: [],
    services: ['Installation', 'Repair', 'Maintenance', 'Calibration'].map(newService),
    weighbridge: {
      offersHardware: '',
      offersSoftware: '',
      platformSizes: '',
      capacities: '',
      foundationTypes: '',
      loadCells: '',
      softwareFeatures: '',
      installationTime: '',
      notes: '',
    },
    highlights: { establishedYear: '', customersServed: '', certifications: '', keyStrengths: '', notableProjects: '' },
    feedback: {
      overallRating: '',
      contentApproval: '',
      likes: '',
      changes: '',
      missingInfo: '',
      photosToReplace: '',
      otherComments: '',
    },
  }
}

// Fills any fields missing from a stored draft (e.g. after the schema grows).
export function normalizeForm(data) {
  const base = emptyForm()
  const src = data && typeof data === 'object' ? data : {}
  return {
    ...base,
    business: { ...base.business, ...src.business },
    products: (src.products ?? []).map((p) => ({
      ...newProduct(),
      ...p,
      specifications: p.specifications ?? [],
      images: p.images ?? [],
    })),
    services: src.services ?? base.services,
    weighbridge: { ...base.weighbridge, ...src.weighbridge },
    highlights: { ...base.highlights, ...src.highlights },
    feedback: { ...base.feedback, ...src.feedback },
  }
}
