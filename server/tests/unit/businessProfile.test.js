// BusinessProfile contact numbers: schema validation and serialisation (no database needed).
import { describe, expect, it } from 'vitest'
import { BusinessProfile, DEFAULT_CONTACT_NUMBERS } from '../../src/models/BusinessProfile.js'

const contact = (overrides = {}) => ({
  label: 'Mobile', person: 'Test', displayNumber: '+91 98799 92228', dialNumber: '+919879992228', isWhatsApp: true, isPrimary: true, ...overrides,
})
const errorsFor = (contactNumbers) => new BusinessProfile({ name: 'VISAT INSTRUMENTS', contactNumbers }).validateSync()?.errors ?? {}
const messages = (errs) => Object.values(errs).map((e) => e.message).join(' | ')

describe('BusinessProfile contact numbers', () => {
  it('starts with both business numbers, Mahesh’s marked primary', () => {
    const profile = new BusinessProfile({ name: 'VISAT INSTRUMENTS' })
    expect(profile.validateSync()).toBeUndefined()
    expect(profile.contactNumbers.map((c) => c.displayNumber)).toEqual(['+91 98799 92228', '+91 99138 13861'])
    expect(profile.contactNumbers.map((c) => c.dialNumber)).toEqual(['+919879992228', '+919913813861'])
    expect(profile.primaryContact.dialNumber).toBe('+919879992228')
  })

  it('does not share the default list between documents', () => {
    const a = new BusinessProfile({ name: 'A' })
    const b = new BusinessProfile({ name: 'B' })
    a.contactNumbers[0].person = 'Changed'
    expect(b.contactNumbers[0].person).toBe('Mahesh Solanki')
    expect(DEFAULT_CONTACT_NUMBERS[0].person).toBe('Mahesh Solanki')
  })

  it('keeps the primary contact configurable', () => {
    const profile = new BusinessProfile({
      name: 'VISAT INSTRUMENTS',
      contactNumbers: [contact({ isPrimary: false }), contact({ displayNumber: '+91 99138 13861', dialNumber: '+919913813861', isPrimary: true })],
    })
    expect(profile.validateSync()).toBeUndefined()
    expect(profile.primaryContact.dialNumber).toBe('+919913813861')
  })

  it('rejects duplicate numbers', () => {
    expect(messages(errorsFor([contact(), contact({ isPrimary: false, label: 'Office' })]))).toContain('only be listed once')
  })

  it('requires exactly one primary number', () => {
    const second = { displayNumber: '+91 99138 13861', dialNumber: '+919913813861' }
    expect(messages(errorsFor([contact({ isPrimary: false }), contact({ ...second, isPrimary: false })]))).toContain('exactly one')
    expect(messages(errorsFor([contact(), contact({ ...second, isPrimary: true })]))).toContain('exactly one')
  })

  it.each([
    ['dial number without country code', { dialNumber: '9879992228', displayNumber: '98799 92228' }, 'international format'],
    ['dial number with spaces', { dialNumber: '+91 98799 92228' }, 'international format'],
    ['letters in the display number', { displayNumber: '+91 98799 CALL' }, 'digits'],
    ['display and dial numbers that differ', { displayNumber: '+91 99138 13861' }, 'same number'],
    ['missing dial number', { dialNumber: '' }, 'required'],
  ])('rejects %s', (_name, overrides, expected) => {
    expect(messages(errorsFor([contact(overrides)]))).toContain(expected)
  })

  it('allows at most 10 numbers', () => {
    const many = Array.from({ length: 11 }, (_, i) => contact({ displayNumber: `+91 98000 000${String(i).padStart(2, '0')}`, dialNumber: `+9198000000${String(i).padStart(2, '0')}`, isPrimary: i === 0 }))
    expect(messages(errorsFor(many))).toContain('At most 10')
  })

  it('serialises entries with `id` and exposes the primary contact', () => {
    const json = new BusinessProfile({ name: 'VISAT INSTRUMENTS' }).toJSON()
    expect(json.phone).toBeUndefined()
    expect(json.whatsappNumber).toBeUndefined()
    expect(json.contactNumbers[0]).toMatchObject({ label: 'Mobile', person: 'Mahesh Solanki', isWhatsApp: true, isPrimary: true })
    expect(typeof json.contactNumbers[0].id).toBe('string')
    expect(json.contactNumbers[0]._id).toBeUndefined()
    expect(json.primaryContact.dialNumber).toBe('+919879992228')
  })
})
