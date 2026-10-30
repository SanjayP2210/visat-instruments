import { useEffect } from 'react'
import { business } from '../data/business'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${business.name}` : `${business.name} | Weighing Scales & Weighbridge Solutions, Ahmedabad`
  }, [title])
}
