'use client'

import { useState, type SyntheticEvent } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setAccessToken, setRefreshToken } from '@/api/token'
import { useAuth } from '@/context/AuthContext'
import { loginAdmin } from '@/api/services/auth'
import type { AdminProfile } from '@/types/Admin'

const STORAGE_KEY = 'gifteon_admin:auth:v1'

const LoginPage = () => {
  const router = useRouter()
  const { refreshAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: SyntheticEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setIsLoading(true)

    try {
      const { accessToken, refreshToken, admin } = await loginAdmin({ email, password })

      setAccessToken(accessToken)
      setRefreshToken(refreshToken)

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: 1, admin, lastVerifiedAt: Date.now() }),
      )

      await refreshAdmin()
      router.push('/overview')
    } catch (err: any) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-base-bg flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='flex flex-col items-center mb-8'
        >
          <div className='w-[140px] h-[54px] mb-6'>
            <Image
              src='/assets/images/logo/logo.svg'
              alt='Giftseon'
              width={200}
              height={80}
              className='w-full h-full'
            />
          </div>
          <div className='flex items-center gap-2 mb-2'>
            <ShieldCheck className='w-5 h-5 text-primary-500' />
            <h1 className='text-xl font-semibold text-grey-900'>Admin Panel</h1>
          </div>
          <p className='text-sm text-grey-500'>Sign in to manage the Giftseon platform</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className='bg-white rounded-2xl border border-grey-100 shadow-[0px_8px_24px_-4px_#10192810] p-8'
        >
          <form onSubmit={handleLogin} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-grey-700'>Email address</label>
              <Input
                type='email'
                placeholder='captain@giftseon.com'
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                disabled={isLoading}
                autoComplete='email'
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <label className='text-sm font-medium text-grey-700'>Password</label>
              <div className='relative'>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  disabled={isLoading}
                  autoComplete='current-password'
                  className='pr-10'
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className='bg-error-50 border border-error-100 text-error-700 text-sm rounded-lg px-3 py-2.5'
              >
                {error}
              </motion.div>
            )}

            <Button type='submit' className='w-full mt-2 h-11' disabled={isLoading}>
              {isLoading ? (
                <span className='flex items-center gap-2'>
                  <span className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage
