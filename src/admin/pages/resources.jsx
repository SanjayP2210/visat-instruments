// Configuration for the standard list/edit pages. Permissions mirror the backend rules.
import { useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import ImageField, { ImagePreview } from '../components/ImageField'
import ProductImages from '../components/ProductImages'
import { ResourceForm, ResourceList, useOptions } from '../components/Resource'
import { useToast } from '../components/Toast'
import { Badge, formatDate, TextInput } from '../components/ui'

const yesNo = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]
const activeBadge = (on, yes = 'Active', no = 'Hidden') => <Badge tone={on ? 'green' : 'grey'}>{on ? yes : no}</Badge>
const KINDS = [
  { value: 'system', label: 'System' },
  { value: 'part', label: 'Part' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'software', label: 'Software' },
  { value: 'instrument', label: 'Instrument' },
]
const slugField = { name: 'slug', label: 'Web address (slug)', required: true, slugFrom: 'title', hint: 'Lowercase letters, numbers and hyphens. Changing it changes the page link.' }
const sortField = { name: 'sortOrder', label: 'Display order', type: 'number', hint: 'Lower numbers appear first.' }
const seoField = { name: 'seo', label: 'SEO', type: 'seo', fromRecord: (r) => ({ title: r?.seo?.title ?? '', description: r?.seo?.description ?? '', keywords: r?.seo?.keywords ?? [] }) }

/* ---------------- Products ---------------- */
export function ProductList() {
  const categories = useOptions('/categories', (c) => ({ value: c.id, label: c.name }), { limit: 100, sort: 'sortOrder' })
  return (
    <ResourceList
      title="Products"
      description="Product catalogue. Products without original photos show “Photo coming soon” on the website."
      apiPath="/products"
      basePath="/admin/products"
      createLabel="Add product"
      defaultSort="sortOrder"
      sortOptions={[{ value: 'sortOrder', label: 'Display order' }, { value: 'name', label: 'Name A–Z' }, { value: '-updatedAt', label: 'Recently updated' }]}
      filters={[
        { key: 'category', label: 'Category', options: categories },
        { key: 'kind', label: 'Type', options: KINDS },
        { key: 'active', label: 'Shown', options: yesNo },
        { key: 'featured', label: 'Featured', options: yesNo },
      ]}
      columns={[
        { key: 'image', label: 'Photo', render: (p) => <ImagePreview image={p.images?.[0]} className="h-12 w-16" /> },
        { key: 'name', label: 'Name', render: (p) => <><span className="font-semibold">{p.name}</span><span className="block text-xs text-steel-500">/{p.slug}</span></> },
        { key: 'category', label: 'Category', render: (p) => p.category?.name ?? '—' },
        { key: 'kind', label: 'Type', render: (p) => <span className="capitalize">{p.kind}</span> },
        { key: 'status', label: 'Status', render: (p) => <span className="flex flex-wrap gap-1">{activeBadge(p.active)}{p.featured && <Badge tone="orange">Featured</Badge>}</span> },
      ]}
    />
  )
}

export function ProductForm() {
  const categories = useOptions('/categories', (c) => ({ value: c.id, label: c.name }), { limit: 100, sort: 'sortOrder' })
  const brands = useOptions('/brands', (b) => ({ value: b.id, label: b.displayName ?? b.name }))
  return (
    <ResourceForm
      title="product"
      apiPath="/products"
      basePath="/admin/products"
      canDelete
      fields={[
        { name: 'name', label: 'Product name', required: true },
        { ...slugField, slugFrom: 'name' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: categories, placeholder: 'Choose a category', fromRecord: (r) => r?.category?.id ?? r?.category ?? '' },
        { name: 'brand', label: 'Brand', type: 'select', options: brands, placeholder: 'No brand', fromRecord: (r) => r?.brand?.id ?? r?.brand ?? '' },
        { name: 'kind', label: 'Product type', type: 'select', options: KINDS, hint: 'Parts and accessories appear in the spare parts section.' },
        sortField,
        { name: 'summary', label: 'Short summary', type: 'textarea', rows: 2, maxLength: 400 },
        { name: 'description', label: 'Description', type: 'textarea', rows: 5, hint: 'Factual details only. Do not add unconfirmed capacities, accuracy or certifications.' },
        { name: 'highlights', label: 'Key features', type: 'list', placeholder: 'e.g. Steel deck with side guard rails' },
        { name: 'specifications', label: 'Specifications', type: 'specs', fromRecord: (r) => (r?.specifications ?? []).map(({ label, value }) => ({ label, value })) },
        { name: 'featured', label: 'Featured on the homepage', type: 'toggle' },
        { name: 'active', label: 'Shown on the website', type: 'toggle' },
        seoField,
      ]}
      defaults={{ kind: 'system', active: true }}
      toPayload={(v) => ({ ...v, ...('brand' in v ? { brand: v.brand || null } : {}) })}
      extraHint="Save the product first, then add its images."
      extra={(record, setRecord) => <ProductImages product={record} onSaved={setRecord} />}
    />
  )
}

