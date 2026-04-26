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
  createdAt: string
  updatedAt: string
}

export type TransactionType = 'credit' | 'debit'
export type TransactionStatus = 'pending' | 'success' | 'failed' | 'cancelled'
export type TransactionSource = 'wallet' | 'bill' | 'general' | 'gift_payment'

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
  userName: string
  userEmail: string
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
  userName: string
  userEmail: string
  createdAt: string
}

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'processing'

export interface AdminWithdrawal {
  id: string
  reference: string
  amount: number
  currency: string
  status: WithdrawalStatus
  bankName: string
  accountNumber: string
  accountName: string
  userId: string
  userName: string
  userEmail: string
  kycLevel: number
  createdAt: string
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
  currency: string
  lastChecked: string
  status: 'healthy' | 'low' | 'critical'
  threshold: number
}

export interface RefundRequest {
  id: string
  reference: string
  originalReference: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  userId: string
  userName: string
  userEmail: string
  transactionType: string
  createdAt: string
  processedAt: string | null
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
    successRate: number
    avgValue: number
  }
  bills: {
    total: number
    totalVolume: number
    successRate: number
  }
  withdrawals: {
    pending: number
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
}

export interface ChartDataPoint {
  label: string
  value: number
}
