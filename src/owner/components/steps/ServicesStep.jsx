import { Plus, Trash2 } from 'lucide-react'
import { newService, SERVICE_TYPES, YES_NO } from '../../model/form'
import { ChoiceGroup, SelectInput, TextArea, TextInput } from '../ui'

export default function ServicesStep({ form, setForm, errors }) {
  const update = (id, key, value) =>
    setForm((f) => ({ ...f, services: f.services.map((s) => (s.id === id ? { ...s, [key]: value } : s)) }))
  const remove = (id) => setForm((f) => ({ ...f, services: f.services.filter((s) => s.id !== id) }))

  return (
    <div className="space-y-6">
      <p className="text-sm text-steel-600">
        The website currently lists these services as “to be confirmed”. Tell us which ones you offer and on what terms.
      </p>
      {form.services.map((s, i) => (
        <section key={s.id} className="rounded-xl border border-steel-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-bold">{s.type || `Service ${i + 1}`}</h3>
            <button type="button" onClick={() => remove(s.id)} className="btn-outline px-3 py-2 text-xs text-red-700">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectInput id={`${s.id}-type`} label="Service type" required value={s.type} onChange={(v) => update(s.id, 'type', v)} options={SERVICE_TYPES} error={errors[`services.${s.id}.type`]} />
            <ChoiceGroup name={`${s.id}-offered`} label="Do you offer this?" required value={s.offered} onChange={(v) => update(s.id, 'offered', v)} options={YES_NO} error={errors[`services.${s.id}.offered`]} />
            <TextArea id={`${s.id}-desc`} label="What is included" value={s.description} onChange={(v) => update(s.id, 'description', v)} rows={2} className="sm:col-span-2" />
            <TextInput id={`${s.id}-area`} label="Coverage area" value={s.coverageArea} onChange={(v) => update(s.id, 'coverageArea', v)} />
            <TextInput id={`${s.id}-charges`} label="Charges" value={s.charges} onChange={(v) => update(s.id, 'charges', v)} hint="Optional, e.g. 'on visit'" />
            <TextInput id={`${s.id}-time`} label="Typical turnaround" value={s.turnaround} onChange={(v) => update(s.id, 'turnaround', v)} />
          </div>
        </section>
      ))}
      <button type="button" onClick={() => setForm((f) => ({ ...f, services: [...f.services, newService()] }))} className="btn-navy">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add service
      </button>
    </div>
  )
}
