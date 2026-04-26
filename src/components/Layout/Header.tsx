'use client'

import { Bell } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface HeaderProps {
  pageTitle: string
}

const Header = ({ pageTitle }: HeaderProps) => {
  const { admin } = useAuth()

  return (
    <div className='h-14 bg-white border-b border-grey-50 flex items-center justify-between px-6 shrink-0'>
      <h1 className='text-base font-semibold text-grey-900'>{pageTitle}</h1>

      <div className='flex items-center gap-3'>
        {/* Notification bell */}
        <button className='relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-grey-50 transition-colors text-grey-500'>
          <Bell className='w-4 h-4' />
          <span className='absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-error-500 rounded-full' />
        </button>

        {/* Admin avatar */}
        <div className='flex items-center gap-2'>
          <Avatar className='w-8 h-8'>
            <AvatarFallback className='text-xs'>
              {admin ? getInitials(admin.firstName, admin.lastName) : 'AD'}
            </AvatarFallback>
          </Avatar>
          <div className='hidden sm:flex flex-col'>
            <span className='text-xs font-medium text-grey-900 leading-none'>
              {admin ? `${admin.firstName} ${admin.lastName}` : 'Admin'}
            </span>
            <span className='text-[10px] text-grey-500 leading-none mt-0.5 capitalize'>
              {admin?.role?.replace('_', ' ') ?? 'Administrator'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Header
