'use client'

import { useMemo, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import AdminShell from '@/components/Layout/AdminShell'
import AuthGuard from '@/components/Auth/AuthGuard'

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Overview',
  '/users': 'Users',
  '/transactions': 'Transactions',
  '/bills': 'Bills',
  '/withdrawals': 'Withdrawal Requests',
  '/kyc': 'KYC Verification',
  '/api-balances': 'API Balances',
  '/refunds': 'Refunds',
  '/logs': 'Audit Logs',
}

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  const pageTitle = useMemo(() => {
    for (const [path, title] of Object.entries(PAGE_TITLES)) {
      if (pathname === path || pathname.startsWith(path + '/')) return title
    }
    return 'Admin'
  }, [pathname])

  return (
    <AuthGuard>
      <AdminShell pageTitle={pageTitle}>
        {children}
      </AdminShell>
    </AuthGuard>
  )
}

export default DashboardLayout
