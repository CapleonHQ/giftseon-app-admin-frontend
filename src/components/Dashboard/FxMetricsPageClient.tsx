'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Globe,
  DollarSign,
  Activity,
  Coins,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { getFxMetrics } from '@/api/services/admin'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const SOURCE_LABELS: Record<string, string> = {
  wallet_transfer: 'Wallet Transfer',
  gift_payment: 'Gift Payment',
  bill: 'Bill Payment',
  wallet: 'Wallet',
  general: 'General',
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  delay = 0,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ElementType
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

const barOptions = {
  responsive: true,
  plugins: {
    legend: { display: true, position: 'top' as const, labels: { font: { size: 11 }, color: '#87817f' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#87817f' } },
    y: { grid: { color: '#f3f2f2' }, ticks: { font: { size: 11 }, color: '#87817f' } },
  },
}

const FxMetricsPageClient = () => {
  const { data: fx, isLoading, isError } = useQuery({
    queryKey: ['fx-metrics'],
    queryFn: getFxMetrics,
    retry: 1,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className='flex flex-col gap-6'>
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Skeleton className='h-64 rounded-xl' />
          <Skeleton className='h-64 rounded-xl' />
        </div>
        <Skeleton className='h-64 rounded-xl' />
      </div>
    )
  }

  if (isError || !fx) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 py-20 text-grey-400'>
        <AlertCircle className='w-8 h-8' />
        <p className='text-sm'>Could not load FX metrics. Make sure the admin service is running.</p>
      </div>
    )
  }

  const trendLabels = fx.dailyFxTrend.map((d) =>
    new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )

  const trendChartData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Platform Profit',
        data: fx.dailyFxTrend.map((d) => d.profit),
        backgroundColor: 'rgba(9,145,55,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Conversion Volume',
        data: fx.dailyFxTrend.map((d) => d.volume),
        backgroundColor: 'rgba(26,26,188,0.15)',
        borderRadius: 4,
      },
    ],
  }

  const totalTxns = fx.summary.totalFxTransactions
  const profitPerTx = totalTxns > 0 ? fx.summary.totalPlatformProfit / totalTxns : 0
  const feeEfficiency = fx.summary.totalConversionVolume > 0
    ? ((fx.summary.totalPlatformProfit / fx.summary.totalConversionVolume) * 100).toFixed(2)
    : '0.00'

  return (
    <div className='flex flex-col gap-6'>
      {/* Summary stat cards */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          title='FX Transactions'
          value={formatNumber(fx.summary.totalFxTransactions)}
          subtitle='Cross-currency conversions'
          icon={Globe}
          color='information'
          delay={0}
        />
        <StatCard
          title='Platform Profit'
          value={formatCurrency(fx.summary.totalPlatformProfit)}
          subtitle={`${formatCurrency(profitPerTx)} avg per tx`}
          icon={DollarSign}
          color='success'
          delay={0.05}
        />
        <StatCard
          title='Conversion Volume'
          value={formatCurrency(fx.summary.totalConversionVolume)}
          subtitle={`${feeEfficiency}% profit rate`}
          icon={Activity}
          color='primary'
          delay={0.1}
        />
        <StatCard
          title='Fees Collected'
          value={formatCurrency(fx.summary.totalFeeCollected)}
          subtitle='In source currency'
          icon={Coins}
          color='warning'
          delay={0.15}
        />
      </div>

      {/* Currency pairs + source breakdown */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {/* Currency pairs */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className='h-full'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>Profit by Currency Pair</CardTitle>
              <p className='text-xs text-grey-500'>Sorted by platform profit, highest first</p>
            </CardHeader>
            <CardContent className='pt-0'>
              {fx.profitByCurrencyPair.length === 0 ? (
                <p className='text-xs text-grey-400 text-center py-8'>No FX transactions yet</p>
              ) : (
                <div className='flex flex-col gap-2'>
                  {fx.profitByCurrencyPair.map((pair, idx) => {
                    const maxProfit = fx.profitByCurrencyPair[0]?.platformProfit || 1
                    const pct = Math.round((pair.platformProfit / maxProfit) * 100)
                    return (
                      <div key={`${pair.fromCurrency}-${pair.toCurrency}-${idx}`} className='flex flex-col gap-1.5 py-2 border-b border-grey-50 last:border-0'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-1.5'>
                            <span className='text-xs font-semibold text-grey-800 bg-grey-100 px-2 py-0.5 rounded'>{pair.fromCurrency}</span>
                            <ArrowRight className='w-3 h-3 text-grey-400' />
                            <span className='text-xs font-semibold text-grey-800 bg-grey-100 px-2 py-0.5 rounded'>{pair.toCurrency}</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-grey-500'>{formatNumber(pair.transactionCount)} txns</span>
                            <span className='text-xs font-semibold text-success-700'>{formatCurrency(pair.platformProfit)}</span>
                          </div>
                        </div>
                        <div className='h-1 bg-grey-100 rounded-full overflow-hidden'>
                          <div className='h-full bg-success-400 rounded-full' style={{ width: `${pct}%` }} />
                        </div>
                        <span className='text-[10px] text-grey-400'>Vol: {formatCurrency(pair.volume)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Source breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className='h-full'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm'>FX Volume by Source</CardTitle>
              <p className='text-xs text-grey-500'>Which features drive conversion</p>
            </CardHeader>
            <CardContent className='pt-0'>
              {fx.volumeBySource.length === 0 ? (
                <p className='text-xs text-grey-400 text-center py-8'>No FX transactions yet</p>
              ) : (
                <div className='flex flex-col gap-3'>
                  {fx.volumeBySource.map((src) => {
                    const totalProfit = fx.summary.totalPlatformProfit || 1
                    const pct = Math.round((src.platformProfit / totalProfit) * 100)
                    return (
                      <div key={src.source} className='flex flex-col gap-1.5'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Badge variant='grey' className='text-[10px] capitalize'>
                              {SOURCE_LABELS[src.source] ?? src.source}
                            </Badge>
                            <span className='text-[10px] text-grey-500'>{formatNumber(src.transactionCount)} txns</span>
                          </div>
                          <div className='flex flex-col items-end'>
                            <span className='text-xs font-semibold text-success-700'>{formatCurrency(src.platformProfit)}</span>
                            <span className='text-[10px] text-grey-400'>vol: {formatCurrency(src.volume)}</span>
                          </div>
                        </div>
                        <div className='h-1.5 bg-grey-100 rounded-full overflow-hidden'>
                          <div className='h-full bg-primary-400 rounded-full' style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Daily trend chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm'>Daily FX Trend</CardTitle>
            <p className='text-xs text-grey-500'>Last 30 days — platform profit vs. conversion volume</p>
          </CardHeader>
          <CardContent>
            {fx.dailyFxTrend.length === 0 ? (
              <p className='text-xs text-grey-400 text-center py-12'>No FX data in the last 30 days</p>
            ) : (
              <Bar data={trendChartData} options={barOptions} height={90} />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default FxMetricsPageClient
