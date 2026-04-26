import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import degular from '@/assets/fonts/degular'
import georgia from '@/assets/fonts/georgia'
import QueryProvider from '@/components/Providers/QueryProvider'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'Giftseon Admin',
    template: '%s | Giftseon Admin',
  },
  description: 'Giftseon platform administration panel',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${degular.variable} ${georgia.variable} antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <Toaster
              position='top-right'
              offset={16}
              closeButton
              visibleToasts={3}
              richColors
              toastOptions={{
                classNames: {
                  toast:
                    'group rounded-[12px] border border-grey-100 bg-white text-grey-900 shadow-[0px_10px_18px_-2px_#10192812] px-4 py-3',
                  title: 'text-sm font-medium leading-[20px] text-blackish',
                  description: 'text-xs leading-[18px] text-grey-700',
                  closeButton:
                    'border border-grey-100 bg-white text-grey-500 hover:bg-grey-50 hover:text-grey-700',
                  success: 'border-success-100 bg-success-50/60 text-success-900',
                  error: 'border-error-100 bg-error-50/60 text-error-900',
                },
              }}
            />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
