'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, XCircle, RotateCcw, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MOCK_REFUNDS } from '@/lib/mock-data'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { RefundRequest } from '@/types/Admin'
import { toast } from 'sonner'

const statusBadgeVariant = (status: RefundRequest['status']): 'success' | 'warning' | 'error' | 'information' | 'grey' => {
  if (status === 'processed') return 'success'
  if (status === 'approved') return 'information'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'error'
  return 'grey'
}

const RefundsPageClient = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [autoRefundEnabled, setAutoRefundEnabled] = useState(true)
  const [refundWindow, setRefundWindow] = useState('24')
  const [maxRefundAmount, setMaxRefundAmount] = useState('50000')

  const filtered = MOCK_REFUNDS.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      r.reference.toLowerCase().includes(q) ||
      r.userName.toLowerCase().includes(q) ||
      r.originalReference.toLowerCase().includes(q)

    const matchStatus = statusFilter === 'all' || r.status === statusFilter

    return matchSearch && matchStatus
  })

  const pendingCount = MOCK_REFUNDS.filter((r) => r.status === 'pending').length
  const totalRefunded = MOCK_REFUNDS.filter((r) => r.status === 'processed').reduce((a, r) => a + r.amount, 0)

  const handleApprove = (req: RefundRequest) => {
    toast.success(`Refund ${req.reference} approved (demo).`)
  }

  const handleReject = (req: RefundRequest) => {
    toast.error(`Refund ${req.reference} rejected (demo).`)
  }

  const handleSaveConfig = () => {
    toast.success('Refund configuration saved (demo).')
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {[
          { label: 'Pending Refunds', value: String(pendingCount), color: 'text-warning-600', bg: 'bg-warning-50' },
          { label: 'Total Refunded', value: formatCurrency(totalRefunded), color: 'text-success-600', bg: 'bg-success-50' },
          { label: 'Total Requests', value: String(MOCK_REFUNDS.length), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Rejection Rate', value: `${Math.round((MOCK_REFUNDS.filter((r) => r.status === 'rejected').length / MOCK_REFUNDS.length) * 100)}%`, color: 'text-error-600', bg: 'bg-error-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <RotateCcw className={`w-5 h-5 ${s.color}`} />
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

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        {/* Refund Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Settings className='w-4 h-4 text-primary-500' />
                <CardTitle className='text-sm'>Refund Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='pt-0 flex flex-col gap-4'>
              {/* Auto-refund toggle */}
              <div className='flex items-center justify-between p-3 bg-grey-50 rounded-lg border border-grey-100'>
                <div>
                  <p className='text-xs font-medium text-grey-800'>Auto-approve failed bills</p>
                  <p className='text-[10px] text-grey-500 mt-0.5'>Auto-refund when bill delivery fails</p>
                </div>
                <button
                  onClick={() => setAutoRefundEnabled(!autoRefundEnabled)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${autoRefundEnabled ? 'bg-success-500' : 'bg-grey-200'}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefundEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              {/* Refund window */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-grey-700'>Refund Request Window (hours)</label>
                <Select value={refundWindow} onValueChange={setRefundWindow}>
                  <SelectTrigger className='h-9 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='6'>6 hours</SelectItem>
                    <SelectItem value='12'>12 hours</SelectItem>
                    <SelectItem value='24'>24 hours</SelectItem>
                    <SelectItem value='48'>48 hours</SelectItem>
                    <SelectItem value='72'>72 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Max refund amount */}
              <div className='flex flex-col gap-1.5'>
                <label className='text-xs font-medium text-grey-700'>Max Auto-Refund Amount (₦)</label>
                <Input
                  type='number'
                  value={maxRefundAmount}
                  onChange={(e) => setMaxRefundAmount(e.target.value)}
                  className='h-9 text-xs'
                  placeholder='50000'
                />
                <p className='text-[10px] text-grey-400'>Refunds above this need manual approval</p>
              </div>

              <Button className='w-full mt-auto' onClick={handleSaveConfig}>
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='lg:col-span-2'
        >
          <Card>
            <CardHeader>
              <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
                <CardTitle className='text-sm'>Refund Requests</CardTitle>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                    <Input
                      placeholder='Search...'
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className='pl-8 h-8 text-xs w-44'
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className='h-8 text-xs w-32'>
                      <SelectValue placeholder='Status' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>All Status</SelectItem>
                      <SelectItem value='pending'>Pending</SelectItem>
                      <SelectItem value='approved'>Approved</SelectItem>
                      <SelectItem value='processed'>Processed</SelectItem>
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
                    <TableHead>Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>
                        <div>
                          <span className='text-xs font-mono text-grey-700'>{req.reference}</span>
                          <p className='text-[10px] text-grey-400 mt-0.5'>Original: {req.originalReference}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className='text-xs font-medium text-grey-800'>{req.userName}</p>
                      </TableCell>
                      <TableCell>
                        <span className='text-xs font-semibold text-grey-900'>{formatCurrency(req.amount)}</span>
                      </TableCell>
                      <TableCell>
                        <p className='text-[10px] text-grey-600 max-w-[140px] leading-4'>{req.reason}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(req.status)} className='text-[10px] capitalize'>
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className='text-[10px] text-grey-500'>{formatDateTime(req.createdAt)}</span>
                      </TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <div className='flex items-center gap-1'>
                            <Button
                              size='sm'
                              variant='success'
                              className='h-6 px-2 text-[10px]'
                              onClick={() => handleApprove(req)}
                            >
                              <CheckCircle2 className='w-3 h-3 mr-0.5' />
                              Approve
                            </Button>
                            <Button
                              size='sm'
                              variant='destructive'
                              className='h-6 px-2 text-[10px]'
                              onClick={() => handleReject(req)}
                            >
                              <XCircle className='w-3 h-3 mr-0.5' />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className='text-center text-sm text-grey-400 py-8'>
                        No refund requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default RefundsPageClient
