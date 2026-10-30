// Single source of truth for business details used across the site.
// In Phase 2 this can be served from a `settings` collection via the API.

const addressLines = ['60, Radhika Park Society', 'Chandlodiya, Ahmedabad', 'Gujarat – 382481, India']

const fullAddress = '60, Radhika Park Society, Chandlodiya, Ahmedabad, Gujarat – 382481, India'

const mapsQuery = encodeURIComponent(`VISAT INSTRUMENTS, ${fullAddress}`)

export const business = {
  name: 'VISAT INSTRUMENTS',
  type: 'Weighing Scale Supplier',
  owner: {
    name: 'Manish Solanki',
    role: 'Owner',
  },
  tagline: 'Weighing scales & weighbridge solutions in Ahmedabad',
  phone: {
    display: '+91 99138 13861',
    tel: '+919913813861',
  },
  whatsapp: {
    number: '919913813861',
    url: 'https://wa.me/919913813861',
  },
  address: {
    lines: addressLines,
    full: fullAddress,
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382481',
    country: 'India',
  },
  maps: {
    view: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
    embed: `https://www.google.com/maps?q=${mapsQuery}&output=embed`,
  },
  rating: {
    value: 5.0,
    count: 13,
    source: 'Google',
  },
}
