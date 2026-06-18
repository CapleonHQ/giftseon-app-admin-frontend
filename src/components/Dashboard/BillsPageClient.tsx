'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Zap, Wifi, Tv, Battery, ChevronLeft, ChevronRight, RefreshCw, Database, ToggleLeft, ToggleRight } from 'lucide-react'
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
import {
  listBills,
  getBillsBreakdown,
  triggerBillsSync,
  listDataNetworks,
  listNetworkPlans,
  toggleDataNetwork,
  type DataNetwork,
  type DataPlan,
} from '@/api/services/admin'

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
const PLAN_LIMIT = 50

// ─── Networks tab ─────────────────────────────────────────────────────────────

const NetworksTab = ({ onSync, syncPending, syncMessage }: {
  onSync: () => void
  syncPending: boolean
  syncMessage: string | null
}) => {
  const queryClient = useQueryClient()
  const [selectedNetwork, setSelectedNetwork] = useState<DataNetwork | null>(null)
  const [planSearch, setPlanSearch] = useState('')
  const [debouncedPlanSearch, setDebouncedPlanSearch] = useState('')
  const [planTypeFilter, setPlanTypeFilter] = useState('all')
  const [planStatusFilter, setPlanStatusFilter] = useState('all')
  const [planPage, setPlanPage] = useState(1)

  const { data: networks, isLoading: networksLoading } = useQuery({
    queryKey: ['data-networks'],
    queryFn: listDataNetworks,
    retry: 1,
  })

  const planParams = {
    search: debouncedPlanSearch || undefined,
    planType: planTypeFilter !== 'all' ? planTypeFilter : undefined,
    isActive: planStatusFilter === 'all' ? undefined : planStatusFilter === 'active',
    page: planPage,
    limit: PLAN_LIMIT,
  }

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['network-plans', selectedNetwork?.code, planParams],
    queryFn: () => listNetworkPlans(selectedNetwork!.code, planParams),
    enabled: !!selectedNetwork,
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) =>
      toggleDataNetwork(code, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['data-networks'] }),
  })

  const handlePlanSearchChange = (val: string) => {
    setPlanSearch(val)
    clearTimeout((window as any).__planSearchTimer)
    ;(window as any).__planSearchTimer = setTimeout(() => {
      setDebouncedPlanSearch(val)
      setPlanPage(1)
    }, 400)
  }

  const plans: DataPlan[] = plansData?.data ?? []
  const planMeta = plansData?.meta
  const totalPlans = planMeta?.total ?? 0
  const totalPlanPages = planMeta?.totalPages ?? 1

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
      {/* Network list */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm'>Data Networks</CardTitle>
            <Button size='sm' variant='outline' className='h-7 text-xs gap-1.5' disabled={syncPending} onClick={onSync}>
              <RefreshCw className={`w-3 h-3 ${syncPending ? 'animate-spin' : ''}`} />
              {syncPending ? 'Syncing…' : 'Sync'}
            </Button>
          </div>
          {syncMessage && <p className='text-[10px] text-grey-500 mt-1'>{syncMessage}</p>}
        </CardHeader>
        <CardContent className='pt-0 px-0'>
          {networksLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='px-4 py-3 border-b border-grey-50 last:border-0'>
                  <Skeleton className='h-4 w-32 mb-1' />
                  <Skeleton className='h-3 w-20' />
                </div>
              ))
            : (networks ?? []).map((network) => (
                <button
                  key={network.id}
                  onClick={() => { setSelectedNetwork(network); setPlanPage(1); setPlanSearch(''); setDebouncedPlanSearch('') }}
                  className={`w-full px-4 py-3 border-b border-grey-50 last:border-0 text-left transition-colors hover:bg-grey-50 ${selectedNetwork?.id === network.id ? 'bg-primary-50' : ''}`}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs font-medium text-grey-800'>{network.displayName}</p>
                      <p className='text-[10px] text-grey-500 mt-0.5'>
                        <span className='font-mono'>{network.code}</span>
                        {' · '}
                        <span>{network.activePlans}/{network.totalPlans} plans</span>
                      </p>
                      {network.lastSyncedAt && (
                        <p className='text-[10px] text-grey-400 mt-0.5'>Synced {formatDateTime(network.lastSyncedAt)}</p>
                      )}
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <Badge variant={network.isActive ? 'success' : 'grey'} className='text-[10px]'>
                        {network.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ code: network.code, isActive: !network.isActive }) }}
                        className='text-grey-400 hover:text-grey-700 transition-colors'
                        title={network.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {network.isActive
                          ? <ToggleRight className='w-4 h-4 text-success-500' />
                          : <ToggleLeft className='w-4 h-4' />}
                      </button>
                    </div>
                  </div>
                </button>
              ))}
        </CardContent>
      </Card>

      {/* Plans table */}
      <div className='lg:col-span-2'>
        {!selectedNetwork ? (
          <Card className='h-full flex items-center justify-center'>
            <CardContent className='flex flex-col items-center gap-3 py-16 text-center'>
              <Database className='w-8 h-8 text-grey-300' />
              <p className='text-sm text-grey-400'>Select a network to view its data plans</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
                <div>
                  <CardTitle className='text-sm'>{selectedNetwork.displayName} Plans</CardTitle>
                  <p className='text-[10px] text-grey-400 mt-0.5'>{formatNumber(totalPlans)} plan(s)</p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                    <Input placeholder='Search…' value={planSearch} onChange={(e) => handlePlanSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-36' />
                  </div>
                  <Select value={planTypeFilter} onValueChange={(v) => { setPlanTypeFilter(v); setPlanPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Type' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Types</SelectItem>
                      <SelectItem value='daily'>Daily</SelectItem>
                      <SelectItem value='weekly'>Weekly</SelectItem>
                      <SelectItem value='monthly'>Monthly</SelectItem>
                      <SelectItem value='night'>Night</SelectItem>
                      <SelectItem value='social'>Social</SelectItem>
                      <SelectItem value='long-term'>Long-term</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={planStatusFilter} onValueChange={(v) => { setPlanStatusFilter(v); setPlanPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-24'><SelectValue placeholder='Status' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All</SelectItem>
                      <SelectItem value='active'>Active</SelectItem>
                      <SelectItem value='inactive'>Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className='pt-0 px-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sell Price</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plansLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>)}</TableRow>
                      ))
                    : plans.length === 0
                      ? <TableRow><TableCell colSpan={8} className='text-center text-sm text-grey-400 py-12'>No plans found.</TableCell></TableRow>
                      : plans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <div>
                                <p className='text-xs font-medium text-grey-800'>{plan.label}</p>
                                <p className='text-[10px] text-grey-400 font-mono'>{plan.providerCode}</p>
                              </div>
                            </TableCell>
                            <TableCell><span className='text-xs text-grey-700'>{plan.dataMb >= 1024 ? `${(plan.dataMb / 1024).toFixed(1)}GB` : `${plan.dataMb}MB`}</span></TableCell>
                            <TableCell><span className='text-xs text-grey-700'>{plan.validityDays}d</span></TableCell>
                            <TableCell><Badge variant='grey' className='text-[10px] capitalize'>{plan.planType}</Badge></TableCell>
                            <TableCell><span className='text-xs text-grey-700'>{formatCurrency(plan.costNaira)}</span></TableCell>
                            <TableCell><span className='text-xs font-semibold text-grey-800'>{formatCurrency(plan.sellPriceNaira)}</span></TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium ${plan.marginKobo > 0 ? 'text-success-600' : 'text-error-600'}`}>
                                {formatCurrency(plan.marginKobo / 100)}
                              </span>
                            </TableCell>
                            <TableCell><Badge variant={plan.isActive ? 'success' : 'grey'} className='text-[10px]'>{plan.isActive ? 'Active' : 'Off'}</Badge></TableCell>
                          </TableRow>
                        ))}
                </TableBody>
              </Table>
              <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
                <span className='text-xs text-grey-500'>Showing {plans.length} of {formatNumber(totalPlans)}</span>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' disabled={planPage <= 1} onClick={() => setPlanPage((p) => p - 1)}><ChevronLeft className='w-3.5 h-3.5' /></Button>
                  <span className='text-xs text-grey-500'>{planPage} / {totalPlanPages}</span>
                  <Button variant='outline' size='sm' disabled={planPage >= totalPlanPages} onClick={() => setPlanPage((p) => p + 1)}><ChevronRight className='w-3.5 h-3.5' /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const BillsPageClient = () => {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'transactions' | 'networks'>('transactions')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const syncMutation = useMutation({
    mutationFn: triggerBillsSync,
    onSuccess: (results) => {
      const total = results.reduce((acc, r) => acc + r.created + r.updated, 0)
      setSyncMessage(`Sync complete — ${results.length} network(s), ${total} plan(s) created/updated`)
      void queryClient.invalidateQueries({ queryKey: ['data-networks'] })
      void queryClient.invalidateQueries({ queryKey: ['network-plans'] })
      setTimeout(() => setSyncMessage(null), 5000)
    },
    onError: () => setSyncMessage('Sync failed — check server logs'),
  })

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
  const totalVolume = (meta as any)?.totalVolume ?? 0

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__billSearchTimer)
    ;(window as any).__billSearchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  const doughnutValues = BILL_TYPE_KEYS.map((k) => breakdown?.[k]?.count ?? 0)
  const doughnutVolumes = BILL_TYPE_KEYS.map((k) => breakdown?.[k]?.volume ?? 0)
  const totalBillCount = doughnutValues.reduce((a, b) => a + b, 0)
  const totalBreakdownVolume = doughnutVolumes.reduce((a, b) => a + b, 0)

  const doughnutData = {
    labels: ['Airtime', 'Data', 'Cable TV', 'Electricity'],
    datasets: [{ data: doughnutValues, backgroundColor: BILL_COLORS, borderWidth: 0 }],
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Summary stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'Total Bills', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Total Volume', value: formatCurrency(totalVolume || totalBreakdownVolume), color: 'text-success-600', bg: 'bg-success-50' },
          { label: 'Airtime', value: formatCurrency(breakdown?.airtime?.volume ?? 0), color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Electricity', value: formatCurrency(breakdown?.electricity?.volume ?? 0), color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className='p-4'><p className='text-xs text-grey-500 mb-1'>{s.label}</p><p className={`text-lg font-semibold ${s.color}`}>{s.value}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Tab selector */}
      <div className='flex gap-1 border-b border-grey-100'>
        {(['transactions', 'networks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-grey-500 hover:text-grey-800'
            }`}
          >
            {t === 'networks' ? 'Data Networks' : 'Transactions'}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Doughnut chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
                      {BILL_TYPE_KEYS.map((key, i) => (
                        <div key={key} className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: BILL_COLORS[i] }} />
                            <span className='text-xs text-grey-600'>{billTypeLabel[key]}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] text-grey-400'>{formatCurrency(doughnutVolumes[i])}</span>
                            <span className='text-xs font-medium text-grey-800'>
                              {Math.round((doughnutValues[i] / totalBillCount) * 100)}%
                            </span>
                          </div>
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

          {/* Transactions table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className='lg:col-span-2'>
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
                              <TableCell>
                                <div>
                                  <p className='text-xs font-medium text-grey-800'>{bill.userName ?? '—'}</p>
                                  {bill.userEmail && <p className='text-[10px] text-grey-500'>{bill.userEmail}</p>}
                                  {bill.userTag && <p className='text-[10px] text-primary-500'>@{bill.userTag}</p>}
                                </div>
                              </TableCell>
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
      )}

      {tab === 'networks' && (
        <NetworksTab
          onSync={() => syncMutation.mutate()}
          syncPending={syncMutation.isPending}
          syncMessage={syncMessage}
        />
      )}
    </div>
  )
}

export default BillsPageClient
