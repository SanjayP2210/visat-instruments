import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setCsrfToken, setUnauthenticatedHandler } from '../api/client'

// Session state comes from the backend: the session cookie is HTTP-only, so the panel
// asks /api/auth/me who is signed in and receives the CSRF token for changes.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // loading | signed-in | signed-out

  const signedOut = useCallback(() => {
    setCsrfToken('')
    setUser(null)
    setStatus('signed-out')
  }, [])

  useEffect(() => {
    setUnauthenticatedHandler(signedOut)
    api
      .get('/auth/me')
      .then(({ data }) => {
        setCsrfToken(data.csrfToken)
        setUser(data.user)
        setStatus('signed-in')
      })
      .catch(signedOut)
  }, [signedOut])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setCsrfToken(data.csrfToken)
    setUser(data.user)
    setStatus('signed-in')
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      signedOut()
    }
  }, [signedOut])

  const value = useMemo(
    () => ({
      user,
      status,
      login,
      logout,
      isAdmin: user?.role === 'admin',
      can: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, status, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
