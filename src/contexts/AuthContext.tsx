import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@/types'
import { getMe, login as apiLogin, logout as apiLogout, register as apiRegister } from '@/lib/auth-api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  setUser: (u: User | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    setUser(u)
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  const register = async (email: string, password: string, name: string) => {
    const u = await apiRegister(email, password, name)
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
