import { Phone } from 'lucide-react'
import { business } from '../../data/business'
import { whatsappLink } from '../../utils/whatsapp'
import WhatsAppIcon from './WhatsAppIcon'

export default function ContactButtons({ message, callVariant = 'btn-outline', className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a href={whatsappLink(message)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
        <WhatsAppIcon className="h-4 w-4" />
        Enquire on WhatsApp
      </a>
      <a href={`tel:${business.phone.tel}`} className={callVariant}>
        <Phone className="h-4 w-4" aria-hidden="true" />
        Call {business.phone.display}
      </a>
    </div>
  )
}
