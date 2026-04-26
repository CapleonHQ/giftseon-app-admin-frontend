export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'BAD_REQUEST'
  | 'UNKNOWN'

export interface NormalizedApiError {
  ok: false
  code: ApiErrorCode
  message: string
  status?: number
  details?: string
  fieldErrors?: Record<string, string[]>
  requestId?: string
  endpoint?: string
  method?: string
  raw?: unknown
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  statusCode: number
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
