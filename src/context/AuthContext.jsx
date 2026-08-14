import { createContext, useContext, useState, useEffect } from 'react'
import { getApiBase, getToken, setToken, clearSession } from '../utils/api'

const AuthContext = createContext(null)

const USER_KEY = 'nexushub_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = getToken()
    const storedUser = localStorage.getItem(USER_KEY)

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        clearSession()
      }
      setLoading(false)
      return
    }

    // No access token in memory — try to restore via refresh cookie.
    try {
      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.accessToken) {
          setToken(data.accessToken)
          if (data.user) {
            setUser(data.user)
            localStorage.setItem(USER_KEY, JSON.stringify(data.user))
          }
        }
      } else {
        clearSession()
      }
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setError(null)
    try {
      const response = await fetch(`${getApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.accessToken) {
        throw new Error(data.error || data.message || 'Invalid email or password')
      }

      setToken(data.accessToken)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setUser(data.user)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const logout = async () => {
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
    } catch {
      // ignore network errors on logout
    }
    clearSession()
    setUser(null)
  }

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.is_admin

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkAuth, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
