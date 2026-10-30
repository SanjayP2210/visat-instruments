import { TextArea, TextInput } from '../ui'

export default function BusinessStep({ form, setForm, errors }) {
  const b = form.business
  const set = (key) => (value) => setForm((f) => ({ ...f, business: { ...f.business, [key]: value } }))
  const err = (key) => errors[`business.${key}`]

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextInput id="b-name" label="Business name" required value={b.businessName} onChange={set('businessName')} error={err('businessName')} />
      <TextInput id="b-contact" label="Primary contact person" required value={b.contactPerson} onChange={set('contactPerson')} error={err('contactPerson')} />
      <TextInput id="b-phone" label="Mobile number" required value={b.phone} onChange={set('phone')} error={err('phone')} inputMode="tel" />
      <TextInput id="b-whatsapp" label="WhatsApp number" value={b.whatsapp} onChange={set('whatsapp')} error={err('whatsapp')} inputMode="tel" />
      <TextInput id="b-email" label="Business email" value={b.email} onChange={set('email')} error={err('email')} inputMode="email" />
      <TextInput id="b-gstin" label="GSTIN" value={b.gstin} onChange={set('gstin')} hint="Optional. Only if you want it shown on the website." />
      <TextArea id="b-address" label="Address" required value={b.address} onChange={set('address')} error={err('address')} rows={2} className="sm:col-span-2" />
      <TextInput id="b-city" label="City" value={b.city} onChange={set('city')} />
      <TextInput id="b-state" label="State" value={b.state} onChange={set('state')} />
      <TextInput id="b-pincode" label="PIN code" value={b.pincode} onChange={set('pincode')} inputMode="numeric" />
      <TextInput id="b-hours" label="Working hours" value={b.workingHours} onChange={set('workingHours')} hint="e.g. Mon–Sat, 9:30 AM – 7:00 PM" />
      <TextArea id="b-areas" label="Areas you serve" value={b.serviceAreas} onChange={set('serviceAreas')} rows={2} className="sm:col-span-2" hint="Cities, districts or states where you supply or provide service." />
      <TextArea id="b-desc" label="About the business" value={b.description} onChange={set('description')} rows={5} className="sm:col-span-2" hint="A short introduction in your own words. This helps us write the About Us page accurately." />
    </div>
  )
}
