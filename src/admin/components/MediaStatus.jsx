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
