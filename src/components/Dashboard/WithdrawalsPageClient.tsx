'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, XCircle, Clock, ArrowDownToLine, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { AdminWithdrawal } from '@/types/Admin'
import { toast } from 'sonner'
import { listWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/api/services/admin'

const kycLimitLabel = (level: number) => {
  if (level === 0) return '₦0'
  if (level === 1) return '₦50,000'
  if (level === 2) return '₦500,000'
  return 'Unlimited'
}

const statusBadgeVariant = (status: AdminWithdrawal['status']): 'success' | 'warning' | 'error' | 'information' | 'grey' => {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'processing') return 'information'
  if (status === 'rejected') return 'error'
  return 'grey'
}

const LIMIT = 20

const WithdrawalsPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const params = {
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['withdrawals', params],
    queryFn: () => listWithdrawals(params),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveWithdrawal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] })
      toast.success('Withdrawal approved.')
    },
    onError: () => toast.error('Failed to approve withdrawal.'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id }: { id: string; reason: string }) => rejectWithdrawal(id, 'Rejected by admin'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['withdrawals'] })
      toast.error('Withdrawal rejected.')
    },
    onError: () => toast.error('Failed to reject withdrawal.'),
  })

  const withdrawals: AdminWithdrawal[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const pendingCount = withdrawals.filter((w) => w.status === 'pending').length
  const pendingVol = withdrawals.filter((w) => w.status === 'pending').reduce((a, w) => a + w.amount, 0)

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__wdSearchTimer)
    ;(window as any).__wdSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
        {[
          { label: 'Pending Requests', value: formatNumber(pendingCount), color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Pending Volume', value: formatCurrency(pendingVol), color: 'text-warning-700', bg: 'bg-warning-50' },
          { label: 'Total Requests', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <ArrowDownToLine className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className='text-xs text-grey-500'>{s.label}</p>
                  <p className={`text-base font-semibold ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <div>
                <CardTitle className='text-sm'>Withdrawal Requests</CardTitle>
                {pendingCount > 0 && (
                  <p className='text-xs text-warning-600 mt-0.5 flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {pendingCount} request{pendingCount > 1 ? 's' : ''} awaiting approval
                  </p>
                )}
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                  <Input
                    placeholder='Search...'
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className='pl-8 h-8 text-xs w-48'
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-32'>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='processing'>Processing</SelectItem>
                    <SelectItem value='approved'>Approved</SelectItem>
                    <SelectItem value='rejected'>Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-0 px-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>KYC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : withdrawals.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={8} className='text-center text-sm text-grey-400 py-8'>
                            No withdrawal requests match your filters.
                          </TableCell>
                        </TableRow>
                      )
                    : withdrawals.map((wd) => (
                        <TableRow key={wd.id}>
                          <TableCell>
                            <span className='text-xs font-mono text-grey-700'>{wd.reference}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className='text-xs font-medium text-grey-800'>{wd.userName ?? wd.accountName}</p>
                              <p className='text-[10px] text-grey-500'>{wd.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className='text-xs text-grey-700'>{wd.bankName}</p>
                              <p className='text-[10px] text-grey-500'>{wd.accountNumber}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className='text-xs font-semibold text-grey-900'>{formatCurrency(wd.amount)}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Badge variant={wd.kycLevel >= 2 ? 'success' : wd.kycLevel === 1 ? 'information' : 'grey'} className='text-[10px]'>
                                L{wd.kycLevel}
                              </Badge>
                              <p className='text-[10px] text-grey-400 mt-0.5'>{kycLimitLabel(wd.kycLevel)} limit</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(wd.status)} className='text-[10px] capitalize'>
                              {wd.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] text-grey-500'>{formatDateTime(wd.createdAt)}</span>
                          </TableCell>
                          <TableCell>
                            {wd.status === 'pending' && (
                              <div className='flex items-center gap-1'>
                                <Button
                                  size='sm'
                                  variant='success'
                                  className='h-6 px-2 text-[10px]'
                                  disabled={approveMutation.isPending}
                                  onClick={() => approveMutation.mutate(wd.id)}
                                >
                                  <CheckCircle2 className='w-3 h-3 mr-0.5' />
                                  Approve
                                </Button>
                                <Button
                                  size='sm'
                                  variant='destructive'
                                  className='h-6 px-2 text-[10px]'
                                  disabled={rejectMutation.isPending}
                                  onClick={() => rejectMutation.mutate({ id: wd.id, reason: 'Rejected by admin' })}
                                >
                                  <XCircle className='w-3 h-3 mr-0.5' />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {withdrawals.length} of {formatNumber(total)} records</span>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className='w-3.5 h-3.5' />
                </Button>
                <span className='text-xs text-grey-500'>{page} / {totalPages}</span>
                <Button variant='outline' size='sm' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className='w-3.5 h-3.5' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default WithdrawalsPageClient
