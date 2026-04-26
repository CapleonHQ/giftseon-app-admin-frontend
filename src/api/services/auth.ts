import apiService from '../index'
import type { ApiResponse } from '@/types/Common'
import type { AdminProfile } from '@/types/Admin'

interface LoginPayload {
  email: string
  password: string
}

interface LoginResponse {
  accessToken: string
  refreshToken: string
  admin: AdminProfile
}

export const loginAdmin = async (payload: LoginPayload): Promise<LoginResponse> => {
  const resp = await apiService.adminPublic.post<ApiResponse<LoginResponse>>('/auth/login', payload)
  return resp.data.data
}

export const getAdminProfile = async (): Promise<ApiResponse<AdminProfile>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<AdminProfile>>('/auth/profile')
  return resp.data
}

export const refreshAdminToken = async (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> => {
  const resp = await apiService.adminPublic.post('/auth/refresh', { refreshToken })
  return resp.data
}
