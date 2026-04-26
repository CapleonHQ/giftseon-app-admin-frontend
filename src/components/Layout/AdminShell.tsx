'use client'

import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

type AdminShellProps = {
  children: ReactNode
  pageTitle: string
}

const AdminShell = ({ children, pageTitle }: AdminShellProps) => {
  return (
    <div className='w-full h-screen bg-grey-50 text-blackish flex overflow-hidden'>
      {/* Sidebar */}
      <div className='hidden lg:flex shrink-0'>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className='flex flex-col flex-1 min-w-0 overflow-hidden'>
        <Header pageTitle={pageTitle} />
        <div className='flex-1 overflow-y-auto app-shell-scrollbar'>
          <div className='w-full min-h-full px-6 py-6'>
            <div className='w-full max-w-[1440px] mx-auto min-h-full'>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminShell
