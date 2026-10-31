import { Clock } from 'lucide-react'
import { useT } from '../../i18n/LanguageContext'

export default function PendingBadge({ children, className = '' }) {
  const t = useT()
  children ??= t('common.awaiting')
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-600 ring-1 ring-accent-100 ${className}`}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      {children}
    </span>
  )
}
