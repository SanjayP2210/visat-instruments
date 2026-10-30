import { generalEnquiryMessage, whatsappLink } from '../../utils/whatsapp'
import WhatsAppIcon from '../common/WhatsAppIcon'

export default function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink(generalEnquiryMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with VISAT INSTRUMENTS on WhatsApp"
      className="fixed right-4 bottom-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#1fa855] text-white shadow-lg shadow-navy-900/25 transition-transform hover:scale-105 hover:bg-[#178a45] sm:right-6 sm:bottom-6"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  )
}
