import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

// Upload configuration from the server (whether Cloudinary is set up, size limit). No secrets.
const MediaContext = createContext({ configured: true, maxBytes: 5 * 1024 * 1024, loaded: false })

export function MediaStatusProvider({ children }) {
  const [status, setStatus] = useState({ configured: true, maxBytes: 5 * 1024 * 1024, loaded: false })
  useEffect(() => {
    api.get('/media/status').then(({ data }) => setStatus({ ...data, loaded: true })).catch(() => setStatus((s) => ({ ...s, loaded: true })))
  }, [])
  return <MediaContext.Provider value={status}>{children}</MediaContext.Provider>
}

export const useMediaStatus = () => useContext(MediaContext)

/** Upload limit in MB as set on the server (4 MB on Vercel, 5 MB elsewhere by default). */
export const limitMb = (maxBytes) => Math.round((maxBytes / 1024 / 1024) * 10) / 10

/** "JPG, PNG or WebP, up to N MB each." — the live server limit, shown once it is known. */
export function UploadLimit({ className = '' }) {
  const { configured, maxBytes, loaded } = useMediaStatus()
  if (!loaded || !configured) return null
  return <p className={`text-xs text-steel-500 ${className}`}>JPG, PNG or WebP, up to {limitMb(maxBytes)} MB each.</p>
}
