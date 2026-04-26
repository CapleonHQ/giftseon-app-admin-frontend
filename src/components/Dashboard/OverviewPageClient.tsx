'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users,
  ArrowLeftRight,
  Zap,
  ArrowDownToLine,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/utils'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import {
  getDashboardOverview,
  mapOverviewToStats,
  mapTrendToChartPoints,
  listTransactions,
  listWithdrawals,
} from '@/api/services/admin'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = 'primary',
  delay = 0,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
  trend?: number
  trendLabel?: string
  color?: 'primary' | 'success' | 'warning' | 'information' | 'error'
  delay?: number
}) => {
  const colorMap = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    information: 'bg-information-50 text-information-600',
    error: 'bg-error-50 text-error-600',
  }
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay }}>
      <Card>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between'>
            <div className='flex flex-col gap-1'>
              <span className='text-xs font-medium text-grey-500 uppercase tracking-wider'>{title}</span>
              <span className='text-2xl font-semibold text-grey-900'>{value}</span>
              {subtitle && <span className='text-xs text-grey-500'>{subtitle}</span>}
              {trend !== undefined && (
                <div className='flex items-center gap-1 mt-1'>
                  {trend >= 0
                    ? <TrendingUp className='w-3 h-3 text-success-500' />
                    : <TrendingDown className='w-3 h-3 text-error-500' />}
                  <span className={`text-xs font-medium ${trend >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {trend >= 0 ? '+' : ''}{trend}% {trendLabel}
                  </span>
                </div>
              )}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
              <Icon className='w-5 h-5' />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'success': case 'approved': case 'active': return 'success'
    case 'pending': case 'processing': return 'warning'
    case 'failed': case 'rejected': return 'error'
    default: return 'grey'
  }
}

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#87817f' } },
    y: { grid: { color: '#f3f2f2' }, ticks: { font: { size: 11 }, color: '#87817f' } },
  },
}

const OverviewPageClient = () => {
  const { data: overview, isLoading, isError } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    retry: 1,
  })

  const { data: txnResult } = useQuery({
    queryKey: ['transactions-recent'],
    queryFn: () => listTransactions({ limit: 5 }),
    retry: 1,
  })

  const { data: wdResult } = useQuery({
    queryKey: ['withdrawals-pending'],
    queryFn: () => listWithdrawals({ status: 'pending', limit: 5 }),
    retry: 1,
  })

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Skeleton className='h-52 rounded-xl' />
          <Skeleton className='h-52 rounded-xl' />
        </div>
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-20 text-grey-400'>
        <AlertCircle className='w-8 h-8' />
        <p className='text-sm'>Could not load dashboard. Make sure the admin service is running.</p>
      </div>
    )
  }

  const s = mapOverviewToStats(overview)
  const recentTxns = txnResult?.data ?? []
  const pendingWds = wdResult?.data ?? []

  const userChartPoints = mapTrendToChartPoints(overview.userGrowth)
  const txnChartPoints = mapTrendToChartPoints(overview.transactionTrend)

  const usersChartData = {
    labels: userChartPoints.map((d) => d.label),
    datasets: [{
      label: 'New Users',
      data: userChartPoints.map((d) => d.value),
      fill: true,
      borderColor: '#1a1abc',
      backgroundColor: 'rgba(26,26,188,0.08)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#1a1abc',
    }],
  }

  const txnChartData = {
    labels: txnChartPoints.map((d) => d.label),
    datasets: [{
      label: 'Transaction Volume (NGN)',
      data: txnChartPoints.map((d) => d.value),
      fill: true,
      borderColor: '#099137',
      backgroundColor: 'rgba(9,145,55,0.08)',
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#099137',
    }],
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Summary stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard title='Total Users' value={formatNumber(s.users.total)} subtitle={`${formatNumber(s.users.newThisMonth)} new this month`} icon={Users} color='primary' delay={0} />
        <StatCard title='Transaction Volume' value={`₦${(s.transactions.totalVolume / 1_000_000).toFixed(1)}M`} subtitle={`${s.transactions.total.toLocaleString()} total`} icon={ArrowLeftRight} color='success' delay={0.05} />
        <StatCard title='Bills Processed' value={formatNumber(s.bills.total)} icon={Zap} color='information' delay={0.1} />
        <StatCard title='Pending Withdrawals' value={formatNumber(s.withdrawals.pending)} icon={ArrowDownToLine} color='warning' delay={0.15} />
      </div>

      {/* Secondary stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard title='New Users (Month)' value={formatNumber(s.users.newThisMonth)} icon={Users} color='primary' delay={0.2} />
        <StatCard title='KYC Pending' value={formatNumber(s.kyc.pending)} icon={ShieldCheck} color='warning' delay={0.25} />
        <StatCard title='Total Transactions' value={formatNumber(s.transactions.total)} icon={ArrowLeftRight} color='information' delay={0.3} />
        <StatCard title='Total Bills' value={formatNumber(s.bills.total)} icon={Zap} color='success' delay={0.35} />
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>User Growth</CardTitle>
              <p className='text-xs text-grey-500'>Last 30 days</p>
            </CardHeader>
            <CardContent>
              {userChartPoints.length > 0
                ? <Line data={usersChartData} options={chartOptions} height={120} />
                : <p className='text-xs text-grey-400 text-center py-8'>No data yet</p>}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Transaction Volume</CardTitle>
              <p className='text-xs text-grey-500'>Last 30 days</p>
            </CardHeader>
            <CardContent>
              {txnChartPoints.length > 0
                ? <Line data={txnChartData} options={chartOptions} height={120} />
                : <p className='text-xs text-grey-400 text-center py-8'>No data yet</p>}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent transactions + withdrawals */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader><CardTitle className='text-sm'>Recent Transactions</CardTitle></CardHeader>
            <CardContent className='pt-0'>
              {recentTxns.length === 0
                ? <p className='text-xs text-grey-400 text-center py-6'>No transactions yet</p>
                : <div className='flex flex-col gap-2'>
                    {recentTxns.map((txn) => (
                      <div key={txn.id} className='flex items-center justify-between py-2 border-b border-grey-50 last:border-0'>
                        <div className='flex flex-col gap-0.5'>
                          <span className='text-xs font-medium text-grey-800 truncate max-w-[160px]'>{txn.description || txn.reference}</span>
                          <span className='text-[10px] text-grey-500'>{formatDateTime(txn.createdAt)}</span>
                        </div>
                        <div className='flex flex-col items-end gap-1'>
                          <span className={`text-xs font-semibold ${txn.type === 'credit' ? 'text-success-600' : 'text-grey-800'}`}>
                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </span>
                          <Badge variant={statusBadgeVariant(txn.status) as any} className='text-[10px] py-0 px-1.5'>{txn.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card>
            <CardHeader><CardTitle className='text-sm'>Pending Withdrawals</CardTitle></CardHeader>
            <CardContent className='pt-0'>
              {pendingWds.length === 0
                ? <div className='flex items-center gap-2 py-4 text-grey-400'>
                    <CheckCircle2 className='w-4 h-4' />
                    <span className='text-sm'>All withdrawals processed</span>
                  </div>
                : <div className='flex flex-col gap-2'>
                    {pendingWds.map((wd) => (
                      <div key={wd.id} className='flex items-center justify-between py-2 border-b border-grey-50 last:border-0'>
                        <div className='flex flex-col gap-0.5'>
                          <span className='text-xs font-medium text-grey-800'>{wd.userName ?? wd.accountName}</span>
                          <span className='text-[10px] text-grey-500'>{wd.bankName} · KYC L{wd.kycLevel}</span>
                        </div>
                        <div className='flex flex-col items-end gap-1'>
                          <span className='text-xs font-semibold text-grey-800'>{formatCurrency(wd.amount)}</span>
                          <Badge variant={statusBadgeVariant(wd.status) as any} className='text-[10px] py-0 px-1.5'>{wd.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* KYC pending banner */}
      {s.kyc.pending > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardContent className='p-4 flex items-center gap-3'>
              <div className='w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center'>
                <Clock className='w-4 h-4 text-warning-600' />
              </div>
              <p className='text-sm text-grey-700'>
                <span className='font-semibold text-warning-700'>{formatNumber(s.kyc.pending)}</span> KYC submission{s.kyc.pending !== 1 ? 's' : ''} pending review
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default OverviewPageClient
