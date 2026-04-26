import apiService from '../index'
import type { ApiResponse } from '@/types/Common'
import type {
  AdminUser,
  AdminTransaction,
  AdminBill,
  AdminWithdrawal,
  AdminKycRequest,
  OverviewStats,
  ChartDataPoint,
} from '@/types/Admin'

// ── Pagination wrapper ────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  totalUsers: number
  newUsersThisMonth: number
  totalTransactions: number
  transactionVolume: number
  pendingWithdrawals: number
  pendingKyc: number
  totalBills: number
  userGrowth: { date: string; value: number }[]
  transactionTrend: { date: string; value: number }[]
}

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<DashboardOverview>>('/dashboard/overview')
  return resp.data.data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface ListUsersParams {
  search?: string
  status?: string
  kycLevel?: number
  page?: number
  limit?: number
}

export const listUsers = async (params: ListUsersParams = {}): Promise<PaginatedResult<AdminUser>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<AdminUser[]>>('/users', { params })
  return { data: resp.data.data ?? [], meta: (resp.data as any).meta }
}

export const updateUserStatus = async (userId: string, status: string): Promise<void> => {
  await apiService.adminPrivate.patch(`/users/${userId}/status`, { status })
}

// ── Transactions ──────────────────────────────────────────────────────────────

export interface ListTransactionsParams {
  search?: string
  status?: string
  type?: string
  source?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export const listTransactions = async (params: ListTransactionsParams = {}): Promise<PaginatedResult<AdminTransaction>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/transactions', { params })
  const raw: any[] = resp.data.data ?? []
  const data: AdminTransaction[] = raw.map((t) => ({
    id: t.id,
    reference: t.reference,
    amount: parseFloat(t.amount),
    currency: t.currency,
    type: t.type,
    status: t.status,
    source: t.source,
    description: t.description ?? '',
    userId: t.userId,
    userName: t.userId?.slice(0, 8) ?? '—',
    userEmail: '—',
    createdAt: t.createdAt,
  }))
  return { data, meta: (resp.data as any).meta }
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export interface ListBillsParams {
  search?: string
  billType?: string
  status?: string
  page?: number
  limit?: number
}

export const listBills = async (params: ListBillsParams = {}): Promise<PaginatedResult<AdminBill>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/bills', { params })
  const raw: any[] = resp.data.data ?? []
  const data: AdminBill[] = raw.map((b) => ({
    id: b.id,
    reference: b.reference,
    type: b.billType,
    amount: parseFloat(b.amount),
    status: mapBillStatus(b.status),
    recipient: b.recipient ?? b.recipientPhone ?? b.recipientName ?? '—',
    provider: b.provider ?? '—',
    userId: b.senderId,
    userName: b.senderId?.slice(0, 8) ?? '—',
    userEmail: '—',
    createdAt: b.createdAt,
  }))
  return { data, meta: (resp.data as any).meta }
}

export const getBillsBreakdown = async (): Promise<Record<string, { count: number; volume: number }>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any>>('/bills/breakdown')
  return resp.data.data
}

function mapBillStatus(s: string): 'pending' | 'success' | 'failed' {
  if (s === 'processed') return 'success'
  if (s === 'failed' || s === 'cancelled' || s === 'expired') return 'failed'
  return 'pending'
}

// ── Withdrawals ───────────────────────────────────────────────────────────────

export interface ListWithdrawalsParams {
  search?: string
  status?: string
  page?: number
  limit?: number
}

export const listWithdrawals = async (params: ListWithdrawalsParams = {}): Promise<PaginatedResult<AdminWithdrawal>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/withdrawals', { params })
  const raw: any[] = resp.data.data ?? []
  const data: AdminWithdrawal[] = raw.map((w) => ({
    id: w.id,
    reference: w.reference,
    amount: parseFloat(w.amount),
    currency: w.currency,
    status: mapWithdrawalStatus(w.status),
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    userId: w.userId,
    userName: w.accountName ?? w.userId?.slice(0, 8) ?? '—',
    userEmail: '—',
    kycLevel: w.kycLevelAtRequest ?? 0,
    createdAt: w.createdAt,
  }))
  return { data, meta: (resp.data as any).meta }
}

