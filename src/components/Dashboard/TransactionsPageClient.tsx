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
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const SOURCE_COLORS: Record<string, string> = {
  wallet: '#1a1abc',
  bill: '#dd900d',
  gift_payment: '#099137',
  general: '#1671d9',
}

const SOURCE_LABELS: Record<string, string> = {
  wallet: 'Wallet',
  bill: 'Bill',
  gift_payment: 'Gift Payment',
  general: 'General',
}

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

const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s

const LIMIT = 20

const TransactionsPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const params = {
    search: debouncedSearch || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
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
  const summary = data?.summary ?? { totalInflow: 0, totalOutflow: 0, profitMargin: 0, sourceDistribution: {} }

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__txSearchTimer)
    ;(window as any).__txSearchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  const sources = Object.keys(summary.sourceDistribution)
  const doughnutData = {
    labels: sources.map((s) => SOURCE_LABELS[s] ?? s),
    datasets: [{
      data: sources.map((s) => summary.sourceDistribution[s].count),
      backgroundColor: sources.map((s) => SOURCE_COLORS[s] ?? '#87817f'),
      borderWidth: 0,
    }],
  }
  const totalSrcCount = sources.reduce((a, s) => a + summary.sourceDistribution[s].count, 0)

  return (
    <div className='flex flex-col gap-6'>
      {/* Summary stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'Total Transactions', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Total Inflow', value: formatCurrency(summary.totalInflow), color: 'text-success-600', bg: 'bg-success-50' },
          { label: 'Total Outflow', value: formatCurrency(summary.totalOutflow), color: 'text-error-600', bg: 'bg-error-50' },
          { label: 'Profit Margin', value: `${summary.profitMargin.toFixed(2)}%`, color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className='p-4'><p className='text-xs text-grey-500 mb-1'>{s.label}</p><p className={`text-lg font-semibold ${s.color}`}>{s.value}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Source distribution chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle className='text-sm'>Source Distribution</CardTitle>
              <p className='text-xs text-grey-500'>By transaction count</p>
            </CardHeader>
            <CardContent className='flex flex-col items-center gap-4'>
              {totalSrcCount > 0 ? (
                <>
                  <div className='w-36 h-36'>
                    <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} />
                  </div>
                  <div className='w-full flex flex-col gap-1.5'>
                    {sources.map((s) => {
                      const pct = totalSrcCount > 0 ? Math.round((summary.sourceDistribution[s].count / totalSrcCount) * 100) : 0
                      return (
                        <div key={s} className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: SOURCE_COLORS[s] ?? '#87817f' }} />
                            <span className='text-xs text-grey-600'>{SOURCE_LABELS[s] ?? s}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] text-grey-400'>{formatCurrency(summary.sourceDistribution[s].volume)}</span>
                            <span className='text-xs font-medium text-grey-800'>{pct}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <p className='text-xs text-grey-400 py-8'>No data yet</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className='lg:col-span-2'>
          <Card>
            <CardHeader>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
                <CardTitle className='text-sm'>All Transactions</CardTitle>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                    <Input placeholder='Search...' value={search} onChange={(e) => handleSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-40' />
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-24'><SelectValue placeholder='Type' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Types</SelectItem>
                      <SelectItem value='credit'>Credit</SelectItem>
                      <SelectItem value='debit'>Debit</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Source' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Sources</SelectItem>
                      <SelectItem value='wallet'>Wallet</SelectItem>
                      <SelectItem value='bill'>Bill</SelectItem>
                      <SelectItem value='gift_payment'>Gift Payment</SelectItem>
                      <SelectItem value='general'>General</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-24'><SelectValue placeholder='Status' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All</SelectItem>
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
                                <p className='text-xs font-medium text-grey-800'>{txn.userName ?? '—'}</p>
                                {txn.userEmail && <p className='text-[10px] text-grey-500'>{txn.userEmail}</p>}
                                {txn.userTag && <p className='text-[10px] text-primary-500'>@{txn.userTag}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1'>
                                {txn.type === 'credit' ? <ArrowDownLeft className='w-3.5 h-3.5 text-success-500' /> : <ArrowUpRight className='w-3.5 h-3.5 text-error-500' />}
                                <span className={`text-xs font-medium capitalize ${txn.type === 'credit' ? 'text-success-600' : 'text-error-600'}`}>{txn.type}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant='grey' className='text-[10px]'>{sourceLabel(txn.source)}</Badge></TableCell>
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
    </div>
  )
}

export default TransactionsPageClient
