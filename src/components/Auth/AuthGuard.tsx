'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  if (status === 'checking') {
    return (
      <div className='w-full h-screen flex items-center justify-center bg-grey-50'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin' />
          <span className='text-sm text-grey-500'>Loading admin panel...</span>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
