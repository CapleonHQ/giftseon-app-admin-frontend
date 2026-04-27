'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Shield, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatNumber } from '@/lib/utils'
import type { SystemLog } from '@/types/Admin'
import { listLogs } from '@/api/services/admin'

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  approve_withdrawal: 'Approve Withdrawal',
  reject_withdrawal: 'Reject Withdrawal',
  refund_withdrawal: 'Refund Withdrawal',
  approve_kyc: 'Approve KYC',
  reject_kyc: 'Reject KYC',
  update_user_status: 'Update User Status',
}

const ACTION_BADGE: Record<string, 'success' | 'error' | 'warning' | 'information' | 'grey'> = {
  login: 'information',
  approve_withdrawal: 'success',
  reject_withdrawal: 'error',
  refund_withdrawal: 'warning',
  approve_kyc: 'success',
  reject_kyc: 'error',
  update_user_status: 'warning',
}

const ENTITY_TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'kyc', label: 'KYC' },
  { value: 'user', label: 'Users' },
  { value: 'auth', label: 'Auth' },
]

const LogsPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [entityType, setEntityType] = useState<string>('all')
  const [page, setPage] = useState(1)

  const params = {
    action: debouncedSearch || undefined,
    entityType: entityType !== 'all' ? entityType : undefined,
    page,
    limit: 50,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['logs', params],
    queryFn: () => listLogs(params),
    placeholderData: (prev) => prev,
    retry: 1,
    refetchInterval: 30_000,
  })

  const logs: SystemLog[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__logSearchTimer)
    ;(window as any).__logSearchTimer = setTimeout(() => { setDebouncedSearch(val); setPage(1) }, 400)
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats */}
      <div className='grid grid-cols-2 gap-4'>
        {[
          { label: 'Total Log Entries', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'This Page', value: formatNumber(logs.length), color: 'text-information-600', bg: 'bg-information-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Activity className={`w-5 h-5 ${s.color}`} />
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

      {/* PII notice */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className='border-information-200 bg-information-50'>
          <CardContent className='p-3 flex items-center gap-2'>
            <Shield className='w-4 h-4 text-information-600 shrink-0' />
            <p className='text-xs text-information-700'>
              PII protection active — emails, phone numbers, and account numbers are masked in all log entries.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <CardTitle className='text-sm'>Audit Logs</CardTitle>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                  <Input
                    placeholder='Search actions...'
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className='pl-8 h-8 text-xs w-44'
                  />
                </div>
                <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-36'>
                    <SelectValue placeholder='Entity Type' />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPE_FILTER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className='pt-0 px-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : logs.length === 0
                    ? (
                        <TableRow>
                          <TableCell colSpan={6} className='text-center text-sm text-grey-400 py-12'>
                            No audit logs found.
                          </TableCell>
                        </TableRow>
                      )
                    : logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge
                              variant={(ACTION_BADGE[log.action] ?? 'grey') as any}
                              className='text-[10px] capitalize whitespace-nowrap'
                            >
                              {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className='text-xs font-mono text-grey-700'>{log.adminId.slice(0, 8)}…</p>
                              <p className='text-[10px] text-grey-500'>{log.adminEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.entityType ? (
                              <div>
                                <Badge variant='grey' className='text-[10px] capitalize'>{log.entityType}</Badge>
                                {log.entityId && (
                                  <p className='text-[10px] font-mono text-grey-500 mt-0.5'>{log.entityId.slice(0, 8)}…</p>
                                )}
                              </div>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] font-mono text-grey-600'>{log.ipAddress ?? '—'}</span>
                          </TableCell>
                          <TableCell>
                            {log.metadata ? (
                              <details className='cursor-pointer'>
                                <summary className='text-[10px] text-information-600 list-none hover:underline'>View</summary>
                                <pre className='text-[9px] text-grey-600 mt-1 max-w-[200px] overflow-x-auto'>
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className='text-[10px] text-grey-300'>—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className='text-[10px] text-grey-500 whitespace-nowrap'>{formatDateTime(log.createdAt)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {logs.length} of {formatNumber(total)} entries</span>
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

export default LogsPageClient
