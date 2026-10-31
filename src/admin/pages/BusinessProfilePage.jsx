import { Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import GujaratiFields, { cleanGu } from '../components/GujaratiFields'
import ImageField from '../components/ImageField'
import { useOptions } from '../components/Resource'
import { useToast } from '../components/Toast'
import { ErrorState, PageHeader, Select, Spinner, StringList, TextArea, TextInput, Toggle } from '../components/ui'
import { isSocialUrl, SOCIAL_PLATFORMS } from '../../utils/social'

// Editable shape of the profile (only fields the API accepts).
const toForm = (p) => ({
  name: p.name ?? '',
  type: p.type ?? '',
  tagline: p.tagline ?? '',
  description: p.description ?? '',
  contactPerson: p.contactPerson ?? '',
  email: p.email ?? '',
  mapsUrl: p.mapsUrl ?? '',
  primaryBrand: p.primaryBrand?.id ?? p.primaryBrand ?? '',
  contactNumbers: (p.contactNumbers ?? []).map(({ id, label, person, displayNumber, dialNumber, isWhatsApp, isPrimary }) => ({ id, label: label ?? '', person: person ?? '', displayNumber, dialNumber, isWhatsApp: Boolean(isWhatsApp), isPrimary: Boolean(isPrimary) })),
  address: { lines: p.address?.lines ?? [], city: p.address?.city ?? '', state: p.address?.state ?? '', pincode: p.address?.pincode ?? '', country: p.address?.country ?? '' },
  owners: (p.owners ?? []).map(({ id, name, role, intro, phone, whatsappNumber, sortOrder, gu }) => ({ id, name, role: role ?? '', intro: intro ?? '', phone: { display: phone?.display ?? '', tel: phone?.tel ?? '' }, whatsappNumber: whatsappNumber ?? '', sortOrder: sortOrder ?? 0, gu: gu ?? {} })),
  gu: p.gu ?? {}, // Gujarati version of the text fields
  // One row per supported platform, in a fixed order.
  socialLinks: SOCIAL_PLATFORMS.map(({ id }) => {
    const saved = (p.socialLinks ?? []).find((s) => String(s.platform).toLowerCase() === id)
    return { platform: id, url: saved?.url ?? '', enabled: Boolean(saved?.url) && saved?.enabled !== false }
  }),
})

const toPayload = (form, initial) => {
  const out = {}
  for (const key of Object.keys(form)) {
    if (JSON.stringify(form[key]) === JSON.stringify(initial[key])) continue
    let v = form[key]
    if (key === 'primaryBrand') v = v || null
    if (key === 'contactNumbers' || key === 'owners') v = v.map(({ id, ...rest }) => (id ? { id, ...rest } : rest))
    if (key === 'owners') v = v.map((o) => ({ ...o, gu: cleanGu(o.gu) }))
    if (key === 'gu') v = cleanGu(v)
    out[key] = v
  }
  return out
}

function Section({ title, description, children }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="text-sm text-steel-600">{description}</p>}
      </div>
      {children}
    </section>
  )
}

