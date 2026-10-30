// Shared admin UI primitives built on the site's Tailwind tokens (btn-*, card, field-input).
import { AlertCircle, Inbox, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

export function Field({ id, label, required, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
          {label} {required && <span className="text-accent-600">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-steel-500">{hint}</p>
      )}
    </div>
  )
}

const inputProps = (id, error) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : undefined,
  className: `field-input ${error ? 'border-red-400' : ''}`,
})

export function TextInput({ id, label, value, onChange, required, error, hint, className, type = 'text', ...rest }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} {...inputProps(id, error)} {...rest} />
    </Field>
  )
}

export function TextArea({ id, label, value, onChange, required, error, hint, className, rows = 3, ...rest }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...inputProps(id, error)} {...rest} />
    </Field>
  )
}

export function Select({ id, label, value, onChange, options, required, error, hint, className, placeholder }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...inputProps(id, error)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Toggle({ id, label, checked, onChange, hint }) {
  return (
    <div>
      <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold text-navy-900">
        <span className="relative inline-flex">
          <input id={id} type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
          <span className="h-6 w-11 rounded-full bg-steel-300 transition-colors peer-checked:bg-accent-500 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500" />
          <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-steel-500">{hint}</p>}
    </div>
  )
}

/** Editable list of short strings (highlights, details, keywords…). */
export function StringList({ id, label, value = [], onChange, placeholder, max = 20, hint, error }) {
  const set = (i, v) => onChange(value.map((x, j) => (j === i ? v : x)))
  return (
    <Field id={id} label={label} hint={hint} error={error}>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input aria-label={`${label} ${i + 1}`} className="field-input" value={item} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-steel-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${label} ${i + 1}`}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" id={id} onClick={() => onChange([...value, ''])} className="btn-outline px-3 py-2 text-xs">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
          </button>
        )}
      </div>
    </Field>
  )
}

export function Spinner({ label = 'Loading…', className = '' }) {
  return (
    <p className={`flex items-center gap-2 text-sm text-steel-600 ${className}`} role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  )
}

export function EmptyState({ title = 'Nothing here yet', children }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-steel-300 bg-white px-6 py-12 text-center">
      <Inbox className="h-8 w-8 text-steel-300" aria-hidden="true" />
      <p className="font-semibold text-navy-900">{title}</p>
      {children && <div className="text-sm text-steel-600">{children}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        {error?.message || 'Something went wrong.'}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline px-3 py-2 text-xs">
          Try again
        </button>
      )}
    </div>
  )
}

const BADGE = {
  green: 'bg-green-100 text-green-800',
  grey: 'bg-steel-200 text-navy-800',
  orange: 'bg-accent-100 text-accent-600',
  red: 'bg-red-100 text-red-700',
  navy: 'bg-navy-100 text-navy-800',
}
export function Badge({ tone = 'grey', children }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${BADGE[tone]}`}>{children}</span>
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-steel-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`card flex max-h-[92vh] w-full flex-col outline-none ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-steel-200 px-5 py-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-navy-50" aria-label="Close">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-steel-200 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Delete', busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-outline" disabled={busy}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="btn bg-red-600 text-white hover:bg-red-700" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-steel-600">{message}</p>
    </Modal>
  )
}

export const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
