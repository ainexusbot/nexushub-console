import { createContext, useContext, useState, useEffect } from 'react'
import { api, getApiBase } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('reddit_token')
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const response = await api.post('/auth/authenticate/')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        localStorage.setItem('reddit_user', JSON.stringify(data.user))
      } else {
        localStorage.removeItem('reddit_token')
        localStorage.removeItem('reddit_refresh')
        localStorage.removeItem('reddit_user')
      }
    } catch (err) {
      localStorage.removeItem('reddit_token')
      localStorage.removeItem('reddit_refresh')
      localStorage.removeItem('reddit_user')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    setError(null)
    
    // Demo mode for testing
    if (email === 'demo@example.com' || email.includes('demo')) {
      const demoUser = {
        id: 'demo-user-1',
        email: email,
        username: 'demouser'
      }
      localStorage.setItem('reddit_token', 'demo-token-' + Date.now())
      localStorage.setItem('reddit_refresh', 'demo-refresh-' + Date.now())
      localStorage.setItem('reddit_user', JSON.stringify(demoUser))
      setUser(demoUser)
      return true
    }
    
    try {
      const response = await fetch(`${getApiBase()}/auth/email-login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || 'Login failed')
      }

      localStorage.setItem('reddit_token', data.access)
      localStorage.setItem('reddit_refresh', data.refresh)
      localStorage.setItem('reddit_user', JSON.stringify(data.user))
      setUser(data.user)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }

  const logout = async () => {
    const refresh = localStorage.getItem('reddit_refresh')
    if (refresh) {
      try {
        await api.post('/auth/logout/', { refresh })
      } catch (err) {
      }
    }
    localStorage.removeItem('reddit_token')
    localStorage.removeItem('reddit_refresh')
    localStorage.removeItem('reddit_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkAuth }}>
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
