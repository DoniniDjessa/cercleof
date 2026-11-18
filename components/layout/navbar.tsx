'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardYear } from '@/contexts/DashboardYearContext'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ThemeToggle, LanguageToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase'
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  ChevronDown,
  LogOut,
  CalendarDays,
} from 'lucide-react'

interface NavbarProps {
  onMenuClick: () => void
  isSidebarCollapsed: boolean
}

export function Navbar({ onMenuClick, isSidebarCollapsed }: NavbarProps) {
  const { t } = useTheme()
  const { user, signOut } = useAuth()
  const { selectedYear, setSelectedYear, availableYears, loadingYears } = useDashboardYear()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [userProfile, setUserProfile] = useState<{ pseudo?: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    } else {
      setUserProfile(null)
      setLoading(false)
    }
  }, [user])

  const fetchUserProfile = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dd-users')
        .select('pseudo, email')
        .eq('auth_user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setLoading(false)
        return
      }

      if (error) {
        console.error('Navbar: Error fetching user profile:', error)
        setLoading(false)
        return
      }

      if (!data || (!data.pseudo && !data.email)) {
        setLoading(false)
        return
      }

      if (data.pseudo || data.email) {
        setUserProfile(data)
        setLoading(false)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Navbar: Exception fetching user profile:', error)
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false)
      await signOut()
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
    } catch (error) {
      console.error('Navbar: Error in handleSignOut:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  const displayName = (() => {
    if (loading && !userProfile && !user?.email) return 'Chargement...'
    return userProfile?.pseudo || userProfile?.email || user?.email?.split('@')[0] || user?.email || 'Utilisateur'
  })()
  const subtitle = userProfile
    ? `Travail sur ${userProfile.pseudo || userProfile.email}`
    : loading && !user?.email ? 'Chargement...' : t('nav.online')

  // Close the user menu on outside click / Escape
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showUserMenu) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowUserMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [showUserMenu])

  return (
    <header className="app-topbar">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label={isSidebarCollapsed ? 'Ouvrir le menu' : 'Menu'}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={t('nav.search')} className="h-9 w-full bg-muted pl-9 border-transparent focus:bg-card" />
      </div>
      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Dashboard year */}
        <div className="flex items-center gap-1.5">
          <CalendarDays className="hidden h-4 w-4 text-muted-foreground sm:block" />
          <Select
            value={String(selectedYear)}
            onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
            disabled={loadingYears}
          >
            <SelectTrigger className="h-9 w-[92px]" aria-label="Année">
              <SelectValue placeholder="Année" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />

        <ThemeToggle />
        <div className="hidden sm:block"><LanguageToggle /></div>

        <a
          href="/admin/notifications"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[rgb(var(--color-brand-pink))] ring-2 ring-[rgb(var(--bg-topbar))]" />
        </a>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted"
          >
            <span className="avatar avatar-sm">{displayName.charAt(0).toUpperCase()}</span>
            <span className="hidden min-w-0 text-left md:block">
              <span className="block max-w-[140px] truncate text-xs font-bold text-foreground">{displayName}</span>
              <span className="block max-w-[140px] truncate text-[11px] text-muted-foreground">{subtitle}</span>
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', showUserMenu && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="app-card absolute right-0 z-50 mt-2 w-60 overflow-hidden p-0 shadow-[var(--shadow-pop)]"
              >
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <span className="avatar avatar-md">{displayName.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
                    {userProfile?.pseudo && userProfile?.email && (
                      <p className="truncate text-[11px] text-muted-foreground">{userProfile.email}</p>
                    )}
                  </div>
                </div>

                <div className="p-1">
                  <button type="button" role="menuitem" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {t('nav.profile')}
                  </button>
                  <button type="button" role="menuitem" className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('nav.settings')}
                  </button>
                  <div className="flex items-center justify-between rounded-md px-3 py-1.5 sm:hidden">
                    <span className="text-sm font-semibold text-foreground">Langue</span>
                    <LanguageToggle />
                  </div>
                </div>

                <div className="border-t border-border p-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.signOut')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
