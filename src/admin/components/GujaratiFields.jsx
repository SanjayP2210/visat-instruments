import { Languages } from 'lucide-react'
import { StringList, TextArea, TextInput } from './ui'

/**
 * Optional Gujarati (ગુજરાતી) version of a record's text, stored in its `gu` field.
 * English is never changed here. Each box shows the English text as its placeholder; boxes
 * left empty show the English text on the website. Lists (features, details, specifications)
 * follow the English list item by item.
 *
 * fields: [{ name, label, type: 'text' | 'textarea' | 'list' | 'specs' | 'seo', maxLength, rows }]
 * english: the current English values (same field names); value/onChange: the `gu` object.
 */
export default function GujaratiFields({ id, fields, english = {}, value = {}, onChange, errorFor = () => undefined }) {
  const set = (name, v) => onChange({ ...value, [name]: v })
  const filled = fields.some(({ name }) => JSON.stringify(value[name] ?? '').replace(/["[\]{},:]|label|value|title|description|keywords/g, '').trim())

  return (
    <details className="group rounded-xl border border-steel-200 p-4 sm:col-span-2" open={filled || undefined}>
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-navy-900">
        <Languages className="h-4 w-4 text-accent-600" aria-hidden="true" />
        <span lang="gu">ગુજરાતી</span> (Gujarati) version
        <span className="font-normal text-steel-500">— optional</span>
      </summary>
      <p className="mt-2 text-xs text-steel-500">Leave a box empty to show the English text. English content is not changed.</p>
      <div className="mt-4 space-y-4" lang="gu">
        {fields.map((f) => {
          const fid = `${id}-gu-${f.name}`
          const label = `${f.label} (Gujarati)`
          const en = english[f.name]
          const v = value[f.name]
          switch (f.type) {
            case 'textarea':
              return <TextArea key={f.name} id={fid} label={label} value={v ?? ''} onChange={(x) => set(f.name, x)} rows={f.rows ?? 3} maxLength={f.maxLength} placeholder={en || ''} error={errorFor(`gu.${f.name}`)} />
            case 'list':
              return <ListByEnglish key={f.name} id={fid} label={label} english={en ?? []} value={v ?? []} onChange={(x) => set(f.name, x)} />
            case 'specs':
              return <SpecsByEnglish key={f.name} id={fid} label={label} english={en ?? []} value={v ?? []} onChange={(x) => set(f.name, x)} />
            case 'seo':
              return <SeoGu key={f.name} id={fid} english={en ?? {}} value={v ?? {}} onChange={(x) => set(f.name, x)} />
            default:
              return <TextInput key={f.name} id={fid} label={label} value={v ?? ''} onChange={(x) => set(f.name, x)} maxLength={f.maxLength} placeholder={en || ''} error={errorFor(`gu.${f.name}`)} />
          }
        })}
      </div>
    </details>
  )
}

function ListByEnglish({ id, label, english, value, onChange }) {
  if (!english.length) return null
  const set = (i, v) => onChange(english.map((_, j) => (j === i ? v : (value[j] ?? ''))))
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">{label}</legend>
      {english.map((item, i) => (
        <input key={i} aria-label={`${label} ${i + 1}`} className="field-input" placeholder={item} value={value[i] ?? ''} onChange={(e) => set(i, e.target.value)} maxLength={200} />
      ))}
    </fieldset>
  )
}

function SpecsByEnglish({ id, label, english, value, onChange }) {
  if (!english.length) return null
  const set = (i, key, v) => onChange(english.map((_, j) => ({ label: value[j]?.label ?? '', value: value[j]?.value ?? '', ...(j === i ? { [key]: v } : {}) })))
  return (
    <fieldset className="space-y-2" id={id}>
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">{label}</legend>
      {english.map((spec, i) => (
        <div key={i} className="grid grid-cols-2 gap-2">
          <input aria-label={`${label} ${i + 1} name`} className="field-input" placeholder={spec.label} value={value[i]?.label ?? ''} onChange={(e) => set(i, 'label', e.target.value)} maxLength={100} />
          <input aria-label={`${label} ${i + 1} value`} className="field-input" placeholder={spec.value} value={value[i]?.value ?? ''} onChange={(e) => set(i, 'value', e.target.value)} maxLength={300} />
        </div>
      ))}
    </fieldset>
  )
}

function SeoGu({ id, english, value, onChange }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">Search &amp; sharing (Gujarati)</legend>
      <TextInput id={`${id}-title`} label="Meta title (Gujarati)" value={value.title ?? ''} onChange={(v) => set('title', v)} maxLength={70} placeholder={english.title || ''} hint={`${(value.title ?? '').length}/70 characters`} />
      <TextArea id={`${id}-description`} label="Meta description (Gujarati)" value={value.description ?? ''} onChange={(v) => set('description', v)} maxLength={170} rows={2} placeholder={english.description || ''} hint={`${(value.description ?? '').length}/170 characters`} />
      <StringList id={`${id}-keywords`} label="Keywords (Gujarati)" value={value.keywords ?? []} onChange={(v) => set('keywords', v)} />
    </fieldset>
  )
}

/** Drops empty values so blank Gujarati boxes are not stored (lists keep their positions). */
export function cleanGu(gu = {}) {
  const out = {}
  for (const [k, v] of Object.entries(gu)) {
    if (typeof v === 'string') out[k] = v.trim()
    else if (Array.isArray(v)) out[k] = v.some((x) => (typeof x === 'string' ? x.trim() : x?.label?.trim() || x?.value?.trim())) ? v : []
    else if (v && typeof v === 'object') out[k] = { ...v, keywords: (v.keywords ?? []).filter((x) => x.trim()) }
  }
  return out
}
