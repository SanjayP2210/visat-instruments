import { Boxes, Gauge, Hammer, Laptop, Monitor, Printer, Radio, Scale, ShieldCheck, Truck, Wrench } from 'lucide-react'

// Maps icon names stored in data files to components, keeping data serialisable.
const icons = { Boxes, Gauge, Hammer, Laptop, Monitor, Printer, Radio, Scale, ShieldCheck, Truck, Wrench }

export default function Icon({ name, ...props }) {
  const Component = icons[name] ?? Wrench
  return <Component aria-hidden="true" {...props} />
}
