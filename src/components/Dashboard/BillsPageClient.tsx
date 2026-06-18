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
  listBills, getBillsBreakdown, triggerBillsSync,
  listDataNetworks, listNetworkPlans, toggleDataNetwork,
  listAirtimeNetworks, listCableProviders, listCablePackages, listElectricityDiscos,
  type DataNetwork, type DataPlan, type FullSyncResult,
  type AirtimeNetwork, type CableProvider, type CablePackage, type ElectricityDisco,
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

type CatalogueCategory = 'data' | 'airtime' | 'cable' | 'electricity'

const CATALOGUE_TABS: { key: CatalogueCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'data', label: 'Data', icon: <Wifi className='w-3.5 h-3.5' /> },
  { key: 'airtime', label: 'Airtime', icon: <Zap className='w-3.5 h-3.5' /> },
  { key: 'cable', label: 'Cable TV', icon: <Tv className='w-3.5 h-3.5' /> },
  { key: 'electricity', label: 'Electricity', icon: <Battery className='w-3.5 h-3.5' /> },
]

// ─── Skeleton row helper ──────────────────────────────────────────────────────

const SkeletonRows = ({ cols, rows = 4 }: { cols: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={i}>
        {Array.from({ length: cols }).map((_, j) => (
          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
        ))}
      </TableRow>
    ))}
  </>
)

// ─── Data plans panel ─────────────────────────────────────────────────────────

