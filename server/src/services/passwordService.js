import bcrypt from 'bcryptjs'

export const PASSWORD_RULES = 'At least 10 characters, including a letter and a number.'

export function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 10 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password)
}

export function hashPassword(password, rounds) {
  return bcrypt.hash(password, rounds)
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// Compared against when the email is unknown, so failed logins take the same time either way.
const DUMMY_HASH = bcrypt.hashSync('visat-timing-equaliser', 10)
export function burnPasswordCheck(password) {
  return bcrypt.compare(String(password), DUMMY_HASH)
}
