// Single source of truth for business details used across the site.
// In Phase 2 this can be served from a `settings` collection via the API.

const addressLines = ['60, Radhika Park Society', 'Chandlodiya, Ahmedabad', 'Gujarat – 382481, India']

const fullAddress = '60, Radhika Park Society, Chandlodiya, Ahmedabad, Gujarat – 382481, India'

const mapsQuery = encodeURIComponent(`VISAT INSTRUMENTS, ${fullAddress}`)

export const business = {
  name: 'VISAT INSTRUMENTS',
  type: 'Weighing Scale Supplier',
  tagline: 'Weighing scales & weighbridge solutions in Ahmedabad',
  // Primary business contact: Mahesh Solanki. Every site-wide call and
  // WhatsApp button reads these values.
  contactPerson: 'Mahesh Solanki',
  phone: {
    display: '+91 98799 92228',
    tel: '+919879992228',
  },
  whatsapp: {
    number: '919879992228',
    url: 'https://wa.me/919879992228',
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
  // No `rating` here: review stats come only from live, approved website reviews (GET /api/public/site).
  rating: null,
}
