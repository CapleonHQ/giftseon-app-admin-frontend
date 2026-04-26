'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getAccessToken, getRefreshToken } from '@/api/token'
import { AUTH_LOGOUT_EVENT } from '@/api/auth'
import { getAdminProfile } from '@/api/services/auth'
import type { AdminProfile } from '@/types/Admin'

const STORAGE_KEY = 'gifteon_admin:auth:v1'
const CACHE_TTL_MS = 15 * 60 * 1000

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

type AuthCache = {
  version: 1
  admin: AdminProfile
  lastVerifiedAt: number
}

type AuthContextValue = {
  status: AuthStatus
  admin: AdminProfile | null
  refreshAdmin: () => Promise<void>
  clearAdmin: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const readCache = (): AuthCache | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthCache
    if (parsed.version !== 1 || !parsed.admin || !parsed.lastVerifiedAt) return null
    return parsed
  } catch {
    return null
  }
}

const writeCache = (admin: AdminProfile, lastVerifiedAt: number) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, admin, lastVerifiedAt }))
}

const clearCache = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

const isCacheFresh = (lastVerifiedAt: number) => Date.now() - lastVerifiedAt < CACHE_TTL_MS

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const inFlightRef = useRef(false)

  const clearAdmin = useCallback(() => {
    setAdmin(null)
    clearCache()
    setStatus('unauthenticated')
  }, [])

  const refreshAdmin = useCallback(async () => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    try {
      const accessToken = getAccessToken()
      const refreshToken = getRefreshToken()

      if (!accessToken && !refreshToken) {
        clearAdmin()
        return
      }

      // Serve from cache if still fresh
      const cache = readCache()
      if (cache && isCacheFresh(cache.lastVerifiedAt)) {
        setAdmin(cache.admin)
        setStatus('authenticated')
        return
      }

      // Fetch real profile from admin-service
      const resp = await getAdminProfile()
      const profile = resp.data as AdminProfile
      const now = Date.now()
      setAdmin(profile)
      writeCache(profile, now)
      setStatus('authenticated')
    } catch {
      clearAdmin()
    } finally {
      inFlightRef.current = false
    }
  }, [clearAdmin])

  useEffect(() => {
    const accessToken = getAccessToken()
    const refreshToken = getRefreshToken()

    if (!accessToken && !refreshToken) {
      setStatus('unauthenticated')
      return
    }

    const cache = readCache()
    if (cache) {
      setAdmin(cache.admin)
      setStatus('authenticated')
      if (isCacheFresh(cache.lastVerifiedAt)) return
    }

    refreshAdmin()
  }, [refreshAdmin])

  useEffect(() => {
    const handleLogout = () => clearAdmin()
    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout)
  }, [clearAdmin])

  const value = useMemo<AuthContextValue>(
    () => ({ status, admin, refreshAdmin, clearAdmin }),
    [status, admin, refreshAdmin, clearAdmin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
