'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Zap,
  ArrowDownToLine,
  ShieldCheck,
  Wifi,
  RotateCcw,
  LogOut,
  ScrollText,
} from 'lucide-react'
import { logout } from '@/api/auth'

const MENU_ITEMS = [
  { href: '/overview', label: 'Overview', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/bills', label: 'Bills', icon: Zap },
  { href: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
  { href: '/kyc', label: 'KYC Verification', icon: ShieldCheck },
  { href: '/api-balances', label: 'API Balances', icon: Wifi },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/logs', label: 'Audit Logs', icon: ScrollText },
]

const Sidebar = () => {
  const pathname = usePathname()

  const handleLogout = () => {
    logout({ redirectTo: '/login' })
  }

  return (
    <div className='w-[256px] h-screen overflow-y-auto bg-white border-r border-grey-50 flex flex-col px-3 py-6 app-shell-scrollbar'>
      {/* Logo */}
      <div className='mb-8 ml-2.5 flex items-center gap-2'>
        <Link href='/overview' className='flex items-center gap-2'>
          <div className='w-[114px] h-[44px] flex items-center justify-center'>
            <Image
              src='/assets/images/logo/logo.svg'
              alt='Giftseon Admin'
              className='w-full h-full'
              width={200}
              height={80}
              priority
              loading="eager"
            />
          </div>
        </Link>
      </div>

      {/* Admin badge */}
      <div className='mb-6 ml-2.5'>
        <span className='text-xs font-semibold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full uppercase tracking-wider'>
          Admin Panel
        </span>
      </div>

      <div className='flex flex-col flex-1 gap-7'>
        {/* Navigation */}
        <nav className='px-1 flex flex-col gap-y-0.5'>
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link key={item.href} href={item.href}>
                <motion.div
                  className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-grey-600 hover:bg-grey-50'
                  }`}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId='activeIndicator'
                      className='absolute left-0 top-1 bottom-1 w-0.5 bg-primary-600 rounded-r'
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-600' : 'text-grey-500'}`} />
                  <span className='text-sm leading-[129%]'>{item.label}</span>
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className='pt-3 pb-2 border-t border-grey-50'>
          <motion.button
            className='w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-left text-grey-600 hover:bg-grey-50 hover:text-error-500 transition-colors'
            onClick={handleLogout}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className='w-4 h-4 shrink-0' />
            <span className='text-sm leading-[129%]'>Sign Out</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
