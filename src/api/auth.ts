import { clearAccessToken, clearRefreshToken } from './token'

export const AUTH_LOGOUT_EVENT = 'gifteon_admin:logout'

export interface LogoutOptions {
  redirectTo?: string
  emitEvent?: boolean
  preserveReturnPath?: boolean
}

const isBrowser = (): boolean => typeof window !== 'undefined'

const emitLogoutEvent = (): void => {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT))
}

export const logout = (options: LogoutOptions = {}): void => {
  clearAccessToken()
  clearRefreshToken()
  if (options.emitEvent !== false) {
    emitLogoutEvent()
  }
  if (options.redirectTo && isBrowser()) {
    const shouldPreservePath =
      options.preserveReturnPath === true && window.location.pathname !== '/login'
    if (shouldPreservePath) {
      const currentPath = `${window.location.pathname}${window.location.search}`
      const url = new URL(options.redirectTo, window.location.origin)
      url.searchParams.set('next', currentPath)
      window.location.assign(url.toString())
      return
    }
    window.location.assign(options.redirectTo)
  }
}
