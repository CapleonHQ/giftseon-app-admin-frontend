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
  ApiBalance,
  SystemLog,
  TransactionSummary,
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
  totalInflow: number
  totalOutflow: number
  totalFees: number
  actionVolume: number
  pendingWithdrawals: number
  processingWithdrawals: number
  stallingWithdrawalsCount: number
  pendingAdminRefundCount: number
  pendingKyc: number
  totalBills: number
  kycLevel1Count: number
  kycLevel2Count: number
  kycLevel3Count: number
  userGrowth: { date: string; value: number }[]
  transactionTrend: { date: string; value: number }[]
}

export const getDashboardOverview = async (): Promise<DashboardOverview> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<DashboardOverview>>('/dashboard/overview')
  return resp.data.data
}

export const getApiBalances = async (): Promise<ApiBalance[]> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<ApiBalance[]>>('/dashboard/api-balances')
  return resp.data.data ?? []
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
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/users', { params })
  const raw: any[] = resp.data.data ?? []
  const data: AdminUser[] = raw.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    phoneNumber: u.phoneNumber ?? null,
    accountType: u.accountType,
    giftseonTag: u.giftseonTag ?? null,
    kycLevel: u.kycLevel ?? 0,
    status: u.status,
    provider: u.provider ?? 'local',
    profilePicture: u.profilePicture ?? null,
    pinActivated: !!u.pinActivated,
    walletBalance: parseFloat(u.walletBalance ?? '0'),
    walletCurrency: u.walletCurrency ?? 'NGN',
    loginCount: u.loggedIn ?? 0,
    lastLoginAt: u.lastLoginAt ?? null,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }))
  return { data, meta: (resp.data as any).meta }
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

export interface TransactionsResponse extends PaginatedResult<AdminTransaction> {
  summary: TransactionSummary
}

export const listTransactions = async (params: ListTransactionsParams = {}): Promise<TransactionsResponse> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/transactions', { params })
  const raw: any[] = resp.data.data ?? []
  const meta = (resp.data as any).meta ?? {}
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
    userName: t.userName ?? null,
    userEmail: t.userEmail ?? null,
    userTag: t.userTag ?? null,
    createdAt: t.createdAt,
  }))
  const summary: TransactionSummary = meta.summary ?? {
    totalInflow: 0,
    totalOutflow: 0,
    profitMargin: 0,
    sourceDistribution: {},
  }
  return { data, meta, summary }
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
    userName: b.senderName ?? null,
    userEmail: b.senderEmail ?? null,
    userTag: b.senderTag ?? null,
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

export interface WithdrawalsResponse extends PaginatedResult<AdminWithdrawal> {
  processingVolume: number
  stallingCount: number
}

export const listWithdrawals = async (params: ListWithdrawalsParams = {}): Promise<WithdrawalsResponse> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<any[]>>('/withdrawals', { params })
  const raw: any[] = resp.data.data ?? []
  const meta = (resp.data as any).meta ?? {}
  const data: AdminWithdrawal[] = raw.map((w) => ({
    id: w.id,
    reference: w.reference,
    amount: parseFloat(w.amount),
    fee: parseFloat(w.fee ?? '0'),
    currency: w.currency,
    status: w.status as AdminWithdrawal['status'],
    bankName: w.bankName,
    accountNumber: w.accountNumber,
    accountName: w.accountName,
    userId: w.userId,
    userName: w.userName ?? w.accountName ?? null,
    userEmail: w.userEmail ?? null,
    kycLevel: w.kycLevelAtRequest ?? 0,
    isStalling: !!w.isStalling,
    createdAt: w.createdAt,
    processedAt: w.processedAt ?? null,
  }))
  return {
    data,
    meta,
    processingVolume: meta.processingVolume ?? 0,
    stallingCount: meta.stallingCount ?? 0,
  }
}

export const approveWithdrawal = async (id: string): Promise<void> => {
  await apiService.adminPrivate.post(`/withdrawals/${id}/approve`)
}

export const rejectWithdrawal = async (id: string, reason: string): Promise<void> => {
  await apiService.adminPrivate.post(`/withdrawals/${id}/reject`, { reason })
}

export const refundWithdrawal = async (id: string): Promise<void> => {
  await apiService.adminPrivate.post(`/withdrawals/${id}/refund`)
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
    userName: k.user ? `${k.user.firstName} ${k.user.lastName}` : '—',
    userEmail: k.user?.email ?? '—',
    documentType: deriveDocumentType(k),
    currentLevel: k.kycLevel ?? 0,
    targetLevel: (k.kycLevel ?? 0) + 1,
    status: k.overallStatus ?? 'not_started',
    documentUrl: k.utilityBillUrl ?? k.faceVerificationUrl ?? null,
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

// ── Logs ──────────────────────────────────────────────────────────────────────

export interface ListLogsParams {
  action?: string
  entityType?: string
  adminId?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export const listLogs = async (params: ListLogsParams = {}): Promise<PaginatedResult<SystemLog>> => {
  const resp = await apiService.adminPrivate.get<ApiResponse<SystemLog[]>>('/logs', { params })
  return { data: resp.data.data ?? [], meta: (resp.data as any).meta }
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
      totalVolume: d.totalInflow + d.totalOutflow,
      totalInflow: d.totalInflow,
      totalOutflow: d.totalOutflow,
      totalFees: d.totalFees,
      actionVolume: d.actionVolume,
      successRate: 0,
      avgValue: d.totalTransactions > 0 ? (d.totalInflow + d.totalOutflow) / d.totalTransactions : 0,
    },
    bills: { total: d.totalBills, totalVolume: 0, successRate: 0 },
    withdrawals: {
      pending: d.pendingWithdrawals,
      processing: d.processingWithdrawals,
      stallingCount: d.stallingWithdrawalsCount,
      pendingAdminRefund: d.pendingAdminRefundCount,
      pendingVolume: 0,
      processedToday: 0,
    },
    kyc: {
      pending: d.pendingKyc,
      approvedToday: 0,
      level1: d.kycLevel1Count,
      level2: d.kycLevel2Count,
      level3: d.kycLevel3Count,
    },
  }
}

export function mapTrendToChartPoints(trend: { date: string; value: number }[]): ChartDataPoint[] {
  return trend.map((t) => ({
    label: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: t.value,
  }))
}