/* ---------------- Categories ---------------- */
export function CategoryList() {
  const { isAdmin } = useAuth()
  return (
    <ResourceList
      title="Categories"
      apiPath="/categories"
      basePath="/admin/categories"
      createLabel="Add category"
      defaultSort="sortOrder"
      canDelete={() => isAdmin}
      sortOptions={[{ value: 'sortOrder', label: 'Display order' }, { value: 'name', label: 'Name A–Z' }]}
      filters={[{ key: 'active', label: 'Shown', options: yesNo }]}
      columns={[
        { key: 'name', label: 'Name', render: (c) => <><span className="font-semibold">{c.name}</span><span className="block text-xs text-steel-500">/{c.slug}</span></> },
        { key: 'productCount', label: 'Products', render: (c) => c.productCount ?? 0 },
        { key: 'sortOrder', label: 'Order' },
        { key: 'active', label: 'Status', render: (c) => activeBadge(c.active) },
      ]}
    />
  )
}

export function CategoryForm() {
  const { isAdmin } = useAuth()
  return (
    <ResourceForm
      title="category"
      apiPath="/categories"
      basePath="/admin/categories"
      canDelete={isAdmin}
      fields={[
        { name: 'name', label: 'Category name', required: true },
        { ...slugField, slugFrom: 'name' },
        { name: 'shortName', label: 'Short name', hint: 'Used where space is limited.' },
        { name: 'icon', label: 'Icon name', hint: 'e.g. Truck, Gauge, Monitor, Boxes, Printer' },
        sortField,
        { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { name: 'active', label: 'Shown on the website', type: 'toggle' },
      ]}
      defaults={{ active: true }}
    />
  )
}

/* ---------------- Brands (Admin edits; Editors view) ---------------- */
const RELATIONSHIPS = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'own-brand', label: 'Own brand' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'authorised-dealer', label: 'Authorised dealer' },
  { value: 'distributor', label: 'Distributor' },
]
export function BrandList() {
  const { isAdmin } = useAuth()
  return (
    <ResourceList
      title="Brands"
      description={isAdmin ? undefined : 'Brands can only be changed by an Admin.'}
      apiPath="/brands"
      basePath="/admin/brands"
      createLabel="Add brand"
      canCreate={isAdmin}
      canDelete={() => isAdmin}
      defaultSort="sortOrder"
      itemLabel={(b) => b.displayName ?? b.name}
      columns={[
        { key: 'logo', label: 'Logo', render: (b) => <ImagePreview image={b.logo} className="h-12 w-16" /> },
        { key: 'name', label: 'Brand', render: (b) => <span className="font-semibold">{b.displayName ?? b.name}</span> },
        { key: 'relationship', label: 'Relationship', render: (b) => <Badge tone={b.relationship === 'unconfirmed' ? 'orange' : 'navy'}>{RELATIONSHIPS.find((r) => r.value === b.relationship)?.label}</Badge> },
        { key: 'showOnWebsite', label: 'Website', render: (b) => activeBadge(b.showOnWebsite, 'Shown', 'Hidden') },
      ]}
    />
  )
}

