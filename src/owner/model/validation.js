// Client-side validation for a better experience. The server re-validates every
// submission (validateForSubmit_ in apps-script/Code.gs); keep the rules in sync.
const PHONE_RE = /^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const STEPS = [
  { key: 'business', title: 'Business information' },
  { key: 'products', title: 'Products' },
  { key: 'specifications', title: 'Specifications' },
  { key: 'images', title: 'Product photos' },
  { key: 'services', title: 'Services' },
  { key: 'weighbridge', title: 'Weighbridge solutions' },
  { key: 'highlights', title: 'Business highlights' },
  { key: 'feedback', title: 'Website feedback' },
  { key: 'review', title: 'Review & submit' },
]

// Returns { [fieldPath]: message } for one step.
export function validateStep(key, form) {
  const errors = {}
  if (key === 'business') {
    const b = form.business
    if (!b.businessName.trim()) errors['business.businessName'] = 'Business name is required.'
    if (!b.contactPerson.trim()) errors['business.contactPerson'] = 'Contact person is required.'
    if (!PHONE_RE.test(b.phone.trim())) errors['business.phone'] = 'Enter a valid 10-digit mobile number.'
    if (b.whatsapp.trim() && !PHONE_RE.test(b.whatsapp.trim())) errors['business.whatsapp'] = 'Enter a valid 10-digit number.'
    if (b.email.trim() && !EMAIL_RE.test(b.email.trim())) errors['business.email'] = 'Enter a valid email address.'
    if (!b.address.trim()) errors['business.address'] = 'Address is required.'
  }
  if (key === 'products') {
    if (!form.products.length) errors.products = 'Add at least one product.'
    form.products.forEach((p) => {
      if (!p.name.trim()) errors[`products.${p.id}.name`] = 'Product name is required.'
      if (!p.category) errors[`products.${p.id}.category`] = 'Choose a category.'
    })
  }
  if (key === 'specifications') {
    form.products.forEach((p) =>
      p.specifications.forEach((s) => {
        if (!s.label.trim() || !s.value.trim()) errors[`specs.${s.id}`] = 'Enter both the specification name and value, or remove it.'
      }),
    )
  }
  if (key === 'services') {
    form.services.forEach((s) => {
      if (!s.type) errors[`services.${s.id}.type`] = 'Choose a service type.'
      if (!s.offered) errors[`services.${s.id}.offered`] = 'Say whether this service is offered.'
    })
  }
  return errors
}

export function validateAll(form) {
  return STEPS.reduce((acc, step) => {
    const errors = validateStep(step.key, form)
    if (Object.keys(errors).length) acc[step.key] = errors
    return acc
  }, {})
}
