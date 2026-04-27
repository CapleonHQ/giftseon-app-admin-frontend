'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, XCircle, Clock, ShieldCheck, Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatNumber } from '@/lib/utils'
import type { AdminKycRequest, KycStatus, KycDocumentType } from '@/types/Admin'
import { toast } from 'sonner'
import { listKyc, approveKyc, rejectKyc, getDashboardOverview } from '@/api/services/admin'

const docTypeLabel: Record<KycDocumentType, string> = {
  nin: 'NIN',
  bvn: 'BVN',
  utility_bill: 'Utility Bill',
  face: 'Face Verification',
}

const statusBadgeVariant = (status: KycStatus): 'success' | 'warning' | 'error' | 'grey' => {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'error'
  return 'grey'
}

const levelColors: Record<number, string> = {
  0: 'text-grey-500',
  1: 'text-information-600',
  2: 'text-warning-600',
  3: 'text-success-600',
}

const KycPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const params = {
    search: debouncedSearch || undefined,
    overallStatus: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 20,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['kyc', params],
    queryFn: () => listKyc(params),
    retry: 1,
  })

  const { data: overview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getDashboardOverview,
    retry: 1,
    staleTime: 60_000,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveKyc(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.success('KYC approved successfully.')
    },
    onError: () => toast.error('Failed to approve KYC.'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectKyc(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kyc'] })
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] })
      toast.error('KYC rejected.')
    },
    onError: () => toast.error('Failed to reject KYC.'),
  })

  const kycList: AdminKycRequest[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const pendingCount = kycList.filter((k) => k.status === 'pending').length

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__kycSearchTimer)
    ;(window as any).__kycSearchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats — sourced from the cached overview query */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'Pending Review', value: formatNumber(overview?.pendingKyc ?? pendingCount), color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Level 1 Users', value: formatNumber(overview?.kycLevel1Count ?? 0), color: 'text-information-600', bg: 'bg-information-50' },
          { label: 'Level 2 Users', value: formatNumber(overview?.kycLevel2Count ?? 0), color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Level 3 Users', value: formatNumber(overview?.kycLevel3Count ?? 0), color: 'text-success-600', bg: 'bg-success-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <ShieldCheck className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className='text-xs text-grey-500'>{s.label}</p>
                  <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* KYC limits info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs font-semibold text-grey-700 mb-3 uppercase tracking-wider'>Withdrawal Limits by KYC Level</p>
            <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
              {[
                { level: 0, label: 'No KYC', limit: '₦0', doc: 'No documents', color: 'bg-grey-50 border-grey-100' },
                { level: 1, label: 'Level 1', limit: '₦50,000', doc: 'NIN required', color: 'bg-information-50 border-information-100' },
                { level: 2, label: 'Level 2', limit: '₦500,000', doc: 'BVN required', color: 'bg-warning-50 border-warning-100' },
                { level: 3, label: 'Level 3', limit: 'Unlimited', doc: 'Utility Bill + Face', color: 'bg-success-50 border-success-100' },
              ].map((item) => (
                <div key={item.level} className={`${item.color} border rounded-lg p-3`}>
                  <p className={`text-sm font-semibold ${levelColors[item.level]}`}>{item.label}</p>
                  <p className='text-base font-bold text-grey-900 mt-0.5'>{item.limit}</p>
                  <p className='text-[10px] text-grey-500 mt-1'>{item.doc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <div>
                <CardTitle className='text-sm'>KYC Submissions</CardTitle>
                {pendingCount > 0 && (
                  <p className='text-xs text-warning-600 mt-0.5 flex items-center gap-1'>
                    <Clock className='w-3 h-3' />
                    {pendingCount} pending review (this page)
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
                    className='pl-8 h-8 text-xs w-44'
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-32'>
                    <SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
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
                  <TableHead>User</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Level Upgrade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Review Note</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : kycList.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={7} className='text-center text-sm text-grey-400 py-8'>
                            No KYC submissions match your filters.
                          </TableCell>
                        </TableRow>
                      )
                    : kycList.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div>
                              <p className='text-xs font-medium text-grey-800'>{req.userName}</p>
                              <p className='text-[10px] text-grey-500'>{req.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant='information' className='text-[10px]'>{docTypeLabel[req.documentType]}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1 text-xs'>
                              <span className={`font-medium ${levelColors[req.currentLevel]}`}>L{req.currentLevel}</span>
                              <span className='text-grey-400'>→</span>
                              <span className={`font-semibold ${levelColors[Math.min(req.targetLevel, 3)]}`}>L{Math.min(req.targetLevel, 3)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadgeVariant(req.status)} className='text-[10px] capitalize'>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] text-grey-500'>{formatDateTime(req.submittedAt)}</span>
                          </TableCell>
                          <TableCell>
                            {req.reviewNote ? (
                              <span className='text-[10px] text-grey-500 italic'>{req.reviewNote}</span>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              {req.documentUrl && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='h-6 w-6 p-0'
                                  title='View document'
                                  onClick={() => window.open(req.documentUrl!, '_blank')}
                                >
                                  <Eye className='w-3 h-3' />
                                </Button>
                              )}
                              {req.status === 'pending' && (
                                <>
                                  <Button
                                    size='sm'
                                    variant='success'
                                    className='h-6 px-2 text-[10px]'
                                    disabled={approveMutation.isPending}
                                    onClick={() => approveMutation.mutate(req.id)}
                                  >
                                    <CheckCircle2 className='w-3 h-3 mr-0.5' />
                                    Approve
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='destructive'
                                    className='h-6 px-2 text-[10px]'
                                    disabled={rejectMutation.isPending}
                                    onClick={() => rejectMutation.mutate({ id: req.id, reason: 'Rejected by admin' })}
                                  >
                                    <XCircle className='w-3 h-3 mr-0.5' />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {kycList.length} of {formatNumber(total)} submissions</span>
              <div className='flex items-center gap-2'>
                <Button variant='outline' size='sm' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className='w-3.5 h-3.5' /></Button>
                <span className='text-xs text-grey-500'>{page} / {totalPages}</span>
                <Button variant='outline' size='sm' disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className='w-3.5 h-3.5' /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default KycPageClient
