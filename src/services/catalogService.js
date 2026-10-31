// Catalogue queries over the site data from useSite() (live API data, or the built-in
// fallback when the API is unreachable). Components never import the data files directly.
const byOrder = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)

export function getCategories(site) {
  return [...site.categories].sort(byOrder)
}

export function getCategoryById(site, id) {
  return site.categories.find((c) => c.id === id) ?? null
}

export function getCategoryBySlug(site, slug) {
  return site.categories.find((c) => c.slug === slug) ?? null
}

export function getProducts(site, { categorySlug, query } = {}) {
  let list = site.products
  if (categorySlug) {
    const category = getCategoryBySlug(site, categorySlug)
    list = category ? list.filter((p) => p.categoryId === category.id) : []
  }
  const q = query?.trim().toLowerCase()
  if (q) list = list.filter((p) => [p.name, p.summary, p.brand?.name].some((v) => v?.toLowerCase().includes(q)))
  return list
}

export function getFeaturedProducts(site) {
  return site.products.filter((p) => p.featured)
}

export function getProductBySlug(site, slug) {
  return site.products.find((p) => p.slug === slug) ?? null
}

export function getRelatedProducts(site, product, limit = 3) {
  const others = site.products.filter((p) => p.id !== product.id)
  const same = others.filter((p) => p.categoryId === product.categoryId)
  return [...same, ...others.filter((p) => p.categoryId !== product.categoryId)].slice(0, limit)
}
