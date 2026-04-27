'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertTriangle, CheckCircle2, XOctagon, Wifi } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import type { ApiBalance } from '@/types/Admin'
import { getApiBalances } from '@/api/services/admin'
import { toast } from 'sonner'

const CURRENCY_COUNTRY: Record<string, string> = {
  NGN: 'Nigeria',
  GHS: 'Ghana',
  KES: 'Kenya',
  RWF: 'Rwanda',
  XOF: 'Senegal / Côte d\'Ivoire',
  UGX: 'Uganda',
  ZMW: 'Zambia',
  GBP: 'United Kingdom',
  USD: 'United States',
  EUR: 'Europe',
}

const currencyToCountry = (currency: string) =>
  CURRENCY_COUNTRY[currency] ?? currency

const statusConfig = {
  healthy: { label: 'Healthy', icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-50', badgeVariant: 'success' as const },
  low: { label: 'Low', icon: AlertTriangle, color: 'text-warning-600', bg: 'bg-warning-50', badgeVariant: 'warning' as const },
  critical: { label: 'Critical', icon: XOctagon, color: 'text-error-600', bg: 'bg-error-50', badgeVariant: 'error' as const },
  unknown: { label: 'Unknown', icon: AlertTriangle, color: 'text-grey-500', bg: 'bg-grey-50', badgeVariant: 'grey' as const },
}

const BalanceCard = ({ balance, delay }: { balance: ApiBalance; delay: number }) => {
  const config = statusConfig[balance.status]
  const Icon = config.icon
  const percentage = (balance.balance / (balance.threshold * 10)) * 100
  const country = currencyToCountry(balance.currency)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className={`border ${balance.status === 'critical' ? 'border-error-200' : balance.status === 'low' ? 'border-warning-200' : 'border-grey-100'}`}>
        <CardContent className='p-5'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <p className='text-xs font-medium text-grey-500 uppercase tracking-wider'>{balance.provider}</p>
              <p className='text-sm font-semibold text-grey-900 mt-0.5'>{balance.service}</p>
              <p className='text-[10px] text-grey-400 mt-0.5'>{country}</p>
            </div>
            <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-4.5 h-4.5 ${config.color}`} />
            </div>
          </div>

          <div className='mb-4'>
            <p className='text-2xl font-bold text-grey-900'>
              {balance.currency === 'NGN'
                ? formatCurrency(balance.balance)
                : `${balance.balance.toLocaleString()} ${balance.currency}`}
            </p>
            <p className='text-xs text-grey-500 mt-1'>
              Threshold:{' '}
              {balance.currency === 'NGN'
                ? formatCurrency(balance.threshold)
                : `${balance.threshold.toLocaleString()} ${balance.currency}`}
            </p>
          </div>

          <div className='mb-4'>
            <div className='h-1.5 bg-grey-100 rounded-full overflow-hidden'>
              <div
                className={`h-full rounded-full transition-all ${
                  balance.status === 'healthy' ? 'bg-success-400'
                  : balance.status === 'low' ? 'bg-warning-400'
                  : 'bg-error-400'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <Badge variant={config.badgeVariant} className='text-[10px]'>{config.label}</Badge>
            <p className='text-[10px] text-grey-400'>Checked {formatDateTime(balance.lastChecked)}</p>
          </div>

          {balance.error && (
            <p className='text-[10px] text-error-500 mt-2 truncate' title={balance.error}>
              {balance.error}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

const BalanceCardSkeleton = () => (
  <Card>
    <CardContent className='p-5 flex flex-col gap-3'>
      <Skeleton className='h-4 w-24' />
      <Skeleton className='h-4 w-36' />
      <Skeleton className='h-7 w-32' />
      <Skeleton className='h-1.5 w-full' />
    </CardContent>
  </Card>
)

const ApiBalancesPageClient = () => {
  const queryClient = useQueryClient()
  const [providerFilter, setProviderFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')

  const { data: balances = [], isLoading, isFetching } = useQuery({
    queryKey: ['api-balances'],
    queryFn: getApiBalances,
    refetchInterval: 30_000,
  })

  const providers = useMemo(
    () => ['all', ...Array.from(new Set(balances.map((b) => b.provider)))],
    [balances],
  )

  const countries = useMemo(
    () => ['all', ...Array.from(new Set(balances.map((b) => currencyToCountry(b.currency))))],
    [balances],
  )

  const filtered = useMemo(
    () =>
      balances.filter((b) => {
        if (providerFilter !== 'all' && b.provider !== providerFilter) return false
        if (countryFilter !== 'all' && currencyToCountry(b.currency) !== countryFilter) return false
        return true
      }),
    [balances, providerFilter, countryFilter],
  )

  const criticalCount = filtered.filter((b) => b.status === 'critical').length
  const lowCount = filtered.filter((b) => b.status === 'low').length
  const healthyCount = filtered.filter((b) => b.status === 'healthy').length

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['api-balances'] })
    toast.success('Balances refreshed.')
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className='p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <div className='w-2.5 h-2.5 bg-success-400 rounded-full' />
                <span className='text-sm font-medium text-grey-700'>{healthyCount} Healthy</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2.5 h-2.5 bg-warning-400 rounded-full' />
                <span className='text-sm font-medium text-grey-700'>{lowCount} Low</span>
              </div>
              <div className='flex items-center gap-2'>
                <div className='w-2.5 h-2.5 bg-error-400 rounded-full' />
                <span className='text-sm font-medium text-grey-700'>{criticalCount} Critical</span>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className='h-8 text-xs w-36'>
                  <SelectValue placeholder='All Providers' />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p} value={p}>{p === 'all' ? 'All Providers' : p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className='h-8 text-xs w-40'>
                  <SelectValue placeholder='All Countries' />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c} value={c}>{c === 'all' ? 'All Countries' : c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant='outline' size='sm' onClick={handleRefresh} disabled={isFetching} className='gap-2'>
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Critical/low alerts */}
      {!isLoading && (criticalCount > 0 || lowCount > 0) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className='bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-start gap-3'>
            <AlertTriangle className='w-4 h-4 text-warning-600 shrink-0 mt-0.5' />
            <div>
              <p className='text-sm font-medium text-warning-800'>
                {criticalCount > 0 && `${criticalCount} service${criticalCount > 1 ? 's are' : ' is'} critically low`}
                {criticalCount > 0 && lowCount > 0 && ' · '}
                {lowCount > 0 && `${lowCount} service${lowCount > 1 ? 's have' : ' has'} low balance`}
              </p>
              <p className='text-xs text-warning-700 mt-0.5'>Top up affected services to avoid disruption to users.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Balance cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <BalanceCardSkeleton key={i} />)
          : filtered.length === 0
            ? (
                <div className='col-span-full text-center text-sm text-grey-400 py-12'>
                  No providers match the selected filters.
                </div>
              )
            : filtered.map((balance, i) => (
                <BalanceCard
                  key={`${balance.provider}-${balance.service}-${balance.currency}`}
                  balance={balance}
                  delay={0.15 + i * 0.05}
                />
              ))}
      </div>

      {/* Topup section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className='text-sm'>Peyflex Balance Management</CardTitle>
            <p className='text-xs text-grey-500'>Manage third-party API credits and funding</p>
          </CardHeader>
          <CardContent className='pt-0'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              {['Airtime & Data', 'Electricity', 'Cable TV'].map((service) => (
                <div key={service} className='flex items-center justify-between p-3 bg-grey-50 rounded-lg border border-grey-100'>
                  <div className='flex items-center gap-2'>
                    <Wifi className='w-4 h-4 text-grey-500' />
                    <span className='text-sm text-grey-700'>{service}</span>
                  </div>
                  <Button
                    size='sm'
                    variant='secondary'
                    className='h-7 px-3 text-xs'
                    onClick={() => toast.info(`Top up ${service} — contact your Peyflex account manager.`)}
                  >
                    Top Up
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default ApiBalancesPageClient