export default function BusinessProfilePage() {
  const toast = useToast()
  const brands = useOptions('/brands', (b) => ({ value: b.id, label: b.displayName ?? b.name }))
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [initial, setInitial] = useState(null)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const apply = (p) => {
    setProfile(p)
    setForm(toForm(p))
    setInitial(toForm(p))
  }
  const load = () => {
    setError(null)
    api.get('/business-profile').then(({ data }) => apply(data)).catch(setError)
  }
  useEffect(load, [])

  if (error) return <ErrorState error={error} onRetry={load} />
  if (!form) return <Spinner />

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setIn = (key, index, patch) => set(key, form[key].map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const err = (path) => fieldErrors[path] ?? Object.entries(fieldErrors).find(([k]) => k.startsWith(`${path}.`))?.[1]

  const save = async (e) => {
    e.preventDefault()
    const body = toPayload(form, initial)
    if (!Object.keys(body).length) return toast.success('No changes to save.')
    setSaving(true)
    try {
      const { data } = await api.patch('/business-profile', body)
      apply(data)
      setFieldErrors({})
      toast.success('Business profile saved.')
    } catch (er) {
      setFieldErrors(er.fieldErrors ?? {})
      toast.error(er.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="max-w-4xl space-y-6">
      <PageHeader
        title="Business profile"
        description="Business identity, contact numbers, address and owners shown on the website."
        actions={
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />} Save changes
          </button>
        }
      />

      <Section title="Business information">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput id="bp-name" label="Business name" required value={form.name} onChange={(v) => set('name', v)} error={err('name')} />
          <TextInput id="bp-type" label="Business type" value={form.type} onChange={(v) => set('type', v)} />
          <TextInput id="bp-tagline" label="Tagline" value={form.tagline} onChange={(v) => set('tagline', v)} className="sm:col-span-2" hint="Neutral, factual wording only." />
          <TextInput id="bp-contact" label="Contact person" value={form.contactPerson} onChange={(v) => set('contactPerson', v)} />
          <TextInput id="bp-email" label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} error={err('email')} />
          <Select id="bp-brand" label="Primary brand" value={form.primaryBrand} onChange={(v) => set('primaryBrand', v)} options={brands} placeholder="None" />
          <TextInput id="bp-maps" label="Google Maps link" value={form.mapsUrl} onChange={(v) => set('mapsUrl', v)} error={err('mapsUrl')} />
          <TextArea id="bp-desc" label="Description" value={form.description} onChange={(v) => set('description', v)} rows={4} className="sm:col-span-2" />
          <GujaratiFields
            id="bp"
            fields={[
              { name: 'name', label: 'Business name', maxLength: 120 },
              { name: 'type', label: 'Business type', maxLength: 120 },
              { name: 'tagline', label: 'Tagline', maxLength: 200 },
              { name: 'contactPerson', label: 'Contact person', maxLength: 100 },
              { name: 'description', label: 'Description', type: 'textarea', rows: 4, maxLength: 5000 },
              { name: 'addressLines', label: 'Address lines', type: 'list' },
            ]}
            english={{ ...form, addressLines: form.address.lines }}
            value={form.gu}
            onChange={(v) => set('gu', v)}
            errorFor={err}
          />
        </div>
      </Section>

      <Section title="Contact numbers" description="Exactly one number must be primary; it is used for the main call and WhatsApp buttons.">
        {err('contactNumbers') && <p className="text-sm font-medium text-red-600" role="alert">{err('contactNumbers')}</p>}
        <ul className="space-y-4">
          {form.contactNumbers.map((c, i) => (
            <li key={c.id ?? i} className="grid gap-3 rounded-lg border border-steel-200 p-4 sm:grid-cols-2">
              <TextInput id={`cn-${i}-display`} label="Number as shown" value={c.displayNumber} onChange={(v) => setIn('contactNumbers', i, { displayNumber: v })} hint="e.g. +91 98799 92228" />
              <TextInput id={`cn-${i}-dial`} label="Dial number" value={c.dialNumber} onChange={(v) => setIn('contactNumbers', i, { dialNumber: v })} hint="International format, e.g. +919879992228" />
              <TextInput id={`cn-${i}-person`} label="Person" value={c.person} onChange={(v) => setIn('contactNumbers', i, { person: v })} />
              <TextInput id={`cn-${i}-label`} label="Label" value={c.label} onChange={(v) => setIn('contactNumbers', i, { label: v })} hint="e.g. Mobile, Office" />
              <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
                <Toggle id={`cn-${i}-wa`} label="WhatsApp" checked={c.isWhatsApp} onChange={(v) => setIn('contactNumbers', i, { isWhatsApp: v })} />
                <label className="inline-flex items-center gap-2 text-sm font-semibold">
                  <input type="radio" name="primary-contact" checked={c.isPrimary} onChange={() => set('contactNumbers', form.contactNumbers.map((x, j) => ({ ...x, isPrimary: j === i })))} />
                  Primary contact
                </label>
                <button type="button" onClick={() => set('contactNumbers', form.contactNumbers.filter((_, j) => j !== i))} className="btn-outline ml-auto px-3 py-1.5 text-xs text-red-700">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => set('contactNumbers', [...form.contactNumbers, { label: 'Mobile', person: '', displayNumber: '', dialNumber: '', isWhatsApp: false, isPrimary: form.contactNumbers.length === 0 }])} className="btn-outline px-3 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add number
        </button>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <StringList id="bp-lines" label="Address lines" value={form.address.lines} onChange={(v) => set('address', { ...form.address, lines: v })} max={6} />
          </div>
          <TextInput id="bp-city" label="City" value={form.address.city} onChange={(v) => set('address', { ...form.address, city: v })} />
          <TextInput id="bp-state" label="State" value={form.address.state} onChange={(v) => set('address', { ...form.address, state: v })} />
          <TextInput id="bp-pin" label="PIN code" value={form.address.pincode} onChange={(v) => set('address', { ...form.address, pincode: v })} />
          <TextInput id="bp-country" label="Country" value={form.address.country} onChange={(v) => set('address', { ...form.address, country: v })} />
        </div>
      </Section>

      <Section title="Owners" description="Save text changes with “Save changes”. Photos upload immediately.">
        <ul className="space-y-5">
          {form.owners.map((o, i) => {
            const saved = profile.owners.find((x) => x.id === o.id)
            return (
              <li key={o.id ?? i} className="space-y-4 rounded-lg border border-steel-200 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput id={`ow-${i}-name`} label="Name" value={o.name} onChange={(v) => setIn('owners', i, { name: v })} error={err(`owners.${i}.name`)} />
                  <TextInput id={`ow-${i}-role`} label="Role" value={o.role} onChange={(v) => setIn('owners', i, { role: v })} />
                  <TextInput id={`ow-${i}-phone`} label="Phone (as shown)" value={o.phone.display} onChange={(v) => setIn('owners', i, { phone: { ...o.phone, display: v } })} />
                  <TextInput id={`ow-${i}-tel`} label="Phone (dial)" value={o.phone.tel} onChange={(v) => setIn('owners', i, { phone: { ...o.phone, tel: v } })} />
                  <TextInput id={`ow-${i}-wa`} label="WhatsApp number (digits)" value={o.whatsappNumber} onChange={(v) => setIn('owners', i, { whatsappNumber: v })} error={err(`owners.${i}.whatsappNumber`)} />
                  <TextInput id={`ow-${i}-order`} label="Display order" type="number" value={o.sortOrder} onChange={(v) => setIn('owners', i, { sortOrder: v === '' ? 0 : v })} />
                  <TextArea id={`ow-${i}-intro`} label="Introduction" value={o.intro} onChange={(v) => setIn('owners', i, { intro: v })} rows={2} className="sm:col-span-2" />
                  <GujaratiFields id={`ow-${i}`} fields={[{ name: 'name', label: 'Name', maxLength: 100 }, { name: 'role', label: 'Role', maxLength: 60 }, { name: 'intro', label: 'Introduction', type: 'textarea', rows: 2, maxLength: 1000 }]} english={o} value={o.gu ?? {}} onChange={(v) => setIn('owners', i, { gu: v })} />
                </div>
                {saved ? (
                  <ImageField label="Photo" image={saved.photo} uploadPath={`/business-profile/owners/${saved.id}/photo`} removePath={saved.photo?.publicId ? `/business-profile/owners/${saved.id}/photo` : undefined} altDefault={`Portrait of ${saved.name}`} onSaved={apply} hint="Use an original photo of the owner." />
                ) : (
                  <p className="text-xs text-steel-500">Save first to add a photo.</p>
                )}
                <button type="button" onClick={() => set('owners', form.owners.filter((_, j) => j !== i))} className="btn-outline px-3 py-1.5 text-xs text-red-700">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove owner
                </button>
              </li>
            )
          })}
        </ul>
        <button type="button" onClick={() => set('owners', [...form.owners, { name: '', role: 'Co-Owner', intro: '', phone: { display: '', tel: '' }, whatsappNumber: '', sortOrder: form.owners.length + 1 }])} className="btn-outline px-3 py-2 text-xs">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add owner
        </button>
      </Section>

      <Section title="Social media"description="Icons appear in the website footer and on the Contact page only when the link is filled in and switched on.">
        <ul className="space-y-4">
          {form.socialLinks.map((s, i) => {
            const { name } = SOCIAL_PLATFORMS[i]
            const invalid = s.url.trim() !== '' && !isSocialUrl(s.platform, s.url.trim())
            return (
              <li key={s.platform} className="grid items-start gap-3 sm:grid-cols-[1fr_auto]">
                <TextInput
                  id={`bp-social-${s.platform}`}
                  label={`${name} profile URL`}
                  type="url"
                  value={s.url}
                  onChange={(v) => setIn('socialLinks', i, { url: v })}
                  placeholder="https://"
                  error={err(`socialLinks.${i}.url`) ?? (invalid ? `Enter the full https:// link to the ${name} page.` : undefined)}
                  hint="Leave empty if there is no page."
                />
                <div className="sm:pt-7">
                  <Toggle id={`bp-social-${s.platform}-on`} label={`Show ${name}`} checked={s.enabled} onChange={(v) => setIn('socialLinks', i, { enabled: v })} />
                </div>
              </li>
            )
          })}
        </ul>
        {fieldErrors.socialLinks && <p className="text-sm text-red-600">{fieldErrors.socialLinks}</p>}
      </Section>
    </form>
  )
}
