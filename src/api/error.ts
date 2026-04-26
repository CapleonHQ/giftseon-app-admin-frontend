import axios from 'axios'
import { ApiErrorCode, NormalizedApiError } from '@/types/Common'

const mapStatusToCode = (status?: number): NormalizedApiError['code'] => {
  if (!status) return 'UNKNOWN'
  if (status === 400) return 'BAD_REQUEST'
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 422) return 'VALIDATION_ERROR'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'SERVER_ERROR'
  return 'UNKNOWN'
}

const fallbackMessageFor = (code: ApiErrorCode): string => {
  switch (code) {
    case 'NETWORK_ERROR': return 'Network error. Check your connection.'
    case 'TIMEOUT': return 'Request timed out. Please try again.'
    case 'UNAUTHORIZED': return 'Session expired. Please sign in again.'
    case 'FORBIDDEN': return 'You do not have permission to perform this action.'
    case 'NOT_FOUND': return 'Requested resource not found.'
    case 'VALIDATION_ERROR': return 'Please correct the highlighted fields.'
    case 'RATE_LIMITED': return 'Too many requests. Please try again later.'
    case 'SERVER_ERROR': return 'Server error. Please try again later.'
    case 'BAD_REQUEST': return 'Invalid request. Please check your input.'
    default: return 'Something went wrong. Please try again.'
  }
}

export const normalizeApiError = (error: unknown): NormalizedApiError => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const data = error.response?.data as Record<string, unknown> | undefined

    const code = error.code === 'ECONNABORTED'
      ? 'TIMEOUT'
      : error.message?.toLowerCase().includes('network')
        ? 'NETWORK_ERROR'
        : mapStatusToCode(status)

    const message =
      (typeof data?.message === 'string' ? data.message : undefined) ||
      (typeof data?.error === 'string' ? data.error : undefined) ||
      fallbackMessageFor(code)

    return {
      ok: false,
      code,
      message,
      status,
      details: typeof data?.details === 'string' ? data.details : undefined,
      endpoint: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      raw: error,
    }
  }

  return {
    ok: false,
    code: 'UNKNOWN',
    message: fallbackMessageFor('UNKNOWN'),
    raw: error,
  }
}

export const toApiError = (error: unknown): NormalizedApiError => {
  if (
    error &&
    typeof error === 'object' &&
    'ok' in error &&
    (error as NormalizedApiError).ok === false
  ) {
    return error as NormalizedApiError
  }
  return normalizeApiError(error)
}
