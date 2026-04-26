'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Zap, Wifi, Tv, Battery, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils'
import type { AdminBill, BillType } from '@/types/Admin'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { listBills, getBillsBreakdown } from '@/api/services/admin'

ChartJS.register(ArcElement, Tooltip, Legend)

const billTypeIcon: Record<BillType, React.ReactNode> = {
  airtime: <Zap className='w-3.5 h-3.5 text-warning-500' />,
  data: <Wifi className='w-3.5 h-3.5 text-information-500' />,
  cable_tv: <Tv className='w-3.5 h-3.5 text-primary-500' />,
  electricity: <Battery className='w-3.5 h-3.5 text-success-500' />,
}

const billTypeLabel: Record<BillType, string> = {
  airtime: 'Airtime',
  data: 'Data',
  cable_tv: 'Cable TV',
  electricity: 'Electricity',
}

const statusBadgeVariant = (status: AdminBill['status']) => {
  if (status === 'success') return 'success'
  if (status === 'pending') return 'warning'
  return 'error'
}

const BILL_COLORS = ['#dd900d', '#1671d9', '#1a1abc', '#099137']
const BILL_TYPE_KEYS: BillType[] = ['airtime', 'data', 'cable_tv', 'electricity']
const LIMIT = 20

const BillsPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const params = {
    search: debouncedSearch || undefined,
    billType: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['bills', params],
    queryFn: () => listBills(params),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const { data: breakdown } = useQuery({
    queryKey: ['bills-breakdown'],
    queryFn: getBillsBreakdown,
    retry: 1,
  })

  const bills: AdminBill[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__billSearchTimer)
    ;(window as any).__billSearchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  const doughnutValues = BILL_TYPE_KEYS.map((k) => breakdown?.[k]?.count ?? 0)
  const totalBillCount = doughnutValues.reduce((a, b) => a + b, 0)

  const doughnutData = {
    labels: ['Airtime', 'Data', 'Cable TV', 'Electricity'],
    datasets: [{ data: doughnutValues, backgroundColor: BILL_COLORS, borderWidth: 0 }],
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-2 gap-4'>
        {[
          { label: 'Total Bills', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'This Page', value: formatNumber(bills.length), color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className='p-4'><p className='text-xs text-grey-500 mb-1'>{s.label}</p><p className={`text-lg font-semibold ${s.color}`}>{s.value}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Doughnut chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle className='text-sm'>Bills by Type</CardTitle>
              <p className='text-xs text-grey-500'>Distribution breakdown</p>
            </CardHeader>
            <CardContent className='flex flex-col items-center gap-4'>
              {totalBillCount > 0 ? (
                <>
                  <div className='w-40 h-40'>
                    <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} />
                  </div>
                  <div className='w-full flex flex-col gap-1.5'>
                    {['Airtime', 'Data', 'Cable TV', 'Electricity'].map((label, i) => (
                      <div key={label} className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: BILL_COLORS[i] }} />
                          <span className='text-xs text-grey-600'>{label}</span>
                        </div>
                        <span className='text-xs font-medium text-grey-800'>
                          {Math.round((doughnutValues[i] / totalBillCount) * 100)}%
                        </span>
                      </div>
                    ))}
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
                <CardTitle className='text-sm'>Bills</CardTitle>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                    <Input placeholder='Search...' value={search} onChange={(e) => handleSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-40' />
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Type' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Types</SelectItem>
                      <SelectItem value='airtime'>Airtime</SelectItem>
                      <SelectItem value='data'>Data</SelectItem>
                      <SelectItem value='cable_tv'>Cable TV</SelectItem>
                      <SelectItem value='electricity'>Electricity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Status' /></SelectTrigger>
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
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Provider</TableHead>
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
                    : bills.length === 0
                      ? <TableRow><TableCell colSpan={7} className='text-center text-sm text-grey-400 py-12'>No bills found.</TableCell></TableRow>
                      : bills.map((bill) => (
                          <TableRow key={bill.id}>
                            <TableCell><span className='text-xs font-mono text-grey-700'>{bill.reference}</span></TableCell>
                            <TableCell>
                              <div className='flex items-center gap-1'>
                                {billTypeIcon[bill.type]}
                                <span className='text-xs text-grey-700'>{billTypeLabel[bill.type] ?? bill.type}</span>
                              </div>
                            </TableCell>
                            <TableCell><p className='text-xs font-medium text-grey-800'>{bill.userName}</p></TableCell>
                            <TableCell><Badge variant='grey' className='text-[10px]'>{bill.provider}</Badge></TableCell>
                            <TableCell><span className='text-xs font-semibold text-grey-800'>{formatCurrency(bill.amount)}</span></TableCell>
                            <TableCell><Badge variant={statusBadgeVariant(bill.status) as any} className='text-[10px] capitalize'>{bill.status}</Badge></TableCell>
                            <TableCell><span className='text-[10px] text-grey-500'>{formatDateTime(bill.createdAt)}</span></TableCell>
                          </TableRow>
                        ))}
                </TableBody>
              </Table>
              <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
                <span className='text-xs text-grey-500'>Showing {bills.length} of {formatNumber(total)}</span>
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

export default BillsPageClient
