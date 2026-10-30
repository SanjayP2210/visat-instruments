import { Check } from 'lucide-react'
import Icon from './Icon'
import PendingBadge from './PendingBadge'

export default function ServiceCard({ service, showDetails = false }) {
  return (
    <article className="card flex h-full flex-col p-6 transition-colors hover:border-navy-100">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-navy-900 text-accent-400">
          <Icon name={service.icon} className="h-6 w-6" />
        </span>
        {service.status === 'to-be-confirmed' && <PendingBadge>To be confirmed</PendingBadge>}
      </div>
      <h3 className="mt-5 text-2xl font-bold">{service.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-steel-600">{service.summary}</p>
      {showDetails && (
        <ul className="mt-5 space-y-2 border-t border-steel-200 pt-5 text-sm text-navy-800">
          {service.details.map((d) => (
            <li key={d} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
              {d}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
