'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { AdminTransaction } from '@/types/Admin'
import { listTransactions } from '@/api/services/admin'

const statusIcon = (status: AdminTransaction['status']) => {
  if (status === 'success') return <CheckCircle2 className='w-3.5 h-3.5 text-success-500' />
  if (status === 'pending') return <Clock className='w-3.5 h-3.5 text-warning-500' />
  return <XCircle className='w-3.5 h-3.5 text-error-500' />
}

const statusBadgeVariant = (status: AdminTransaction['status']) => {
  if (status === 'success') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'failed') return 'error'
  return 'grey'
}

const sourceLabel: Record<AdminTransaction['source'], string> = {
  wallet: 'Wallet',
  bill: 'Bill',
  general: 'General',
  gift_payment: 'Gift Payment',
}

const LIMIT = 20

const TransactionsPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const params = {
    search: debouncedSearch || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', params],
    queryFn: () => listTransactions(params),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const transactions: AdminTransaction[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__txSearchTimer)
    ;(window as any).__txSearchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-2 gap-4'>
        {[
          { label: 'Total Transactions', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'This Page', value: formatNumber(transactions.length), color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className='p-4'><p className='text-xs text-grey-500 mb-1'>{s.label}</p><p className={`text-lg font-semibold ${s.color}`}>{s.value}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <CardTitle className='text-sm'>All Transactions</CardTitle>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                  <Input placeholder='Search transactions...' value={search} onChange={(e) => handleSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-48' />
                </div>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Type' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Types</SelectItem>
                    <SelectItem value='credit'>Credit</SelectItem>
                    <SelectItem value='debit'>Debit</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Status' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='success'>Success</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='failed'>Failed</SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>)}</TableRow>
                    ))
                  : transactions.length === 0
                    ? <TableRow><TableCell colSpan={7} className='text-center text-sm text-grey-400 py-12'>No transactions found.</TableCell></TableRow>
                    : transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell><span className='text-xs font-mono text-grey-700'>{txn.reference}</span></TableCell>
                          <TableCell>
                            <div>
                              <p className='text-xs font-medium text-grey-800'>{txn.userName}</p>
                              <p className='text-[10px] text-grey-500'>{txn.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              {txn.type === 'credit' ? <ArrowDownLeft className='w-3.5 h-3.5 text-success-500' /> : <ArrowUpRight className='w-3.5 h-3.5 text-error-500' />}
                              <span className={`text-xs font-medium capitalize ${txn.type === 'credit' ? 'text-success-600' : 'text-error-600'}`}>{txn.type}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant='grey' className='text-[10px]'>{sourceLabel[txn.source] ?? txn.source}</Badge></TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold ${txn.type === 'credit' ? 'text-success-600' : 'text-grey-800'}`}>
                              {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className='flex items-center gap-1'>
                              {statusIcon(txn.status)}
                              <Badge variant={statusBadgeVariant(txn.status) as any} className='text-[10px] capitalize'>{txn.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell><span className='text-[10px] text-grey-500'>{formatDateTime(txn.createdAt)}</span></TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {transactions.length} of {formatNumber(total)} records</span>
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

export default TransactionsPageClient
