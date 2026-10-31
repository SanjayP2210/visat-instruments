const PHONE_RE = /^(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEnquiry(values) {
  const errors = {}
  const name = values.name.trim()
  const phone = values.phone.trim()
  const email = values.email.trim()
  const message = values.message.trim()

  // Values are translation keys (src/i18n); forms show them with t().
  if (!name) errors.name = 'val.nameRequired'
  else if (name.length < 2) errors.name = 'val.nameShort'

  if (!phone) errors.phone = 'val.phoneRequired'
  else if (!PHONE_RE.test(phone)) errors.phone = 'val.phoneInvalid'

  if (email && !EMAIL_RE.test(email)) errors.email = 'val.emailInvalid'

  if (!message) errors.message = 'val.messageRequired'
  else if (message.length < 10) errors.message = 'val.messageShort'

  return errors
}
