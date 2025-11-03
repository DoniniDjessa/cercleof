'use client'

import { usePathname } from 'next/navigation'
import { MainLayout } from './main-layout'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  
  // Don't show sidebar on login page
  const isLoginPage = pathname === '/login'
  
  if (isLoginPage) {
    return <>{children}</>
  }
  
  return <MainLayout>{children}</MainLayout>
}
