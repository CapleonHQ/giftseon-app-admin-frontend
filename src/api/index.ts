import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URLS, API_DEFAULT_TIMEOUT_MS, API_KEY } from './config'
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken } from './token'
import { normalizeApiError } from './error'
import { logout } from './auth'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthLogout?: boolean
    skipAuthRefresh?: boolean
  }
}

const hasAuthHeader = (config?: InternalAxiosRequestConfig): boolean => {
  const header = config?.headers?.Authorization ?? config?.headers?.authorization ?? ''
  return typeof header === 'string' && header.startsWith('Bearer ')
}

let refreshPromise: Promise<void> | null = null

const isRefreshEndpoint = (url?: string): boolean => {
  if (!url) return false
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url
    return path.includes('/refresh-token')
  } catch {
    return url.includes('/refresh-token')
  }
}

const refreshTokens = async (): Promise<void> => {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('Missing refresh token')

    const resp = await axios.post(`${API_BASE_URLS.admin}/auth/refresh`, { refreshToken })
    const accessToken = resp.data?.data?.accessToken ?? ''
    const newRefreshToken = resp.data?.data?.refreshToken ?? ''

    if (accessToken) setAccessToken(accessToken)
    else throw new Error('Missing access token in refresh response')
    if (newRefreshToken) setRefreshToken(newRefreshToken)
  })()

  try {
    await refreshPromise
  } finally {
    refreshPromise = null
  }
}

interface CreateClientOptions {
  withAuth?: boolean
}

const createClient = (baseURL: string, options: CreateClientOptions = {}): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: API_DEFAULT_TIMEOUT_MS,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    },
  })

  if (options.withAuth) {
    instance.interceptors.request.use((config) => {
      const token = getAccessToken()
      if (token) {
        config.headers = config.headers ?? {}
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const normalized = normalizeApiError(error)
      const isUnauthorized = normalized.code === 'UNAUTHORIZED'
      const canRefresh =
        isUnauthorized &&
        !error?.config?.skipAuthRefresh &&
        !isRefreshEndpoint(error?.config?.url) &&
        hasAuthHeader(error?.config)

      if (canRefresh) {
        try {
          await refreshTokens()
          const retryConfig = error.config as InternalAxiosRequestConfig
          retryConfig.headers = retryConfig.headers ?? {}
          retryConfig.headers.Authorization = `Bearer ${getAccessToken()}`
          return instance.request(retryConfig)
        } catch {
          // fall through to logout
        }
      }

      const shouldLogout = isUnauthorized && !error?.config?.skipAuthLogout && hasAuthHeader(error?.config)
      if (shouldLogout) {
        logout({ redirectTo: '/login', preserveReturnPath: true })
      }

      return Promise.reject(normalized)
    }
  )

  return instance
}

const apiService = {
  authPublic: createClient(API_BASE_URLS.auth),
  authPrivate: createClient(API_BASE_URLS.auth, { withAuth: true }),
  appPublic: createClient(API_BASE_URLS.app),
  appPrivate: createClient(API_BASE_URLS.app, { withAuth: true }),
  adminPublic: createClient(API_BASE_URLS.admin),
  adminPrivate: createClient(API_BASE_URLS.admin, { withAuth: true }),
}

export default apiService
