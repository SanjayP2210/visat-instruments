// Data-access layer for the catalogue. UI components call these functions
// instead of importing data files directly, so Phase 2 only needs to swap
// these implementations for REST calls (e.g. GET /api/products).
import { categories, products } from '../data/products'

const byOrder = (a, b) => a.sortOrder - b.sortOrder

export function getCategories() {
  return [...categories].sort(byOrder)
}

export function getCategoryById(id) {
  return categories.find((c) => c.id === id) ?? null
}

export function getCategoryBySlug(slug) {
  return categories.find((c) => c.slug === slug) ?? null
}

export function getProducts({ categorySlug } = {}) {
  if (!categorySlug) return products
  const category = getCategoryBySlug(categorySlug)
  return category ? products.filter((p) => p.categoryId === category.id) : []
}

export function getFeaturedProducts() {
  return products.filter((p) => p.featured)
}

export function getProductBySlug(slug) {
  return products.find((p) => p.slug === slug) ?? null
}

export function getRelatedProducts(product, limit = 3) {
  return products.filter((p) => p.id !== product.id).slice(0, limit)
}
