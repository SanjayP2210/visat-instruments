// Product catalogue (Phase 1: static data).
// Shapes mirror the planned MongoDB collections (`categories`, `products`) so the
// UI can switch to API data later without changes. Products reference categories
// by `categoryId`, the way a document reference would work.
//
// Content rule: only describe what is visible in the actual photographs.
// Capacities, accuracy, prices, models and other specifications are
// intentionally left as "On enquiry" until confirmed by VISAT INSTRUMENTS.
// Products without an original photograph have `image: null` and show a
// "Photo coming soon" placeholder; never substitute stock or poster images.
//
// `kind` groups products for the spare parts & accessories section:
// system | part | accessory | software | instrument.

export const PENDING = 'On enquiry'

const enquiryOnlySpecs = () => [
  { label: 'Specifications', value: PENDING },
  { label: 'Price', value: PENDING },
]

export const categories = [
  {
    id: 'cat-indicators',
    icon: 'Monitor',
    slug: 'digital-weighing-indicators',
    name: 'Digital Weighing Indicators',
    shortName: 'Indicators',
    description: 'Digital display units that read and show weight from load cells.',
    sortOrder: 1,
  },
  {
    id: 'cat-scales',
    icon: 'Scale',
    slug: 'electronic-weighing-scales',
    name: 'Electronic Weighing Scales',
    shortName: 'Scales',
    description: 'Table-top electronic scales for shops, counters and workshops.',
    sortOrder: 2,
  },
  {
    id: 'cat-junction-boxes',
    icon: 'Boxes',
    slug: 'load-cell-junction-boxes',
    name: 'Load Cell Junction Boxes',
    shortName: 'Junction Boxes',
    description: 'Enclosures that bring multiple load cell cables together.',
    sortOrder: 3,
  },
  {
    id: 'cat-communication',
    icon: 'Radio',
    slug: 'communication-modules',
    name: 'Communication Modules',
    shortName: 'Communication',
    description: 'Serial communication accessories for connecting weighing equipment.',
    sortOrder: 4,
  },
  {
    id: 'cat-weighbridges',
    icon: 'Truck',
    slug: 'weighbridge-systems',
    name: 'Weighbridge Systems',
    shortName: 'Weighbridges',
    description: 'Steel weighbridge platforms for weighing trucks and vehicles.',
    sortOrder: 5,
  },
  {
    id: 'cat-software',
    icon: 'Laptop',
    slug: 'weighbridge-software',
    name: 'Weighbridge Software',
    shortName: 'Software',
    description: 'PC software for recording weighbridge tickets and reports.',
    sortOrder: 6,
  },
  {
    id: 'cat-load-cells',
    icon: 'Gauge',
    slug: 'load-cells',
    name: 'Load Cells',
    shortName: 'Load Cells',
    description: 'Load cells used in weighbridge systems.',
    sortOrder: 7,
  },
  {
    id: 'cat-printers-accessories',
    icon: 'Printer',
    slug: 'printers-accessories',
    name: 'Printers & Accessories',
    shortName: 'Accessories',
    description: 'Printers and accessories supplied with weighbridge systems.',
    sortOrder: 8,
  },
]

