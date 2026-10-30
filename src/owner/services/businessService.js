// Business profile section ↔ storage record (Business_Profile sheet / future `businessProfiles` collection).
const FIELDS = [
  'businessName', 'contactPerson', 'phone', 'whatsapp', 'email', 'address', 'city', 'state', 'pincode', 'gstin',
  'description', 'workingHours', 'serviceAreas',
]

export function toBusinessRecord(businessForm) {
  return Object.fromEntries(FIELDS.map((f) => [f, String(businessForm[f] ?? '').trim()]))
}