export function BrandForm() {
  const { isAdmin } = useAuth()
  return (
    <ResourceForm
      title="brand"
      apiPath="/brands"
      basePath="/admin/brands"
      readOnly={!isAdmin}
      canDelete={isAdmin}
      itemLabel={(b) => b?.displayName ?? b?.name}
      fields={[
        { name: 'name', label: 'Brand name', required: true },
        { ...slugField, slugFrom: 'name' },
        { name: 'relationship', label: 'Relationship to VISAT INSTRUMENTS', type: 'select', options: RELATIONSHIPS, hint: 'Keep “Unconfirmed” until the business confirms it. The website never claims ownership for unconfirmed brands.' },
        sortField,
        { name: 'tagline', label: 'Tagline' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3 },
        { name: 'showRegisteredMark', label: 'Show ® after the name', type: 'toggle' },
        { name: 'showOnWebsite', label: 'Show on the website', type: 'toggle' },
      ]}
      defaults={{ relationship: 'unconfirmed' }}
      extraHint={isAdmin ? "Save the brand first, then upload its logo." : undefined}
      extra={isAdmin ? (record, setRecord) => <ImageField label="Brand logo" image={record.logo} uploadPath={`/brands/${record.id}/logo`} removePath={`/brands/${record.id}/logo`} onSaved={setRecord} altDefault={`${record.name} logo`} /> : undefined}
    />
  )
}

/* ---------------- Services ---------------- */
export function ServiceList() {
  return (
    <ResourceList
      title="Services"
      description="Hidden services (e.g. unconfirmed Calibration) are kept here but not shown on the website."
      apiPath="/services"
      basePath="/admin/services"
      createLabel="Add service"
      defaultSort="sortOrder"
      itemLabel={(s) => s.title}
      filters={[
        { key: 'active', label: 'Shown', options: yesNo },
        { key: 'status', label: 'Status', options: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'to-be-confirmed', label: 'To be confirmed' }] },
      ]}
      columns={[
        { key: 'image', label: 'Image', render: (s) => <ImagePreview image={s.image} className="h-12 w-16" /> },
        { key: 'title', label: 'Service', render: (s) => <span className="font-semibold">{s.title}</span> },
        { key: 'status', label: 'Status', render: (s) => <Badge tone={s.status === 'confirmed' ? 'navy' : 'orange'}>{s.status === 'confirmed' ? 'Confirmed' : 'To be confirmed'}</Badge> },
        { key: 'active', label: 'Website', render: (s) => activeBadge(s.active, 'Shown', 'Hidden') },
      ]}
    />
  )
}

export function ServiceForm() {
  return (
    <ResourceForm
      title="service"
      apiPath="/services"
      basePath="/admin/services"
      canDelete
      itemLabel={(s) => s?.title}
      fields={[
        { name: 'title', label: 'Service name', required: true },
        slugField,
        { name: 'status', label: 'Status', type: 'select', options: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'to-be-confirmed', label: 'To be confirmed' }] },
        { name: 'icon', label: 'Icon name', hint: 'e.g. Wrench, Truck, ShieldCheck' },
        sortField,
        { name: 'summary', label: 'Summary', type: 'textarea', rows: 2 },
        { name: 'details', label: 'What is included', type: 'list' },
        { name: 'active', label: 'Shown on the website', type: 'toggle', hint: 'Keep unconfirmed services hidden.' },
        seoField,
      ]}
      defaults={{ status: 'to-be-confirmed', active: false }}
      extraHint="Save the service first, then add an image."
      extra={(record, setRecord) => <ImageField label="Service image" image={record.image} uploadPath={`/services/${record.id}/image`} removePath={`/services/${record.id}/image`} onSaved={setRecord} altDefault={record.title} />}
    />
  )
}

/* ---------------- Reviews (customer reviews & testimonials; /api/testimonials) ---------------- */
const SOURCES = [
  { value: 'website', label: 'Website form' },
  { value: 'direct', label: 'Direct from customer' },
  { value: 'google', label: 'Google review' },
  { value: 'other', label: 'Other' },
]
const REVIEW_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'orange' },
  { value: 'approved', label: 'Approved', tone: 'green' },
  { value: 'rejected', label: 'Rejected', tone: 'red' },
]
const reviewStatusBadge = (s) => {
  const st = REVIEW_STATUSES.find((x) => x.value === s) ?? REVIEW_STATUSES[0]
  return <Badge tone={st.tone}>{st.label}</Badge>
}
const stars = (n) => (n ? <span className="whitespace-nowrap text-accent-500" aria-label={`${n} out of 5 stars`}>{'★'.repeat(n)}<span className="text-steel-300">{'★'.repeat(5 - n)}</span></span> : '—')

