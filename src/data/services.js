// Service offerings. Scope, coverage area and pricing are awaiting confirmation
// from VISAT INSTRUMENTS, so every service carries `status: 'to-be-confirmed'`.

export const services = [
  {
    id: 'svc-installation',
    slug: 'installation',
    title: 'Installation',
    icon: 'Wrench',
    summary: 'Setting up weighing scales, indicators and weighbridges at your site.',
    details: [
      'Weighbridge platform installation',
      'Indicator and junction box connection',
      'Software setup on your PC',
    ],
    status: 'to-be-confirmed',
  },
  {
    id: 'svc-repair',
    slug: 'repair',
    title: 'Repair',
    icon: 'Hammer',
    summary: 'Diagnosis and repair of weighing scales and weighing electronics.',
    details: ['Scale and indicator faults', 'Load cell and wiring checks', 'Junction box issues'],
    status: 'to-be-confirmed',
  },
  {
    id: 'svc-maintenance',
    slug: 'maintenance',
    title: 'Maintenance',
    icon: 'ShieldCheck',
    summary: 'Periodic checks to keep weighing equipment working reliably.',
    details: ['Routine inspection', 'Cleaning and cable checks', 'Weighbridge upkeep'],
    status: 'to-be-confirmed',
  },
  {
    id: 'svc-calibration',
    slug: 'calibration',
    title: 'Calibration',
    icon: 'Gauge',
    summary: 'Adjusting scales and weighbridges so readings stay accurate.',
    details: ['Scale calibration', 'Weighbridge calibration', 'Accuracy checks'],
    status: 'to-be-confirmed',
  },
]

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
