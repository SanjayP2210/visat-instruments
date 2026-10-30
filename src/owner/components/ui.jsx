import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react'
import { STATUS_LABELS } from '../services/submissionService'

export function Field({ id, label, required, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-900">
        {label} {required && <span className="text-accent-600">*</span>}
      </label>
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

export function TextInput({ id, label, value, onChange, required, error, hint, className, ...rest }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} {...inputProps(id, error)} {...rest} />
    </Field>
  )
}

export function TextArea({ id, label, value, onChange, required, error, hint, rows = 3, className, ...rest }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} {...inputProps(id, error)} {...rest} />
    </Field>
  )
}

export function SelectInput({ id, label, value, onChange, options, required, error, hint, placeholder = 'Select…', className }) {
  return (
    <Field id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select value={value} onChange={(e) => onChange(e.target.value)} {...inputProps(id, error)}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function ChoiceGroup({ name, label, value, onChange, options, required, error }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-navy-900">
        {label} {required && <span className="text-accent-600">*</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              value === o.value ? 'border-navy-900 bg-navy-900 text-white' : 'border-steel-300 bg-white text-steel-600 hover:border-navy-700'
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  )
}

const STATUS_STYLES = {
  DRAFT: 'bg-steel-200 text-navy-800',
  SUBMITTED: 'bg-navy-100 text-navy-800',
  UNDER_REVIEW: 'bg-accent-100 text-accent-600',
  CHANGES_REQUESTED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-green-100 text-green-700',
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <p className="flex items-center gap-2 text-sm text-steel-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
  )
}

const ALERT_STYLES = {
  error: ['border-red-200 bg-red-50 text-red-800', AlertCircle],
  info: ['border-navy-100 bg-navy-50 text-navy-800', Info],
  success: ['border-green-200 bg-green-50 text-green-800', CheckCircle2],
  warning: ['border-accent-100 bg-accent-50 text-navy-800', AlertCircle],
}

export function Alert({ tone = 'info', title, children, className = '' }) {
  const [style, Icon] = ALERT_STYLES[tone]
  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${style} ${className}`} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'mt-1' : ''}>{children}</div>
      </div>
    </div>
  )
}

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