/** One-click moderation buttons for a review row. */
function ReviewActions({ review, reload }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const update = async (changes, message) => {
    setBusy(true)
    try {
      await api.patch(`/testimonials/${review.id}`, changes)
      toast.success(message)
      reload()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  const btn = 'btn-outline px-2.5 py-1.5 text-xs'
  return (
    <>
      {review.status !== 'approved' && (
        <button type="button" className={btn} disabled={busy} onClick={() => update({ status: 'approved' }, 'Review approved.')} aria-label={`Approve review by ${review.name}`}>
          Approve
        </button>
      )}
      {review.status !== 'rejected' && (
        <button type="button" className={`${btn} text-red-700`} disabled={busy} onClick={() => update({ status: 'rejected' }, 'Review rejected and hidden.')} aria-label={`Reject review by ${review.name}`}>
          Reject
        </button>
      )}
      {review.status === 'approved' && (
        <button
          type="button"
          className={btn}
          disabled={busy || (!review.published && !review.consentConfirmed)}
          title={!review.published && !review.consentConfirmed ? 'Customer consent is not recorded.' : undefined}
          onClick={() => update({ published: !review.published }, review.published ? 'Review unpublished.' : 'Review published on the website.')}
          aria-label={`${review.published ? 'Unpublish' : 'Publish'} review by ${review.name}`}
        >
          {review.published ? 'Unpublish' : 'Publish'}
        </button>
      )}
    </>
  )
}

export function TestimonialList() {
  return (
    <ResourceList
      title="Reviews"
      description="Customer reviews from the website and testimonials added by staff. Only approved reviews with consent can be published."
      apiPath="/testimonials"
      basePath="/admin/reviews"
      createLabel="Add testimonial"
      defaultSort="-createdAt"
      filters={[
        { key: 'status', label: 'Status', options: REVIEW_STATUSES },
        { key: 'published', label: 'Published', options: yesNo },
        { key: 'source', label: 'Source', options: SOURCES },
      ]}
      sortOptions={[{ value: '-createdAt', label: 'Newest first' }, { value: 'createdAt', label: 'Oldest first' }, { value: '-rating', label: 'Highest rating' }, { value: 'rating', label: 'Lowest rating' }]}
      rowActions={(r, reload) => <ReviewActions review={r} reload={reload} />}
      columns={[
        { key: 'name', label: 'Customer', render: (t) => <><span className="font-semibold">{t.name}</span><span className="block text-xs text-steel-500">{[t.company, t.location].filter(Boolean).join(', ') || formatDate(t.createdAt)}</span></> },
        { key: 'rating', label: 'Rating', render: (t) => stars(t.rating) },
        { key: 'service', label: 'Service / work', render: (t) => <span className="line-clamp-2 max-w-48">{t.serviceReceived || '—'}</span> },
        { key: 'status', label: 'Status', render: (t) => <span className="flex flex-wrap gap-1">{reviewStatusBadge(t.status)}{t.published && <Badge tone="navy">Published</Badge>}{!t.consentConfirmed && <Badge>No consent</Badge>}</span> },
      ]}
    />
  )
}

export function TestimonialForm() {
  return (
    <ResourceForm
      title="testimonial"
      apiPath="/testimonials"
      basePath="/admin/reviews"
      canDelete
      fields={[
        { name: 'name', label: 'Customer name', required: true },
        { name: 'rating', label: 'Rating', type: 'select', placeholder: 'No rating', options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${'★'.repeat(n)} (${n}/5)` })), fromRecord: (r) => (r?.rating ? String(r.rating) : '') },
        { name: 'serviceReceived', label: 'Service / work received', wide: true },
        { name: 'message', label: 'Review', type: 'textarea', required: true, rows: 5 },
        { name: 'company', label: 'Company' },
        { name: 'location', label: 'Location' },
        { name: 'source', label: 'Source', type: 'select', options: SOURCES },
        { name: 'sourceUrl', label: 'Source link', hint: 'e.g. the Google review link (https://…)' },
        { name: 'status', label: 'Moderation status', type: 'select', options: REVIEW_STATUSES, hint: 'Rejected or pending reviews are never shown on the website.' },
        sortField,
        { name: 'consentConfirmed', label: 'Customer agreed to publication', type: 'toggle', hint: 'Required before publishing.' },
        { name: 'published', label: 'Published on the website', type: 'toggle', hint: 'Only possible for approved reviews with consent.' },
      ]}
      defaults={{ source: 'direct', status: 'approved' }}
      toPayload={(v) => ({ ...v, ...('rating' in v ? { rating: v.rating ? Number(v.rating) : null } : {}) })}
    />
  )
}


/* ---------------- Users (Admin only) ---------------- */
const ROLES = [
  { value: 'editor', label: 'Editor — manages content' },
  { value: 'admin', label: 'Admin — also brands, deletions and users' },
]
export function UserList() {
  const { user } = useAuth()
  return (
    <ResourceList
      title="Users"
      description="Admins manage everything, including users. Editors manage website content."
      apiPath="/users"
      basePath="/admin/users"
      createLabel="Add user"
      defaultSort="name"
      canDelete={(u) => u.id !== user.id}
      filters={[{ key: 'role', label: 'Role', options: ROLES.map((r) => ({ value: r.value, label: r.value === 'admin' ? 'Admin' : 'Editor' })) }, { key: 'active', label: 'Active', options: yesNo }]}
      sortOptions={[{ value: 'name', label: 'Name A–Z' }, { value: '-lastLoginAt', label: 'Last sign-in' }, { value: '-createdAt', label: 'Newest' }]}
      columns={[
        { key: 'name', label: 'Name', render: (u) => <><span className="font-semibold">{u.name}</span><span className="block text-xs text-steel-500">{u.email}</span></> },
        { key: 'role', label: 'Role', render: (u) => <Badge tone={u.role === 'admin' ? 'navy' : 'grey'}>{u.role === 'admin' ? 'Admin' : 'Editor'}</Badge> },
        { key: 'active', label: 'Status', render: (u) => activeBadge(u.active, 'Active', 'Deactivated') },
        { key: 'lastLoginAt', label: 'Last sign-in', render: (u) => formatDate(u.lastLoginAt) },
      ]}
    />
  )
}

function ResetPassword({ user }) {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await api.put(`/users/${user.id}/password`, { password })
      setPassword('')
      toast.success(`Password reset. ${user.name} has been signed out everywhere.`)
    } catch (err) {
      setError(err.fieldErrors?.password ?? err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold">Reset password</h2>
      <p className="text-sm text-steel-600">Sets a new password and signs this user out of all devices.</p>
      <div className="flex flex-wrap items-end gap-3">
        <TextInput id="reset-password" label="New password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={error} hint="At least 10 characters, including a letter and a number." className="min-w-64 flex-1" />
        <button type="button" onClick={save} className="btn-navy" disabled={busy || !password}>
          Reset password
        </button>
      </div>
    </div>
  )
}

export function UserForm() {
  const { user: me } = useAuth()
  return (
    <ResourceForm
      title="user"
      apiPath="/users"
      basePath="/admin/users"
      canDelete
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'off' },
        { name: 'role', label: 'Role', type: 'select', options: ROLES },
        { name: 'password', label: 'Password', type: 'password', required: true, createOnly: true, autoComplete: 'new-password', hint: 'At least 10 characters, including a letter and a number.' },
        { name: 'active', label: 'Account active', type: 'toggle', editOnly: true, hint: 'Deactivated users are signed out and cannot sign in.' },
      ]}
      defaults={{ role: 'editor' }}
      extra={(record) => (record.id === me.id ? <p className="text-sm text-steel-600">You cannot reset your own password here.</p> : <ResetPassword user={record} />)}
    />
  )
}
