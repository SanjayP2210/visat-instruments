// Service offerings. Sales, Service & Maintenance, Installation and AMC are confirmed by
// VISAT INSTRUMENTS; scope, coverage area and charges are shared on enquiry.
// `published: false` entries are kept for the admin panel but never shown on the website.

export const services = [
  {
    id: 'svc-sales',
    slug: 'sales',
    title: 'Sales',
    icon: 'Truck',
    summary: 'Supply of weighbridges and weighbridge parts, accessories and spares.',
    details: ['Fully electronic weighbridges', 'Weighbridge parts and accessories', 'Spares'],
    status: 'confirmed',
    published: true,
  },
  {
    id: 'svc-service-maintenance',
    slug: 'service-maintenance',
    title: 'Service & Maintenance',
    icon: 'Wrench',
    summary: 'Service and maintenance support for weighbridges.',
    details: ['Service visits', 'Maintenance', 'Replacement parts and spares'],
    status: 'confirmed',
    published: true,
  },
  {
    id: 'svc-installation',
    slug: 'installation',
    title: 'Installation',
    icon: 'Hammer',
    summary: 'Installation of weighbridges at your site.',
    details: ['Weighbridge installation', 'Connection of weighing electronics'],
    status: 'confirmed',
    published: true,
  },
  {
    id: 'svc-amc',
    slug: 'amc',
    title: 'Annual Maintenance Contract (AMC)',
    icon: 'ShieldCheck',
    summary: 'Annual Maintenance Contract for weighbridges.',
    details: ['Yearly maintenance contract', 'Terms shared on enquiry'],
    status: 'confirmed',
    published: true,
  },
  {
    id: 'svc-calibration',
    slug: 'calibration',
    title: 'Calibration',
    icon: 'Gauge',
    summary: 'Calibration of weighing equipment.',
    details: [],
    status: 'to-be-confirmed',
    published: false, // not confirmed: do not show on the website
  },
]

export const publishedServices = services.filter((s) => s.published)

export const weighbridgeSolutions = {
  components: [
    {
      title: 'Weighbridge platform',
      icon: 'Truck',
      text: 'Steel deck platform, planned around your site, vehicles and foundation.',
      productSlug: 'electronic-weighbridge',
    },
    {
      title: 'Load cell junction box',
      icon: 'Boxes',
      text: 'Combines the load cell cables from the platform into one connection.',
      productSlug: 'load-cell-junction-box',
    },
    {
      title: 'Digital indicator',
      icon: 'Monitor',
      text: 'Shows the live weight from the platform at the operator desk.',
      productSlug: 'digital-weighing-indicator',
    },
    {
      title: 'Communication module',
      icon: 'Radio',
      text: 'Links the weighing hardware to the PC without long serial cables.',
      productSlug: 'wireless-serial-communication-module',
    },
    {
      title: 'Weighbridge software',
      icon: 'Laptop',
      text: 'Records tickets, vehicles, materials and weights, and produces reports.',
      productSlug: 'weighbridge-software',
    },
  ],
  softwareFeatures: [
    'Live weight readout on screen',
    'Ticket number and vehicle number entry',
    'Inward / outward movement',
    'Gross, tare and net weights with dates and times',
    'Material, supplier, receiver and transporter fields',
    'Driver name and contact number',
    'Search, report and settings screens',
    'Pending vehicle and pending payment views',
  ],
  steps: [
    { title: 'Share your requirement', text: 'Tell us about your site, vehicles and what you need to weigh.' },
    { title: 'Discuss the setup', text: 'We discuss the platform, electronics and software that fit.' },
    { title: 'Installation', text: 'Platform, wiring, indicator and software are set up on site.' },
    { title: 'Support', text: 'Ongoing help for repair, maintenance and calibration.' },
  ],
}