export const products = [
  {
    id: 'prd-digital-indicator',
    slug: 'digital-weighing-indicator',
    name: 'Digital Weighing Indicator',
    categoryId: 'cat-indicators',
    kind: 'instrument',
    featured: true,
    image: {
      src: '/images/products/kanot.webp',
      alt: 'VISAT instruments branded digital weighing indicator with a red LED display showing 50 and a four-button keypad',
      fit: 'cover',
    },
    summary: 'Bench-top weighing indicator with a large red LED readout, carrying the Visat instruments name.',
    description:
      'A bench-top digital weighing indicator in a metal enclosure. The front panel carries the Visat instruments name, a multi-digit red LED display and a small directional keypad. Ask us which load cells and platforms it can be paired with for your application.',
    highlights: [
      'Multi-digit red LED weight display',
      'Front keypad with arrow keys',
      'Metal desktop enclosure',
      'Visat instruments branded front panel',
    ],
    specifications: [
      { label: 'Display', value: 'Red LED, multi-digit (as pictured)' },
      { label: 'Capacity / resolution', value: PENDING },
      { label: 'Power supply', value: PENDING },
      { label: 'Output / interfaces', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },
  {
    id: 'prd-electronic-scale',
    slug: 'electronic-weighing-scale',
    name: 'Electronic Weighing Scale',
    categoryId: 'cat-scales',
    kind: 'instrument',
    featured: true,
    image: {
      src: '/images/products/kato.webp',
      alt: 'Table-top electronic weighing scale with a metal pan, green LED display and blue front panel labelled Electronic Weighing Scale',
      fit: 'cover',
    },
    summary: 'Table-top electronic scale with a metal weighing pan and green LED display.',
    description:
      'A table-top electronic weighing scale with a flat metal weighing pan and a front console that has a green LED weight display and push-button controls. Suitable for counter and workshop weighing — contact us to confirm the capacity and accuracy you need.',
    highlights: [
      'Flat metal weighing pan',
      'Green LED weight display',
      'Push-button front controls',
      'Compact table-top body',
    ],
    specifications: [
      { label: 'Display', value: 'Green LED (as pictured)' },
      { label: 'Capacity', value: PENDING },
      { label: 'Accuracy / readability', value: PENDING },
      { label: 'Pan size', value: PENDING },
      { label: 'Power / battery', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },
  {
    id: 'prd-junction-box',
    slug: 'load-cell-junction-box',
    name: 'Load Cell Junction Box',
    categoryId: 'cat-junction-boxes',
    kind: 'part',
    featured: true,
    image: {
      src: '/images/products/socket.webp',
      alt: 'Stack of orange metal load cell junction boxes, each fitted with a row of cable glands',
      fit: 'contain',
    },
    summary: 'Orange metal junction boxes with cable glands for connecting load cells.',
    description:
      'Load cell junction boxes in orange metal enclosures, each fitted with a row of cable glands for load cell and indicator cables. Junction boxes are used on weighbridges and multi-load-cell platforms to combine signals into a single cable to the indicator.',
    highlights: [
      'Metal enclosure with orange finish',
      'Row of cable gland entries',
      'Used on weighbridges and multi-cell platforms',
      'Available in more than one size (as pictured)',
    ],
    specifications: [
      { label: 'Number of load cell inputs', value: PENDING },
      { label: 'Enclosure material / rating', value: PENDING },
      { label: 'Dimensions', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },
  {
    id: 'prd-communication-module',
    slug: 'wireless-serial-communication-module',
    name: 'Wireless Serial Communication Module',
    categoryId: 'cat-communication',
    kind: 'accessory',
    featured: false,
    image: {
      src: '/images/products/adapter.webp',
      alt: 'Black wireless serial communication adapter with a D-sub connector and an external antenna, mounted on a panel',
      fit: 'cover',
    },
    summary: 'Wireless serial adapter with a D-sub connector and external antenna.',
    description:
      'A compact wireless serial communication adapter with a D-sub connector on one end and an external antenna on the other, shown installed on a panel. Modules like this are used to link weighing equipment to a PC without running long serial cables. Compatibility with your indicator and PC setup should be confirmed with us.',
    highlights: [
      'D-sub serial connector',
      'External screw-on antenna',
      'Compact panel-mount body',
      'Helps avoid long cable runs',
    ],
    specifications: [
      { label: 'Interface', value: 'D-sub serial connector (as pictured)' },
      { label: 'Range', value: PENDING },
      { label: 'Compatibility', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },
  {
    id: 'prd-weighbridge',
    slug: 'electronic-weighbridge', // kept so existing links keep working
    name: 'Fully Electronic Weighbridge',
    categoryId: 'cat-weighbridges',
    kind: 'system',
    featured: true,
    image: {
      src: '/images/products/bridge.webp',
      alt: 'Blue steel weighbridge platform with side guard rails being installed on concrete foundations at an outdoor site',
      fit: 'cover',
    },
    summary: 'Steel-deck weighbridge platform for weighing trucks and loaded vehicles.',
    description:
      'An electronic weighbridge with a blue painted steel deck and side guard rails, shown during on-site installation on concrete foundations. A weighbridge combines the platform, load cells, junction box, indicator and optionally PC software into one vehicle-weighing system. Platform size, capacity and foundation type are decided per site.',
    highlights: [
      'Steel deck with side guard rails',
      'Installed on concrete foundations',
      'Works with indicator and weighbridge software',
      'Site-specific planning',
    ],
    specifications: [
      { label: 'Platform size', value: PENDING },
      { label: 'Capacity', value: PENDING },
      { label: 'Foundation type', value: 'Decided per site' },
      { label: 'Load cells', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },
  {
    id: 'prd-weighbridge-software',
    slug: 'weighbridge-software',
    name: 'Weighbridge Software',
    categoryId: 'cat-software',
    kind: 'software',
    featured: true,
    image: {
      src: '/images/products/meter.webp',
      alt: 'VISAT INSTRUMENTS weighbridge software on a PC screen showing a weight readout, ticket and vehicle fields, and function buttons',
      fit: 'contain',
    },
    summary: 'Windows PC software for weighbridge tickets, vehicles, materials and reports.',
    description:
      'VISAT INSTRUMENTS weighbridge software running on a Windows PC. The screen shows a large live weight readout, ticket and vehicle number fields, inward/outward selection, gross, tare and net weights, material, supplier, receiver, transporter and driver details, along with function-key buttons for search, report, settings, save, pending vehicles and pending payments.',
    highlights: [
      'Large live weight readout',
      'Ticket, vehicle and material entry',
      'Gross / tare / net weight recording',
      'Search, reports, pending vehicle and pending payment views',
      'Function-key shortcuts (F1–F7)',
    ],
    specifications: [
      { label: 'Platform', value: 'Windows PC (as pictured)' },
      { label: 'Weight modes', value: 'Gross, Tare, Auto (as pictured)' },
      { label: 'Licensing', value: PENDING },
      { label: 'Indicator compatibility', value: PENDING },
      { label: 'Price', value: PENDING },
    ],
  },

  // Products listed in VISAT INSTRUMENTS' promotional material. No original photographs yet,
  // and no specifications have been confirmed, so only the names and their place in a
  // weighbridge system are stated.
  {
    id: 'prd-it-kit',
    slug: 'it-kit',
    name: 'IT Kit (Interface / Junction Kit)',
    categoryId: 'cat-junction-boxes',
    kind: 'part',
    featured: false,
    image: null,
    summary: 'Interface / junction kit for weighbridge systems.',
    description: 'IT Kit (interface / junction kit), supplied as a part for weighbridge systems. Details and specifications are shared on enquiry.',
    highlights: [],
    specifications: enquiryOnlySpecs(),
  },
  {
    id: 'prd-cup-ball-load-cell',
    slug: 'cup-ball-type-load-cell',
    name: 'Cup-Ball Type Load Cell',
    categoryId: 'cat-load-cells',
    kind: 'part',
    featured: false,
    image: null,
    summary: 'Cup-ball type load cell for weighbridge systems.',
    description: 'Cup-ball type load cell, supplied as a part for weighbridge systems. Capacity and specifications are shared on enquiry.',
    highlights: [],
    specifications: enquiryOnlySpecs(),
  },
  {
    id: 'prd-jumbo-display',
    slug: 'jumbo-display',
    name: 'Jumbo Display',
    categoryId: 'cat-indicators',
    kind: 'part',
    featured: false,
    image: null,
    summary: 'Jumbo weight display for weighbridge systems.',
    description: 'Jumbo display for showing weight readings at a weighbridge. Size and specifications are shared on enquiry.',
    highlights: [],
    specifications: enquiryOnlySpecs(),
  },
  {
    id: 'prd-printer',
    slug: 'printer',
    name: 'Printer',
    categoryId: 'cat-printers-accessories',
    kind: 'accessory',
    featured: false,
    image: null,
    summary: 'Printer supplied as a weighbridge accessory.',
    description: 'Printer supplied as an accessory for weighbridge systems. Model and specifications are shared on enquiry.',
    highlights: [],
    specifications: enquiryOnlySpecs(),
  },
  {
    id: 'prd-usb-keyboard',
    slug: 'usb-keyboard',
    name: 'USB Keyboard',
    categoryId: 'cat-printers-accessories',
    kind: 'accessory',
    featured: false,
    image: null,
    summary: 'USB keyboard supplied as a weighbridge accessory.',
    description: 'USB keyboard supplied as an accessory for weighbridge systems. Details are shared on enquiry.',
    highlights: [],
    specifications: enquiryOnlySpecs(),
  },
]
