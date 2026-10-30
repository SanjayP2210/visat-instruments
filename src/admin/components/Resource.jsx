// Generic list and edit/create pages driven by a field configuration.
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useList } from '../hooks/useList'
import { DataTable, ListToolbar, Pagination } from './ListView'
import { useToast } from './Toast'
import { ConfirmDialog, ErrorState, Field, PageHeader, Select, Spinner, StringList, TextArea, TextInput, Toggle } from './ui'

export const slugify = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

/** Loads select options from an API list once. */
export function useOptions(path, toOption, params = { limit: 100 }) {
  const [options, setOptions] = useState([])
  const key = JSON.stringify(params)
  useEffect(() => {
    api.get(path, JSON.parse(key)).then(({ data }) => setOptions(data.map(toOption))).catch(() => setOptions([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key])
  return options
}

/* ------------------------------------------------------------------ */
/* List                                                                 */
/* ------------------------------------------------------------------ */
export function ResourceList({
  title, description, apiPath, basePath, columns, filters = [], sortOptions = [], defaultSort,
  createLabel = 'Add new', canCreate = true, canDelete = () => true, itemLabel = (i) => i.name ?? i.title, emptyHint, rowActions,
}) {
  const toast = useToast()
  const list = useList(apiPath, { defaultSort, filterKeys: filters.map((f) => f.key) })
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`${apiPath}/${deleting.id}`)
      toast.success(`“${itemLabel(deleting)}” deleted.`)
      setDeleting(null)
      list.reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={canCreate && (
          <Link to={`${basePath}/new`} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" /> {createLabel}
          </Link>
        )}
      />
      <ListToolbar list={list} filters={filters} sortOptions={sortOptions} />
      <DataTable
        list={list}
        columns={columns}
        emptyHint={emptyHint}
        actions={(item) => (
          <div className="inline-flex flex-wrap justify-end gap-1.5">
            {rowActions?.(item, list.reload)}
            <Link to={`${basePath}/${item.id}`} className="btn-outline px-2.5 py-1.5 text-xs" aria-label={`Edit ${itemLabel(item)}`}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
            </Link>
            {canDelete(item) && (
              <button type="button" onClick={() => setDeleting(item)} className="btn-outline px-2.5 py-1.5 text-xs text-red-700" aria-label={`Delete ${itemLabel(item)}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      />
      <Pagination list={list} />
      {deleting && <ConfirmDialog title={`Delete “${itemLabel(deleting)}”?`} message="This cannot be undone." busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Fields                                                               */
/* ------------------------------------------------------------------ */
function SpecsEditor({ id, value = [], onChange, error }) {
  const set = (i, key, v) => onChange(value.map((row, j) => (j === i ? { ...row, [key]: v } : row)))
  return (
    <Field id={id} label="Specifications" error={error} hint="Only confirmed details. Use “On enquiry” when a value is not confirmed.">
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input aria-label={`Specification ${i + 1} name`} className="field-input" placeholder="e.g. Capacity" value={row.label} onChange={(e) => set(i, 'label', e.target.value)} />
            <input aria-label={`Specification ${i + 1} value`} className="field-input" placeholder="e.g. On enquiry" value={row.value} onChange={(e) => set(i, 'value', e.target.value)} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-md text-steel-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove specification ${i + 1}`}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button type="button" id={id} onClick={() => onChange([...value, { label: '', value: '' }])} className="btn-outline px-3 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add specification
        </button>
      </div>
    </Field>
  )
}

function SeoEditor({ id, value = {}, onChange, errorFor }) {
  const set = (k, v) => onChange({ ...value, [k]: v })
  return (
    <fieldset className="space-y-4 rounded-xl border border-steel-200 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-bold text-navy-900">Search & sharing (SEO)</legend>
      <TextInput id={`${id}-title`} label="Meta title" value={value.title} onChange={(v) => set('title', v)} maxLength={70} hint={`${(value.title ?? '').length}/70 characters`} error={errorFor('seo.title')} />
      <TextArea id={`${id}-description`} label="Meta description" value={value.description} onChange={(v) => set('description', v)} maxLength={170} rows={2} hint={`${(value.description ?? '').length}/170 characters`} error={errorFor('seo.description')} />
      <StringList id={`${id}-keywords`} label="Keywords" value={value.keywords ?? []} onChange={(v) => set('keywords', v)} placeholder="e.g. weighbridge" />
    </fieldset>
  )
}

function FieldInput({ field, value, onChange, error, errorFor, disabled }) {
  const id = `f-${field.name}`
  const common = { id, label: field.label, required: field.required, hint: field.hint, error, disabled }
  switch (field.type) {
    case 'textarea':
      return <TextArea {...common} value={value} onChange={onChange} rows={field.rows ?? 3} maxLength={field.maxLength} />
    case 'toggle':
      return <Toggle id={id} label={field.label} checked={value} onChange={onChange} hint={field.hint} />
    case 'select':
      return <Select {...common} value={value ?? ''} onChange={onChange} options={field.options} placeholder={field.placeholder} />
    case 'list':
      return <StringList id={id} label={field.label} value={value ?? []} onChange={onChange} placeholder={field.placeholder} hint={field.hint} error={error} />
    case 'specs':
      return <SpecsEditor id={id} value={value ?? []} onChange={onChange} error={error} />
    case 'seo':
      return <SeoEditor id={id} value={value ?? {}} onChange={onChange} errorFor={errorFor} />
    default:
      return <TextInput {...common} type={field.type ?? 'text'} value={value} onChange={onChange} maxLength={field.maxLength} autoComplete={field.autoComplete} />
  }
}

/* ------------------------------------------------------------------ */
/* Edit / create                                                        */
/* ------------------------------------------------------------------ */
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/**
 * fields: [{ name, label, type, required, options, hint, wide, createOnly, editOnly, fromRecord(record), slugFrom }]
 * toPayload(values, { isNew }) → body sent to the API (default: values as-is)
 * extra(record, setRecord) → extra sections shown for saved records (images, etc.)
 */
export function ResourceForm({ title, apiPath, basePath, fields, defaults = {}, toPayload = (v) => v, extra, extraHint, readOnly = false, canDelete = false, itemLabel = (r) => r?.name ?? r?.title }) {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const visible = useMemo(() => fields.filter((f) => (isNew ? !f.editOnly : !f.createOnly)), [fields, isNew])
  const [record, setRecord] = useState(null)
  const [values, setValues] = useState(null)
  const [initial, setInitial] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [slugTouched, setSlugTouched] = useState(!isNew)

  const valuesFrom = (rec) => Object.fromEntries(visible.map((f) => [f.name, f.fromRecord ? f.fromRecord(rec) : rec?.[f.name] ?? defaults[f.name] ?? (f.type === 'toggle' ? false : f.type === 'list' || f.type === 'specs' ? [] : '')]))

  const load = () => {
    setLoadError(null)
    if (isNew) {
      const v = valuesFrom(defaults)
      setValues(v)
      setInitial(v)
      return
    }
    api
      .get(`${apiPath}/${id}`)
      .then(({ data }) => {
        setRecord(data)
        const v = valuesFrom(data)
        setValues(v)
        setInitial(v)
      })
      .catch(setLoadError)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id, apiPath])

  if (loadError) return <ErrorState error={loadError} onRetry={load} />
  if (!values) return <Spinner />

  const set = (name, v) => {
    if (visible.some((f) => f.name === name && f.slugFrom)) setSlugTouched(true) // edited by hand: stop auto-filling
    setValues((prev) => {
      const next = { ...prev, [name]: v }
      const slugField = visible.find((f) => f.slugFrom === name)
      if (slugField && !slugTouched) next[slugField.name] = slugify(v)
      return next
    })
  }
  const errorFor = (path) => errors[path] ?? Object.entries(errors).find(([k]) => k.startsWith(`${path}.`))?.[1]

  const submit = async (e) => {
    e.preventDefault()
    const missing = Object.fromEntries(visible.filter((f) => f.required && isEmpty(values[f.name])).map((f) => [f.name, `${f.label} is required.`]))
    setErrors(missing)
    if (Object.keys(missing).length) return toast.error('Please fill in the required fields.')

    // New records: send filled-in fields. Existing records: send only changed fields.
    const isNumberField = (k) => visible.find((f) => f.name === k)?.type === 'number'
    const include = (k, v) => {
      if (isNumberField(k) && v === '') return false
      if (!isNew) return JSON.stringify(v) !== JSON.stringify(initial[k])
      return typeof v === 'boolean' || (Array.isArray(v) ? v.length > 0 : !isEmpty(v))
    }
    const changed = Object.fromEntries(Object.entries(values).filter(([k, v]) => include(k, v)))
    if (!isNew && Object.keys(changed).length === 0) return toast.success('No changes to save.')
    setSaving(true)
    try {
      const body = toPayload(changed, { isNew, values })
      const { data } = isNew ? await api.post(apiPath, body) : await api.patch(`${apiPath}/${id}`, body)
      toast.success(isNew ? `“${itemLabel(data)}” created.` : 'Changes saved.')
      if (isNew) navigate(`${basePath}/${data.id}`, { replace: true })
      else {
        setRecord(data)
        const v = valuesFrom(data)
        setValues(v)
        setInitial(v)
      }
      setErrors({})
    } catch (err) {
      setErrors(err.fieldErrors ?? {})
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await api.del(`${apiPath}/${id}`)
      toast.success(`“${itemLabel(record)}” deleted.`)
      navigate(basePath, { replace: true })
    } catch (err) {
      toast.error(err.message)
      setSaving(false)
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <Link to={basePath} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-steel-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to list
      </Link>
      <PageHeader title={isNew ? `New ${title}` : itemLabel(record) || title} description={readOnly ? 'View only — your role cannot change this.' : undefined} />
      <form onSubmit={submit} noValidate className="card space-y-6 p-5 sm:p-6">
        <fieldset disabled={readOnly || saving} className="grid gap-5 sm:grid-cols-2">
          {visible.map((field) => (
            <div key={field.name} className={field.wide || ['textarea', 'list', 'specs', 'seo'].includes(field.type) ? 'sm:col-span-2' : ''}>
              <FieldInput field={field} value={values[field.name]} onChange={(v) => set(field.name, v)} error={errorFor(field.name)} errorFor={errorFor} />
            </div>
          ))}
        </fieldset>
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-steel-200 pt-5">
            {canDelete && !isNew ? (
              <button type="button" onClick={() => setDeleting(true)} className="btn-outline text-red-700">
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
              </button>
            ) : (
              <span />
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {isNew ? 'Create' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
      {!isNew && record && extra && <div className="card mt-6 p-5 sm:p-6">{extra(record, (r) => setRecord(r))}</div>}
      {isNew && extraHint && <p className="mt-4 text-sm text-steel-600">{extraHint}</p>}
      {deleting && <ConfirmDialog title={`Delete “${itemLabel(record)}”?`} message="This cannot be undone." busy={saving} onConfirm={remove} onCancel={() => setDeleting(false)} />}
    </div>
  )
}
