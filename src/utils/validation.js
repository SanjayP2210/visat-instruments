const PHONE_RE = /^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEnquiry(values) {
  const errors = {}
  const name = values.name.trim()
  const phone = values.phone.trim()
  const email = values.email.trim()
  const message = values.message.trim()

  if (!name) errors.name = 'Please enter your name.'
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters.'

  if (!phone) errors.phone = 'Please enter your phone number.'
  else if (!PHONE_RE.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.'

  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'

  if (!message) errors.message = 'Please tell us what you need.'
  else if (message.length < 10) errors.message = 'Message should be at least 10 characters.'

  return errors
}
