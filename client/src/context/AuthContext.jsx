// AuthContext — single source of truth for authentication state.
// Shape: { user, mode, accessToken, login, logout, switchMode }
//
// - user: null | { id, email, name, anonymous_username, has_anonymous_identity, ... }
// - mode: 'feed' | 'shadow'  (which identity the UI is rendering)
// - accessToken: string | null
// - login(userData, token): sets user + token after successful auth
// - logout(): clears all auth state
// - switchMode(newMode): toggles between 'feed' and 'shadow'
//
// Full implementation (persistence, refresh, hydration) added in Phase 7.
import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('feed')
  const [accessToken, setAccessToken] = useState(null)

  const login = useCallback((userData, token) => {
    setUser(userData)
    setAccessToken(token)
    localStorage.setItem('accessToken', token)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    setMode('feed')
    localStorage.removeItem('accessToken')
  }, [])

  const switchMode = useCallback((newMode) => {
    if (newMode !== 'feed' && newMode !== 'shadow') return
    setMode(newMode)
  }, [])

  return (
    <AuthContext.Provider value={{ user, mode, accessToken, login, logout, switchMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext
