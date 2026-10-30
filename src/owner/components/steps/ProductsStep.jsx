import { Copy, Plus, Trash2 } from 'lucide-react'
import { catalogueProducts, imageCategoryFor, newProduct, PRODUCT_CATEGORIES } from '../../model/form'
import { Alert, SelectInput, TextArea, TextInput } from '../ui'

export function updateProduct(setForm, id, patch) {
  setForm((f) => ({ ...f, products: f.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
}

export default function ProductsStep({ form, setForm, errors }) {
  const add = (product = newProduct()) => setForm((f) => ({ ...f, products: [...f.products, product] }))
  const remove = (product) => {
    const photos = product.images.length
    const msg = `Remove "${product.name || 'this product'}"${photos ? ` and its ${photos} photo reference(s)` : ''}?`
    if (window.confirm(msg)) setForm((f) => ({ ...f, products: f.products.filter((p) => p.id !== product.id) }))
  }
  const importCatalogue = () => setForm((f) => ({ ...f, products: [...f.products, ...catalogueProducts()] }))

  return (
    <div className="space-y-6">
      {errors.products && <Alert tone="error">{errors.products}</Alert>}
      {!form.products.length && (
        <div className="rounded-lg border border-dashed border-steel-300 bg-white p-6 text-center">
          <p className="text-sm text-steel-600">No products yet. Add them one by one, or start from the products currently on the website and correct them.</p>
          <button type="button" onClick={importCatalogue} className="btn-outline mt-4">
            <Copy className="h-4 w-4" aria-hidden="true" />
            Start from current website products
          </button>
        </div>
      )}

      {form.products.map((p, i) => {
        const set = (key) => (value) =>
          updateProduct(setForm, p.id, key === 'category' ? { category: value, imageCategory: imageCategoryFor(value) } : { [key]: value })
        return (
          <section key={p.id} className="rounded-xl border border-steel-200 bg-white p-5" aria-labelledby={`${p.id}-title`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 id={`${p.id}-title`} className="text-xl font-bold">
                Product {i + 1}
                {p.name && <span className="font-normal text-steel-500"> · {p.name}</span>}
              </h3>
              <button type="button" onClick={() => remove(p)} className="btn-outline px-3 py-2 text-xs text-red-700">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput id={`${p.id}-name`} label="Product name" required value={p.name} onChange={set('name')} error={errors[`products.${p.id}.name`]} />
              <SelectInput
                id={`${p.id}-category`}
                label="Category"
                required
                value={p.category}
                onChange={set('category')}
                options={PRODUCT_CATEGORIES.map((c) => c.name)}
                error={errors[`products.${p.id}.category`]}
              />
              <TextInput id={`${p.id}-capacity`} label="Capacity / range" value={p.capacity} onChange={set('capacity')} hint="e.g. 30 kg, 60 t" />
              <TextInput id={`${p.id}-model`} label="Model number" value={p.modelNumber} onChange={set('modelNumber')} />
              <TextInput id={`${p.id}-brand`} label="Brand / make" value={p.brand} onChange={set('brand')} />
              <TextInput id={`${p.id}-price`} label="Price information" value={p.priceNote} onChange={set('priceNote')} hint="e.g. a price, a range, or 'on enquiry'" />
              <TextInput id={`${p.id}-warranty`} label="Warranty" value={p.warranty} onChange={set('warranty')} />
              <TextInput id={`${p.id}-apps`} label="Typical uses" value={p.applications} onChange={set('applications')} hint="e.g. shops, factories, trucks" />
              <TextArea id={`${p.id}-desc`} label="Description" value={p.description} onChange={set('description')} rows={3} className="sm:col-span-2" />
            </div>
          </section>
        )
      })}

      <button type="button" onClick={() => add()} className="btn-navy">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add product
      </button>
    </div>
  )
}