export const approveWithdrawal = async (id: string): Promise<void> => {
  await apiService.adminPrivate.post(`/withdrawals/${id}/approve`)
}

export const rejectWithdrawal = async (id: string, reason: string): Promise<void> => {
  await apiService.adminPrivate.post(`/withdrawals/${id}/reject`, { reason })
}

function mapWithdrawalStatus(s: string): AdminWithdrawal['status'] {
  if (s === 'completed') return 'approved'
  if (s === 'cancelled') return 'rejected'
  if (s === 'processing') return 'processing'
  return 'pending'
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export interface ListKycParams {
  search?: string
  overallStatus?: string
  kycLevel?: number
  page?: number
  limit?: number
}

export const listKyc = async (params: ListKycParams = {}): Promise<PaginatedResult<AdminKycRequest>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/kyc', { params })
  const raw: any[] = resp.data.data ?? []
  const data: AdminKycRequest[] = raw.map((k) => ({
    id: k.id,
    userId: k.userId,
    userName: k.user ? `${k.user.firstName} ${k.user.lastName}` : k.userId?.slice(0, 8) ?? '—',
    userEmail: k.user?.email ?? '—',
    documentType: deriveDocumentType(k),
    currentLevel: k.kycLevel ?? 0,
    targetLevel: (k.kycLevel ?? 0) + 1,
    status: k.overallStatus ?? 'not_started',
    documentUrl: k.ninNumber ? null : (k.utilityBillUrl ?? k.faceVerificationUrl ?? null),
    submittedAt: k.updatedAt ?? k.createdAt,
    reviewedAt: k.reviewedAt ?? null,
    reviewNote: deriveReviewNote(k),
  }))
  return { data, meta: (resp.data as any).meta }
}

export const approveKyc = async (id: string): Promise<void> => {
  await apiService.adminPrivate.post(`/kyc/${id}/approve`)
}

export const rejectKyc = async (id: string, reason: string): Promise<void> => {
  await apiService.adminPrivate.post(`/kyc/${id}/reject`, { reason })
}

function deriveDocumentType(k: any): AdminKycRequest['documentType'] {
  if (k.ninStatus === 'pending') return 'nin'
  if (k.bvnStatus === 'pending') return 'bvn'
  if (k.utilityBillStatus === 'pending') return 'utility_bill'
  if (k.faceVerificationStatus === 'pending') return 'face'
  if (k.ninNumber) return 'nin'
  if (k.bvnNumber) return 'bvn'
  if (k.utilityBillUrl) return 'utility_bill'
  return 'nin'
}

function deriveReviewNote(k: any): string | null {
  return (
    k.ninRejectionReason ??
    k.bvnRejectionReason ??
    k.utilityBillRejectionReason ??
    k.faceRejectionReason ??
    null
  )
}

// ── Dashboard helpers ─────────────────────────────────────────────────────────

export function mapOverviewToStats(d: DashboardOverview): OverviewStats {
  return {
    users: {
      total: d.totalUsers,
      active: d.totalUsers,
      newThisMonth: d.newUsersThisMonth,
      growth: 0,
    },
    transactions: {
      total: d.totalTransactions,
      totalVolume: d.transactionVolume,
      successRate: 0,
      avgValue: d.totalTransactions > 0 ? d.transactionVolume / d.totalTransactions : 0,
    },
    bills: { total: d.totalBills, totalVolume: 0, successRate: 0 },
    withdrawals: { pending: d.pendingWithdrawals, pendingVolume: 0, processedToday: 0 },
    kyc: { pending: d.pendingKyc, approvedToday: 0, level1: 0, level2: 0, level3: 0 },
  }
}

export function mapTrendToChartPoints(trend: { date: string; value: number }[]): ChartDataPoint[] {
  return trend.map((t) => ({
    label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: t.value,
  }))
}
