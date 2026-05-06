'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  Unlock,
  AlertTriangle,
  StickyNote,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency, formatDateTime, getInitials } from '@/lib/utils'
import { toast } from 'sonner'
import { getUserWithWallet, lockUserWallet, unlockUserWallet } from '@/api/services/admin'

const KYC_WEEKLY_LIMITS: Record<number, number | null> = {
  0: 0,
  1: 50_000,
  2: 500_000,
  3: null,
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  iconBg: string
  delay?: number
}

const StatCard = ({ label, value, sub, icon, iconBg, delay = 0 }: StatCardProps) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
    <Card>
      <CardContent className='p-4 flex items-start gap-3'>
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <div className='min-w-0'>
          <p className='text-xs text-grey-500 truncate'>{label}</p>
          <p className='text-base font-semibold text-grey-900 truncate'>{value}</p>
          {sub && <p className='text-[10px] text-grey-400 mt-0.5'>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

const WalletPageClient = ({ userId }: { userId: string }) => {
  const qc = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-wallet', userId],
    queryFn: () => getUserWithWallet(userId),
    retry: 1,
  })

  const lockMutation = useMutation({
    mutationFn: () => lockUserWallet(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-wallet', userId] })
      toast.success('Wallet locked successfully.')
    },
    onError: () => toast.error('Failed to lock wallet.'),
  })

  const unlockMutation = useMutation({
    mutationFn: () => unlockUserWallet(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-wallet', userId] })
      toast.success('Wallet unlocked successfully.')
    },
    onError: () => toast.error('Failed to unlock wallet.'),
  })

  const isPending = lockMutation.isPending || unlockMutation.isPending

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center py-20 gap-3 text-center'>
        <AlertTriangle className='w-8 h-8 text-error-400' />
        <p className='text-sm text-grey-600'>Failed to load wallet data.</p>
        <Link href='/users'>
          <Button variant='outline' size='sm'><ArrowLeft className='w-3.5 h-3.5 mr-1.5' />Back to Users</Button>
        </Link>
      </div>
    )
  }

  const user = data?.user
  const wallet = data?.wallet
  const kycWeeklyLimit = user ? KYC_WEEKLY_LIMITS[user.kycLevel] : undefined
  const currency = wallet?.currency ?? 'NGN'

  return (
    <div className='flex flex-col gap-6'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-2'>
        <Link href='/users'>
          <Button variant='ghost' size='sm' className='h-7 px-2 text-grey-500 hover:text-grey-900'>
            <ArrowLeft className='w-3.5 h-3.5 mr-1' />
            Users
          </Button>
        </Link>
        <span className='text-grey-300'>/</span>
        {isLoading ? (
          <Skeleton className='h-4 w-32' />
        ) : (
          <span className='text-xs text-grey-500'>{user?.firstName} {user?.lastName}</span>
        )}
        <span className='text-grey-300'>/</span>
        <span className='text-xs text-grey-900 font-medium'>Wallet</span>
      </div>

      {/* User header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card>
          <CardContent className='p-5'>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
              <div className='flex items-center gap-3'>
                {isLoading ? (
                  <>
                    <Skeleton className='w-11 h-11 rounded-full' />
                    <div className='flex flex-col gap-1.5'>
                      <Skeleton className='h-4 w-36' />
                      <Skeleton className='h-3 w-48' />
                    </div>
                  </>
                ) : (
                  <>
                    <Avatar className='w-11 h-11'>
                      <AvatarFallback className='text-sm font-medium'>
                        {user ? getInitials(user.firstName, user.lastName) : '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className='text-sm font-semibold text-grey-900'>
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className='text-xs text-grey-500'>{user?.email}</p>
                      {user?.giftseonTag && (
                        <p className='text-[10px] text-primary-500'>@{user.giftseonTag}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Wallet status + actions */}
              <div className='flex items-center gap-2.5 flex-wrap'>
                {isLoading ? (
                  <Skeleton className='h-7 w-24 rounded-full' />
                ) : wallet ? (
                  <>
                    <Badge variant={wallet.isLocked ? 'error' : 'success'} className='gap-1'>
                      {wallet.isLocked ? (
                        <><Lock className='w-3 h-3' />Locked</>
                      ) : (
                        <><Unlock className='w-3 h-3' />Active</>
                      )}
                    </Badge>
                    {wallet.isLocked ? (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 text-xs gap-1.5 border-success-200 text-success-700 hover:bg-success-50'
                        onClick={() => unlockMutation.mutate()}
                        disabled={isPending}
                      >
                        {unlockMutation.isPending ? (
                          <RefreshCw className='w-3 h-3 animate-spin' />
                        ) : (
                          <Unlock className='w-3 h-3' />
                        )}
                        Unlock Wallet
                      </Button>
                    ) : (
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-7 text-xs gap-1.5 border-error-200 text-error-700 hover:bg-error-50'
                        onClick={() => lockMutation.mutate()}
                        disabled={isPending}
                      >
                        {lockMutation.isPending ? (
                          <RefreshCw className='w-3 h-3 animate-spin' />
                        ) : (
                          <Lock className='w-3 h-3' />
                        )}
                        Lock Wallet
                      </Button>
                    )}
                  </>
                ) : (
                  <Badge variant='grey'>No Wallet</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat cards */}
      {isLoading ? (
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className='p-4 flex items-start gap-3'>
                <Skeleton className='w-10 h-10 rounded-xl shrink-0' />
                <div className='flex flex-col gap-1.5 flex-1'>
                  <Skeleton className='h-3 w-24' />
                  <Skeleton className='h-5 w-32' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : wallet ? (
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
          <StatCard
            label='Total Balance'
            value={formatCurrency(wallet.balance, currency)}
            sub={currency}
            icon={<Wallet className='w-5 h-5 text-primary-600' />}
            iconBg='bg-primary-50'
            delay={0}
          />
          <StatCard
            label='Withdrawable Balance'
            value={formatCurrency(wallet.withdrawableBalance, currency)}
            sub='From received gifts'
            icon={<ArrowUpFromLine className='w-5 h-5 text-success-600' />}
            iconBg='bg-success-50'
            delay={0.04}
          />
          <StatCard
            label='Topup Balance'
            value={formatCurrency(wallet.topupBalance, currency)}
            sub='Spendable, not withdrawable'
            icon={<TrendingUp className='w-5 h-5 text-information-600' />}
            iconBg='bg-information-50'
            delay={0.08}
          />
          <StatCard
            label='Total Received'
            value={formatCurrency(wallet.totalReceived, currency)}
            sub='Lifetime credits'
            icon={<ArrowDownToLine className='w-5 h-5 text-success-600' />}
            iconBg='bg-success-50'
            delay={0.12}
          />
          <StatCard
            label='Total Withdrawn'
            value={formatCurrency(wallet.totalWithdrawn, currency)}
            sub='Lifetime debits'
            icon={<TrendingDown className='w-5 h-5 text-error-600' />}
            iconBg='bg-error-50'
            delay={0.16}
          />
          <StatCard
            label='Weekly Withdrawal Limit'
            value={
              kycWeeklyLimit === null
                ? 'Unlimited'
                : kycWeeklyLimit === 0
                  ? 'Not available'
                  : formatCurrency(kycWeeklyLimit!, currency)
            }
            sub={`KYC Level ${user?.kycLevel ?? 0}`}
            icon={<Lock className='w-5 h-5 text-warning-600' />}
            iconBg='bg-warning-50'
            delay={0.2}
          />
        </div>
      ) : (
        <Card>
          <CardContent className='py-12 text-center'>
            <Wallet className='w-8 h-8 text-grey-300 mx-auto mb-2' />
            <p className='text-sm text-grey-500'>This user has no wallet yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Wallet details panel */}
      {!isLoading && wallet && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>Wallet Details</CardTitle>
            </CardHeader>
            <CardContent className='pt-0'>
              <dl className='divide-y divide-grey-50'>
                {[
                  { label: 'Wallet ID', value: wallet.id },
                  { label: 'Currency', value: wallet.currency },
                  { label: 'Status', value: wallet.isLocked ? 'Locked' : 'Active', badge: wallet.isLocked ? 'error' : 'success' },
                  { label: 'Received Balance', value: formatCurrency(wallet.receivedBalance, currency) },
                  { label: 'Created', value: formatDateTime(wallet.createdAt) },
                  { label: 'Last Updated', value: formatDateTime(wallet.updatedAt) },
                ].map(({ label, value, badge }) => (
                  <div key={label} className='flex items-center justify-between py-2.5 gap-4'>
                    <dt className='text-xs text-grey-500 shrink-0'>{label}</dt>
                    {badge ? (
                      <Badge variant={badge as any} className='text-[10px]'>{value}</Badge>
                    ) : (
                      <dd className='text-xs text-grey-800 font-medium text-right break-all'>{value}</dd>
                    )}
                  </div>
                ))}
              </dl>

              {wallet.walletNote && (
                <div className='mt-4 p-3 bg-warning-50 rounded-lg flex gap-2'>
                  <StickyNote className='w-4 h-4 text-warning-600 shrink-0 mt-0.5' />
                  <div>
                    <p className='text-xs font-medium text-warning-700 mb-0.5'>Admin Note</p>
                    <p className='text-xs text-warning-600'>{wallet.walletNote}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default WalletPageClient