const DataPlansPanel = () => {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<DataNetwork | null>(null)
  const [planSearch, setPlanSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const { data: networks, isLoading } = useQuery({ queryKey: ['data-networks'], queryFn: listDataNetworks, retry: 1 })

  const planParams = {
    search: debouncedSearch || undefined,
    planType: typeFilter !== 'all' ? typeFilter : undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    page,
    limit: PLAN_LIMIT,
  }
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['network-plans', selected?.code, planParams],
    queryFn: () => listNetworkPlans(selected!.code, planParams),
    enabled: !!selected,
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ code, isActive }: { code: string; isActive: boolean }) => toggleDataNetwork(code, isActive),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['data-networks'] }),
  })

  const plans: DataPlan[] = plansData?.data ?? []
  const meta = plansData?.meta

  const handleSearch = (val: string) => {
    setPlanSearch(val)
    clearTimeout((window as any).__planSearch)
    ;(window as any).__planSearch = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
      <Card>
        <CardContent className='pt-0 px-0'>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className='px-4 py-3 border-b border-grey-50'><Skeleton className='h-4 w-32 mb-1' /><Skeleton className='h-3 w-20' /></div>
              ))
            : (networks ?? []).map((n) => (
                <button key={n.id} onClick={() => { setSelected(n); setPage(1); setPlanSearch(''); setDebouncedSearch('') }}
                  className={`w-full px-4 py-3 border-b border-grey-50 last:border-0 text-left hover:bg-grey-50 transition-colors ${selected?.id === n.id ? 'bg-primary-50' : ''}`}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs font-medium text-grey-800'>{n.displayName}</p>
                      <p className='text-[10px] text-grey-500 mt-0.5 font-mono'>{n.code} · {n.activePlans}/{n.totalPlans} plans</p>
                      {n.lastSyncedAt && <p className='text-[10px] text-grey-400'>{formatDateTime(n.lastSyncedAt)}</p>}
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <Badge variant={n.isActive ? 'success' : 'grey'} className='text-[10px]'>{n.isActive ? 'Active' : 'Off'}</Badge>
                      <div role='button' tabIndex={0} onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ code: n.code, isActive: !n.isActive }) }} onKeyDown={(e) => e.key === 'Enter' && toggleMutation.mutate({ code: n.code, isActive: !n.isActive })}>
                        {n.isActive ? <ToggleRight className='w-4 h-4 text-success-500' /> : <ToggleLeft className='w-4 h-4 text-grey-400' />}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
        </CardContent>
      </Card>

      <div className='lg:col-span-2'>
        {!selected ? (
          <Card className='h-full'><CardContent className='flex flex-col items-center gap-3 py-16'><Database className='w-8 h-8 text-grey-300' /><p className='text-sm text-grey-400'>Select a network</p></CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
                <div><CardTitle className='text-sm'>{selected.displayName} Plans</CardTitle><p className='text-[10px] text-grey-400'>{formatNumber(meta?.total ?? 0)} plans</p></div>
                <div className='flex flex-wrap gap-2'>
                  <div className='relative'><Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' /><Input value={planSearch} onChange={(e) => handleSearch(e.target.value)} placeholder='Search…' className='pl-8 h-8 text-xs w-36' /></div>
                  <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-28'><SelectValue placeholder='Type' /></SelectTrigger>
                    <SelectContent>
                      {['all', 'daily', 'weekly', 'monthly', 'night', 'social', 'long-term'].map((v) => (
                        <SelectItem key={v} value={v}>{v === 'all' ? 'All Types' : v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                    <SelectTrigger className='h-8 text-xs w-24'><SelectValue placeholder='Status' /></SelectTrigger>
                    <SelectContent><SelectItem value='all'>All</SelectItem><SelectItem value='active'>Active</SelectItem><SelectItem value='inactive'>Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className='pt-0 px-0'>
              <Table>
                <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Data</TableHead><TableHead>Validity</TableHead><TableHead>Type</TableHead><TableHead>Cost</TableHead><TableHead>Sell</TableHead><TableHead>Margin</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {plansLoading ? <SkeletonRows cols={8} /> : plans.length === 0
                    ? <TableRow><TableCell colSpan={8} className='text-center text-sm text-grey-400 py-10'>No plans found.</TableCell></TableRow>
                    : plans.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell><div><p className='text-xs font-medium text-grey-800'>{p.label}</p><p className='text-[10px] font-mono text-grey-400'>{p.providerCode}</p></div></TableCell>
                          <TableCell><span className='text-xs'>{p.dataMb >= 1024 ? `${(p.dataMb / 1024).toFixed(1)}GB` : `${p.dataMb}MB`}</span></TableCell>
                          <TableCell><span className='text-xs'>{p.validityDays}d</span></TableCell>
                          <TableCell><Badge variant='grey' className='text-[10px] capitalize'>{p.planType}</Badge></TableCell>
                          <TableCell><span className='text-xs'>{formatCurrency(p.costNaira)}</span></TableCell>
                          <TableCell><span className='text-xs font-semibold'>{formatCurrency(p.sellPriceNaira)}</span></TableCell>
                          <TableCell><span className={`text-xs font-medium ${p.marginKobo > 0 ? 'text-success-600' : 'text-error-600'}`}>{formatCurrency(p.marginKobo / 100)}</span></TableCell>
                          <TableCell><Badge variant={p.isActive ? 'success' : 'grey'} className='text-[10px]'>{p.isActive ? 'Active' : 'Off'}</Badge></TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
              <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
                <span className='text-xs text-grey-500'>Showing {plans.length} of {formatNumber(meta?.total ?? 0)}</span>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' disabled={(meta?.page ?? 1) <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className='w-3.5 h-3.5' /></Button>
                  <span className='text-xs text-grey-500'>{meta?.page ?? 1} / {meta?.totalPages ?? 1}</span>
                  <Button variant='outline' size='sm' disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}><ChevronRight className='w-3.5 h-3.5' /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Airtime networks panel ───────────────────────────────────────────────────

const AirtimePanel = () => {
  const { data: networks, isLoading } = useQuery({ queryKey: ['airtime-networks'], queryFn: listAirtimeNetworks, retry: 1 })

  return (
    <Card>
      <CardHeader><CardTitle className='text-sm'>Airtime Networks</CardTitle></CardHeader>
      <CardContent className='pt-0 px-0'>
        <Table>
          <TableHeader><TableRow><TableHead>Network</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead>Added</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <SkeletonRows cols={4} /> : (networks ?? []).length === 0
              ? <TableRow><TableCell colSpan={4} className='text-center text-sm text-grey-400 py-10'>No airtime networks synced yet.</TableCell></TableRow>
              : (networks ?? []).map((n: AirtimeNetwork) => (
                  <TableRow key={n.id}>
                    <TableCell><span className='text-xs font-medium text-grey-800'>{n.displayName}</span></TableCell>
                    <TableCell><span className='text-xs font-mono text-grey-600'>{n.code}</span></TableCell>
                    <TableCell><Badge variant={n.isActive ? 'success' : 'grey'} className='text-[10px]'>{n.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><span className='text-[10px] text-grey-500'>{formatDateTime(n.createdAt)}</span></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Cable TV panel ───────────────────────────────────────────────────────────

const CablePanel = () => {
  const [selectedProvider, setSelectedProvider] = useState<CableProvider | null>(null)
  const [page, setPage] = useState(1)

  const { data: providers, isLoading: providersLoading } = useQuery({ queryKey: ['cable-providers'], queryFn: listCableProviders, retry: 1 })
  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ['cable-packages', selectedProvider?.code, page],
    queryFn: () => listCablePackages(selectedProvider!.code, { page, limit: PLAN_LIMIT }),
    enabled: !!selectedProvider,
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const packages: CablePackage[] = packagesData?.data ?? []
  const meta = packagesData?.meta

  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
      <Card>
        <CardHeader><CardTitle className='text-sm'>Cable Providers</CardTitle></CardHeader>
        <CardContent className='pt-0 px-0'>
          {providersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className='px-4 py-3 border-b border-grey-50'><Skeleton className='h-4 w-28 mb-1' /><Skeleton className='h-3 w-16' /></div>
              ))
            : (providers ?? []).map((p) => (
                <button key={p.id} onClick={() => { setSelectedProvider(p); setPage(1) }}
                  className={`w-full px-4 py-3 border-b border-grey-50 last:border-0 text-left hover:bg-grey-50 transition-colors ${selectedProvider?.id === p.id ? 'bg-primary-50' : ''}`}
                >
                  <div className='flex items-center justify-between'>
                    <div>
                      <p className='text-xs font-medium text-grey-800'>{p.displayName}</p>
                      <p className='text-[10px] text-grey-500 font-mono mt-0.5'>{p.code} · {p.totalPackages} packages</p>
                    </div>
                    <Badge variant={p.isActive ? 'success' : 'grey'} className='text-[10px]'>{p.isActive ? 'Active' : 'Off'}</Badge>
                  </div>
                </button>
              ))}
        </CardContent>
      </Card>

      <div className='lg:col-span-2'>
        {!selectedProvider ? (
          <Card className='h-full'><CardContent className='flex flex-col items-center gap-3 py-16'><Database className='w-8 h-8 text-grey-300' /><p className='text-sm text-grey-400'>Select a provider</p></CardContent></Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>{selectedProvider.displayName} Packages</CardTitle>
              <p className='text-[10px] text-grey-400'>{formatNumber(meta?.total ?? 0)} packages</p>
            </CardHeader>
            <CardContent className='pt-0 px-0'>
              <Table>
                <TableHeader><TableRow><TableHead>Package</TableHead><TableHead>Plan Code</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Last Synced</TableHead></TableRow></TableHeader>
                <TableBody>
                  {packagesLoading ? <SkeletonRows cols={5} /> : packages.length === 0
                    ? <TableRow><TableCell colSpan={5} className='text-center text-sm text-grey-400 py-10'>No packages found.</TableCell></TableRow>
                    : packages.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell><div><p className='text-xs font-medium text-grey-800'>{pkg.display}</p><p className='text-[10px] text-grey-500'>{pkg.description}</p></div></TableCell>
                          <TableCell><span className='text-xs font-mono text-grey-600'>{pkg.planCode}</span></TableCell>
                          <TableCell><span className='text-xs font-semibold'>{formatCurrency(pkg.amount)}</span></TableCell>
                          <TableCell><Badge variant={pkg.isActive ? 'success' : 'grey'} className='text-[10px]'>{pkg.isActive ? 'Active' : 'Off'}</Badge></TableCell>
                          <TableCell><span className='text-[10px] text-grey-500'>{formatDateTime(pkg.lastSyncedAt)}</span></TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
              <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
                <span className='text-xs text-grey-500'>Showing {packages.length} of {formatNumber(meta?.total ?? 0)}</span>
                <div className='flex items-center gap-2'>
                  <Button variant='outline' size='sm' disabled={(meta?.page ?? 1) <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className='w-3.5 h-3.5' /></Button>
                  <span className='text-xs text-grey-500'>{meta?.page ?? 1} / {meta?.totalPages ?? 1}</span>
                  <Button variant='outline' size='sm' disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)} onClick={() => setPage((p) => p + 1)}><ChevronRight className='w-3.5 h-3.5' /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Electricity panel ────────────────────────────────────────────────────────

const ElectricityPanel = () => {
  const { data: discos, isLoading } = useQuery({ queryKey: ['electricity-discos'], queryFn: listElectricityDiscos, retry: 1 })

  return (
    <Card>
      <CardHeader><CardTitle className='text-sm'>Electricity DISCOs</CardTitle></CardHeader>
      <CardContent className='pt-0 px-0'>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Plan Code</TableHead><TableHead>Min</TableHead><TableHead>Max</TableHead><TableHead>Status</TableHead><TableHead>Last Synced</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading ? <SkeletonRows cols={6} /> : (discos ?? []).length === 0
              ? <TableRow><TableCell colSpan={6} className='text-center text-sm text-grey-400 py-10'>No discos synced yet.</TableCell></TableRow>
              : (discos ?? []).map((d: ElectricityDisco) => (
                  <TableRow key={d.id}>
                    <TableCell><span className='text-xs font-medium text-grey-800'>{d.displayName}</span></TableCell>
                    <TableCell><span className='text-xs font-mono text-grey-600'>{d.planCode}</span></TableCell>
                    <TableCell><span className='text-xs'>{formatCurrency(d.minAmount)}</span></TableCell>
                    <TableCell><span className='text-xs'>{formatCurrency(d.maxAmount)}</span></TableCell>
                    <TableCell><Badge variant={d.isActive ? 'success' : 'grey'} className='text-[10px]'>{d.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell><span className='text-[10px] text-grey-500'>{formatDateTime(d.lastSyncedAt)}</span></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Networks tab (category switcher) ────────────────────────────────────────

const NetworksTab = ({ onSync, syncPending, syncMessage }: {
  onSync: () => void
  syncPending: boolean
  syncMessage: string | null
}) => {
  const [category, setCategory] = useState<CatalogueCategory>('data')

  return (
    <div className='flex flex-col gap-4'>
      {/* Category pills + sync button */}
      <div className='flex items-center justify-between flex-wrap gap-3'>
        <div className='flex gap-1 bg-grey-50 rounded-lg p-1'>
          {CATALOGUE_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                category === key ? 'bg-white shadow-sm text-grey-900' : 'text-grey-500 hover:text-grey-700'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
        <div className='flex items-center gap-3'>
          {syncMessage && <span className='text-[10px] text-grey-500'>{syncMessage}</span>}
          <Button size='sm' variant='outline' className='h-8 text-xs gap-1.5' disabled={syncPending} onClick={onSync}>
            <RefreshCw className={`w-3.5 h-3.5 ${syncPending ? 'animate-spin' : ''}`} />
            {syncPending ? 'Syncing…' : 'Sync All'}
          </Button>
        </div>
      </div>

      {category === 'data' && <DataPlansPanel />}
      {category === 'airtime' && <AirtimePanel />}
      {category === 'cable' && <CablePanel />}
      {category === 'electricity' && <ElectricityPanel />}
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
    onSuccess: (results: FullSyncResult) => {
      const dataTotal = results.data?.reduce((acc, r) => acc + r.created + r.updated, 0) ?? 0
      const airTotal = results.airtime?.upserted ?? 0
      const cableTotal = (results.cable?.upserted ?? 0) + (results.cable?.packagesUpserted ?? 0)
      const elTotal = results.electricity?.upserted ?? 0
      setSyncMessage(`Sync complete — ${dataTotal} data plan(s), ${airTotal} airtime, ${cableTotal} cable, ${elTotal} disco(s) updated`)
      void queryClient.invalidateQueries({ queryKey: ['data-networks'] })
      void queryClient.invalidateQueries({ queryKey: ['network-plans'] })
      void queryClient.invalidateQueries({ queryKey: ['airtime-networks'] })
      void queryClient.invalidateQueries({ queryKey: ['cable-providers'] })
      void queryClient.invalidateQueries({ queryKey: ['cable-packages'] })
      void queryClient.invalidateQueries({ queryKey: ['electricity-discos'] })
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
          { label: 'Total Bills', value: formatNumber(total), color: 'text-primary-600' },
          { label: 'Total Volume', value: formatCurrency(totalVolume || totalBreakdownVolume), color: 'text-success-600' },
          { label: 'Airtime', value: formatCurrency(breakdown?.airtime?.volume ?? 0), color: 'text-warning-600' },
          { label: 'Electricity', value: formatCurrency(breakdown?.electricity?.volume ?? 0), color: 'text-information-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className='p-4'><p className='text-xs text-grey-500 mb-1'>{s.label}</p><p className={`text-lg font-semibold ${s.color}`}>{s.value}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Page tabs */}
      <div className='flex gap-1 border-b border-grey-100'>
        {(['transactions', 'networks'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-grey-500 hover:text-grey-800'
            }`}
          >
            {t === 'networks' ? 'Provider Catalogue' : 'Transactions'}
          </button>
        ))}
      </div>

      {tab === 'transactions' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Doughnut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className='h-full'>
              <CardHeader><CardTitle className='text-sm'>Bills by Type</CardTitle><p className='text-xs text-grey-500'>Distribution breakdown</p></CardHeader>
              <CardContent className='flex flex-col items-center gap-4'>
                {totalBillCount > 0 ? (
                  <>
                    <div className='w-40 h-40'><Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '70%' }} /></div>
                    <div className='w-full flex flex-col gap-1.5'>
                      {BILL_TYPE_KEYS.map((key, i) => (
                        <div key={key} className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <div className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: BILL_COLORS[i] }} />
                            <span className='text-xs text-grey-600'>{billTypeLabel[key]}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] text-grey-400'>{formatCurrency(doughnutVolumes[i])}</span>
                            <span className='text-xs font-medium text-grey-800'>{Math.round((doughnutValues[i] / totalBillCount) * 100)}%</span>
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

          {/* Bills table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className='lg:col-span-2'>
            <Card>
              <CardHeader>
                <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
                  <CardTitle className='text-sm'>Bills</CardTitle>
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='relative'><Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' /><Input placeholder='Search...' value={search} onChange={(e) => handleSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-40' /></div>
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
                  <TableHeader><TableRow><TableHead>Reference</TableHead><TableHead>Type</TableHead><TableHead>User</TableHead><TableHead>Provider</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {isLoading
                      ? <SkeletonRows cols={7} rows={5} />
                      : bills.length === 0
                        ? <TableRow><TableCell colSpan={7} className='text-center text-sm text-grey-400 py-12'>No bills found.</TableCell></TableRow>
                        : bills.map((bill) => (
                            <TableRow key={bill.id}>
                              <TableCell><span className='text-xs font-mono text-grey-700'>{bill.reference}</span></TableCell>
                              <TableCell><div className='flex items-center gap-1'>{billTypeIcon[bill.type]}<span className='text-xs text-grey-700'>{billTypeLabel[bill.type] ?? bill.type}</span></div></TableCell>
                              <TableCell><div><p className='text-xs font-medium text-grey-800'>{bill.userName ?? '—'}</p>{bill.userEmail && <p className='text-[10px] text-grey-500'>{bill.userEmail}</p>}{bill.userTag && <p className='text-[10px] text-primary-500'>@{bill.userTag}</p>}</div></TableCell>
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
