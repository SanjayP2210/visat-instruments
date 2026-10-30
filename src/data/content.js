// Brand and editable website content. Seeded into MongoDB (SiteContent, Brand) in Milestone 2.
// Anything with `published: false` is kept for the admin panel but not shown on the website
// until VISAT INSTRUMENTS confirms it.

export const brand = {
  name: 'MAGLON',
  slug: 'maglon',
  // Ownership/manufacturing relationship between VISAT INSTRUMENTS and MAGLON is not confirmed.
  relationship: 'unconfirmed',
  showRegisteredMark: true, // displayed as MAGLON®
  logo: null, // awaiting an original logo file
}

export const brandDisplayName = `${brand.name}${brand.showRegisteredMark ? '®' : ''}`

// Taglines from the promotional material. Not published: they include unverified claims.
export const taglines = {
  published: false,
  items: ['Precision Weighing for a Stronger Tomorrow…', 'Your Weighbridge Partner… Always', 'Accurate | Reliable | Durable'],
}

// Claims from the promotional material, awaiting confirmation.
export const marketingClaims = {
  published: false,
  items: ['High Accuracy', 'Rugged & Long Life', 'Easy Installation', 'Professional Service Support', 'Heavy Duty Weighbridge for Industrial Use'],
}

// Manufacturing capabilities, as listed in the promotional material ("Mfg of All Parts of Weighbridge").
// Hidden until manufacturing status is confirmed.
export const manufacturing = {
  published: false,
  title: 'Manufacturing capabilities',
  intro: 'Weighbridge parts listed by VISAT INSTRUMENTS.',
  items: [
    'Fully Electronic Weighbridge',
    'IT Kit (Interface / Junction Kit)',
    'Printer',
    'Junction Box',
    'Cup-Ball Type Load Cell',
    'USB Keyboard',
    'Jumbo Display',
    'All parts of weighbridge',
  ],
}

// Spare parts & accessories section (neutral wording; products are grouped by `kind`).
export const spareParts = {
  published: true,
  title: 'Weighbridge parts & accessories',
  intro: 'Parts, accessories and spares for weighbridge systems. Contact us for availability.',
  productKinds: ['part', 'accessory'],
}

// Reference only — never shown on the website.
export const referenceAssets = {
  promotionalPoster: 'docs/reference/maglon-visat-promotional-poster.jpeg',
}
