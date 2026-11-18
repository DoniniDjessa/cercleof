'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { VoiceNavigationButton } from '@/components/ai/voice-navigation-button'
import { cn } from '@/lib/utils'

interface MainLayoutProps {
  children: React.ReactNode
}

const COLLAPSE_KEY = 'sidebar-collapsed'

export function MainLayout({ children }: MainLayoutProps) {
  // Desktop: full sidebar or icon rail (remembered). Mobile: drawer over the page.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') setIsSidebarCollapsed(true)
    } catch { /* storage unavailable */ }
  }, [])

  // Close the mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0') } catch { /* private mode */ }
      return next
    })
  }

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen(open => !open)
    else toggleSidebar()
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--bg-body))]">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[35] bg-black/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={cn('app-main', isSidebarCollapsed && 'is-collapsed')}>
        <Navbar onMenuClick={handleMenuClick} isSidebarCollapsed={isSidebarCollapsed} />
        <main id="main-content" className="app-content">
          <div key={pathname} className="rise">
            {children}
          </div>
        </main>
      </div>

      {/* Voice Navigation Button - Only shows when enabled */}
      <VoiceNavigationButton />
    </div>
  )
}
