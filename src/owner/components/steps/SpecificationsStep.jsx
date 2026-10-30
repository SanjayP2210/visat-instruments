import { Plus, X } from 'lucide-react'
import { newSpecification } from '../../model/form'
import { Alert } from '../ui'
import { updateProduct } from './ProductsStep'

export default function SpecificationsStep({ form, setForm, errors }) {
  if (!form.products.length) return <Alert>Add products in the previous step first.</Alert>

  return (
    <div className="space-y-6">
      <p className="text-sm text-steel-600">
        Add technical details for each product, such as capacity, accuracy, display type, platform size or power supply. Leave a
        product empty if you are not sure.
      </p>
      {form.products.map((p) => {
        const setSpecs = (specs) => updateProduct(setForm, p.id, { specifications: specs })
        const change = (id, key, value) => setSpecs(p.specifications.map((s) => (s.id === id ? { ...s, [key]: value } : s)))
        return (
          <section key={p.id} className="rounded-xl border border-steel-200 bg-white p-5">
            <h3 className="text-xl font-bold">{p.name || 'Unnamed product'}</h3>
            {p.specifications.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="hidden grid-cols-[1fr_1fr_8rem_2.5rem] gap-3 text-xs font-semibold text-steel-500 sm:grid">
                  <span>Specification</span>
                  <span>Value</span>
                  <span>Unit</span>
                </div>
                {p.specifications.map((s, i) => (
                  <div key={s.id}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_8rem_2.5rem]">
                      <input aria-label={`Specification ${i + 1} name`} placeholder="e.g. Capacity" className="field-input" value={s.label} onChange={(e) => change(s.id, 'label', e.target.value)} />
                      <input aria-label={`Specification ${i + 1} value`} placeholder="e.g. 30" className="field-input" value={s.value} onChange={(e) => change(s.id, 'value', e.target.value)} />
                      <input aria-label={`Specification ${i + 1} unit`} placeholder="e.g. kg" className="field-input" value={s.unit} onChange={(e) => change(s.id, 'unit', e.target.value)} />
                      <button
                        type="button"
                        onClick={() => setSpecs(p.specifications.filter((x) => x.id !== s.id))}
                        className="grid h-10 w-10 place-items-center rounded-md text-steel-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`Remove specification ${i + 1}`}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    {errors[`specs.${s.id}`] && <p className="mt-1 text-xs font-medium text-red-600">{errors[`specs.${s.id}`]}</p>}
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setSpecs([...p.specifications, newSpecification()])} className="btn-outline mt-4 px-3 py-2 text-xs">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add specification
            </button>
          </section>
        )
      })}
    </div>
  )
}
