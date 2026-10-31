import { Phone } from 'lucide-react'
import { useBusiness } from '../../context/SiteData'
import { useT } from '../../i18n/LanguageContext'
import { whatsappLink } from '../../utils/whatsapp'
import WhatsAppIcon from './WhatsAppIcon'

export default function ContactButtons({ message, callVariant = 'btn-outline', className = '' }) {
  const business = useBusiness()
  const t = useT()
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a href={whatsappLink(message, business)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
        <WhatsAppIcon className="h-4 w-4" />
        {t('cta.enquireWhatsApp')}
      </a>
      <a href={`tel:${business.phone.tel}`} className={callVariant}>
        <Phone className="h-4 w-4" aria-hidden="true" />
        {t('cta.callNumber', { number: business.phone.display })}
      </a>
    </div>
  )
}
