export interface AdminProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'super_admin' | 'admin' | 'support'
  createdAt: string
}

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string | null
  accountType: 'user' | 'merchant'
  giftseonTag: string | null
  kycLevel: 0 | 1 | 2 | 3
  status: 'pending' | 'active' | 'suspended'
  provider: 'local' | 'google' | 'apple'
  profilePicture: string | null
  pinActivated: boolean
  walletBalance: number
  walletCurrency: string
  loginCount: number
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export type TransactionType = 'credit' | 'debit'
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'reversed'
export type TransactionSource = 'wallet' | 'bill' | 'general' | 'gift_payment' | 'wallet_transfer'

export interface AdminTransaction {
  id: string
  reference: string
  amount: number
  currency: string
  type: TransactionType
  status: TransactionStatus
  source: TransactionSource
  description: string
  userId: string
  userName: string | null
  userEmail: string | null
  userTag: string | null
  createdAt: string
}

export type BillType = 'airtime' | 'data' | 'cable_tv' | 'electricity'
export type BillStatus = 'pending' | 'success' | 'failed'

export interface AdminBill {
  id: string
  reference: string
  type: BillType
  amount: number
  status: BillStatus
  recipient: string
  provider: string
  userId: string
  userName: string | null
  userEmail: string | null
  userTag: string | null
  createdAt: string
}

export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'

export interface AdminWithdrawal {
  id: string
  reference: string
  amount: number
  fee: number
  currency: string
  status: WithdrawalStatus
  bankName: string
  accountNumber: string
  accountName: string
  userId: string
  userName: string | null
  userEmail: string | null
  kycLevel: number
  isStalling: boolean
  createdAt: string
  processedAt: string | null
}

export type KycDocumentType = 'nin' | 'bvn' | 'utility_bill' | 'face'
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected'

export interface AdminKycRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  documentType: KycDocumentType
  currentLevel: number
  targetLevel: number
  status: KycStatus
  documentUrl: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewNote: string | null
}

export interface ApiBalance {
  provider: string
  service: string
  balance: number
  ledgerBalance?: number
  currency: string
  lastChecked: string
  status: 'healthy' | 'low' | 'critical' | 'unknown'
  threshold: number
  error?: string
}

export interface SystemLog {
  id: string
  adminId: string
  adminEmail: string
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, any> | null
  ipAddress: string | null
  createdAt: string
}

export interface TransactionSummary {
  totalInflow: number
  totalOutflow: number
  profitMargin: number
  sourceDistribution: Record<string, { count: number; volume: number }>
}

export interface OverviewStats {
  users: {
    total: number
    active: number
    newThisMonth: number
    growth: number
  }
  transactions: {
    total: number
    totalVolume: number
    totalInflow: number
    totalOutflow: number
    totalFees: number
    actionVolume: number
    successRate: number
    avgValue: number
  }
  bills: { total: number; totalVolume: number; successRate: number }
  withdrawals: {
    pending: number
    processing: number
    stallingCount: number
    pendingAdminRefund: number
    pendingVolume: number
    processedToday: number
  }
  kyc: {
    pending: number
    approvedToday: number
    level1: number
    level2: number
    level3: number
  }
  fx: {
    transactionCount: number
    platformProfit: number
    conversionVolume: number
  }
}

export interface RefundRequest {
  id: string
  reference: string
  originalReference: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'processed' | 'rejected'
  userId: string
  userName: string
  userEmail: string
  transactionType: 'bill' | 'gift_payment' | 'wallet'
  createdAt: string
  processedAt: string | null
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface FxCurrencyPair {
  fromCurrency: string
  toCurrency: string
  platformProfit: number
  volume: number
  transactionCount: number
}

export interface FxSourceBreakdown {
  source: string
  platformProfit: number
  volume: number
  transactionCount: number
}

export interface FxDailyTrend {
  date: string
  profit: number
  volume: number
  transactionCount: number
}

export interface FxMetrics {
  summary: {
    totalFxTransactions: number
    totalPlatformProfit: number
    totalConversionVolume: number
    totalFeeCollected: number
  }
  profitByCurrencyPair: FxCurrencyPair[]
  volumeBySource: FxSourceBreakdown[]
  dailyFxTrend: FxDailyTrend[]
}

export interface AdminRecommendation {
  id: string
  title: string
  description: string
  occasionTags: string[]
  recipientTags: string[]
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  currency: string
  imageUrl: string | null
  externalLink: string | null
  isCashGift: boolean
  isActive: boolean
  priority: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AdminOccasion {
  id: string
  slug: string
  label: string
  description: string | null
  iconName: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminWallet {
  id: string
  userId: string
  balance: number
  topupBalance: number
  receivedBalance: number
  withdrawableBalance: number
  totalReceived: number
  totalWithdrawn: number
  currency: string
  isLocked: boolean
  walletNote: string | null
  createdAt: string
  updatedAt: string
}
