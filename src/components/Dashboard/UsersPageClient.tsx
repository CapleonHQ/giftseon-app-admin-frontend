'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Filter, UserCheck, UserX, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatCurrency, formatDate, formatNumber, getInitials } from '@/lib/utils'
import type { AdminUser } from '@/types/Admin'
import { toast } from 'sonner'
import { listUsers, updateUserStatus } from '@/api/services/admin'

const kycBadge = (level: number) => {
  if (level === 0) return <Badge variant='grey'>No KYC</Badge>
  if (level === 1) return <Badge variant='information'>Level 1</Badge>
  if (level === 2) return <Badge variant='warning'>Level 2</Badge>
  return <Badge variant='success'>Level 3</Badge>
}

const statusBadge = (status: AdminUser['status']) => {
  if (status === 'active') return <Badge variant='success'>Active</Badge>
  if (status === 'pending') return <Badge variant='warning'>Pending</Badge>
  return <Badge variant='error'>Suspended</Badge>
}

const LIMIT = 20

const UsersPageClient = () => {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [kycFilter, setKycFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const qc = useQueryClient()

  const params = {
    search: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    kycLevel: kycFilter !== 'all' ? Number(kycFilter) : undefined,
    page,
    limit: LIMIT,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsers(params),
    placeholderData: (prev) => prev,
    retry: 1,
  })

  const mutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      updateUserStatus(userId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User status updated.')
    },
    onError: () => toast.error('Failed to update user status.'),
  })

  const users: AdminUser[] = data?.data ?? []
  const meta = data?.meta
  const total = meta?.total ?? 0
  const totalPages = meta?.totalPages ?? 1

  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout((window as any).__searchTimer)
    ;(window as any).__searchTimer = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 400)
  }

  const handleToggleStatus = (user: AdminUser) => {
    const next = user.status === 'active' ? 'suspended' : 'active'
    mutation.mutate({ userId: user.id, status: next })
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Stats row */}
      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
        {[
          { label: 'Total Users', value: formatNumber(total), color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Current Page', value: formatNumber(users.length), color: 'text-information-600', bg: 'bg-information-50' },
          { label: 'Total Pages', value: formatNumber(totalPages), color: 'text-success-600', bg: 'bg-success-50' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className='p-4 flex items-center gap-3'>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <Users className={`w-5 h-5 ${s.color}`} />
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

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center gap-3 justify-between'>
              <CardTitle className='text-sm'>All Users</CardTitle>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-grey-400' />
                  <Input placeholder='Search users...' value={search} onChange={(e) => handleSearchChange(e.target.value)} className='pl-8 h-8 text-xs w-48' />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-32'>
                    <Filter className='w-3 h-3 mr-1' /><SelectValue placeholder='Status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='active'>Active</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='suspended'>Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={kycFilter} onValueChange={(v) => { setKycFilter(v); setPage(1) }}>
                  <SelectTrigger className='h-8 text-xs w-32'><SelectValue placeholder='KYC Level' /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All KYC</SelectItem>
                    <SelectItem value='0'>No KYC</SelectItem>
                    <SelectItem value='1'>Level 1</SelectItem>
                    <SelectItem value='2'>Level 2</SelectItem>
                    <SelectItem value='3'>Level 3</SelectItem>
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
                  <TableHead>Account Type</TableHead>
                  <TableHead>KYC Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Wallet Balance</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-full' /></TableCell>)}</TableRow>
                    ))
                  : users.length === 0
                    ? <TableRow><TableCell colSpan={7} className='text-center text-sm text-grey-400 py-12'>No users found.</TableCell></TableRow>
                    : users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className='flex items-center gap-2.5'>
                              <Avatar className='w-7 h-7'>
                                <AvatarFallback className='text-xs'>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className='text-xs font-medium text-grey-900'>{user.firstName} {user.lastName}</p>
                                <p className='text-[10px] text-grey-500'>{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.accountType === 'merchant' ? 'information' : 'grey'} className='capitalize text-[10px]'>{user.accountType}</Badge>
                          </TableCell>
                          <TableCell>{kycBadge(user.kycLevel)}</TableCell>
                          <TableCell>{statusBadge(user.status)}</TableCell>
                          <TableCell><span className='text-xs font-medium text-grey-800'>{formatCurrency(user.walletBalance ?? 0)}</span></TableCell>
                          <TableCell><span className='text-xs text-grey-500'>{formatDate(user.createdAt)}</span></TableCell>
                          <TableCell>
                            <Button variant='ghost' size='sm' className='h-7 w-7 p-0' onClick={() => handleToggleStatus(user)} disabled={mutation.isPending}>
                              {user.status === 'active'
                                ? <UserX className='w-3.5 h-3.5 text-error-500' />
                                : <UserCheck className='w-3.5 h-3.5 text-success-500' />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
            <div className='px-4 py-3 border-t border-grey-50 flex items-center justify-between'>
              <span className='text-xs text-grey-500'>Showing {users.length} of {formatNumber(total)} users</span>
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

export default UsersPageClient
