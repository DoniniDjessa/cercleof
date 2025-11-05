'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle, LanguageToggle } from '@/components/ui/theme-toggle'
import { createClient } from '@/lib/supabase'
import { 
  Search, 
  Bell, 
  Menu, 
  User, 
  Settings,
  ChevronDown,
  LogOut
} from 'lucide-react'

interface NavbarProps {
  onMenuClick: () => void
  isSidebarCollapsed: boolean
}

export function Navbar({ onMenuClick, isSidebarCollapsed }: NavbarProps) {
  const { t } = useTheme()
  const { user, signOut } = useAuth()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Debug: Log when userProfile changes
  useEffect(() => {
    console.log('Navbar: userProfile state changed:', userProfile)
  }, [userProfile])

  const fetchUserProfile = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const supabase = createClient()
      console.log('Navbar: Fetching profile for auth_user_id:', user.id)
      const { data, error } = await supabase
        .from('dd-users')
        .select('pseudo, email')
        .eq('auth_user_id', user.id)
        .single()

      console.log('Navbar: Query result - data:', data, 'error:', error)

      if (error && error.code === 'PGRST116') {
        // User not found in dd-users - don't disconnect immediately, might be a network issue
        console.log('Navbar: User not found in dd-users, but continuing (might be network issue)')
        setLoading(false)
        // Don't disconnect - let AuthContext handle it
        return
      }

      if (error) {
        console.error('Navbar: Error fetching user profile:', error)
        setLoading(false)
        // Keep userProfile null, will use user.email as fallback
        // Don't disconnect on error - might be a network issue
        return
      }

      // Check if data exists and has pseudo or email
      if (!data || (!data.pseudo && !data.email)) {
        console.log('Navbar: User has no pseudo or email, but continuing (might be temporary)')
        setLoading(false)
        // Don't disconnect immediately - might be a temporary issue
        // Let AuthContext handle verification
        return
      }

      // User has valid pseudo or email - set profile
      console.log('Navbar: Profile data received:', JSON.stringify(data, null, 2))
      console.log('Navbar: Pseudo:', data.pseudo, '(type:', typeof data.pseudo, ')')
      console.log('Navbar: Email:', data.email, '(type:', typeof data.email, ')')
      
      // Verify data structure
      if (data.pseudo || data.email) {
        console.log('Navbar: Setting userProfile with pseudo/email')
        setUserProfile(data)
        setLoading(false)
      } else {
        console.error('Navbar: Data received but no pseudo or email:', data)
        setLoading(false)
      }
    } catch (error) {
      console.error('Navbar: Exception fetching user profile:', error)
      setLoading(false)
    }
  }

  const getUserDisplayName = () => {
    console.log('Navbar: getUserDisplayName called - userProfile:', userProfile)
    // Prefer profile pseudo/email, fallback to auth user email
    if (userProfile) {
      const displayName = userProfile.pseudo || userProfile.email || null
      console.log('Navbar: Display name from profile:', displayName)
      return displayName
    }
    // Fallback to auth user email while loading
    const fallback = user?.email?.split('@')[0] || null
    console.log('Navbar: Fallback to auth email:', fallback)
    return fallback
  }

  const handleSignOut = async () => {
    try {
      setShowUserMenu(false)
      console.log('Navbar: handleSignOut called, user:', user)
      await signOut()
      // Ensure redirect even if signOut doesn't redirect
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 100)
      }
    } catch (error) {
      console.error('Navbar: Error in handleSignOut:', error)
      // Force redirect on error
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 w-full border-b-0 shadow-sm bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-md transition-colors duration-300"
    >
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left side - Menu button and search */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Search bar - hidden on mobile */}
          <div className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('nav.search')}
                className="pl-10 w-64 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Right side - Notifications, theme controls, and user menu */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="h-1.5 w-1.5 bg-white rounded-full"></span>
            </span>
          </Button>

          {/* Theme and Language toggles */}
          <div className="hidden sm:flex items-center space-x-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>

          {/* User menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 h-9 px-3 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-pink-300 to-pink-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {(() => {
                    // Show loading only if we don't have any data yet
                    if (loading && !userProfile && !user?.email) {
                      return 'Chargement...'
                    }
                    // Prefer profile data, fallback to auth user email
                    return userProfile?.pseudo || userProfile?.email || user?.email?.split('@')[0] || user?.email || 'Utilisateur'
                  })()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile 
                    ? `Travail sur ${userProfile.pseudo || userProfile.email}` 
                    : (loading && !user?.email ? 'Chargement...' : t('nav.online'))}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </Button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-sm border-0 py-1 z-50"
              >
                <div className="px-4 py-3 border-b-0 shadow-sm">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {(() => {
                      // Show loading only if we don't have any data yet
                      if (loading && !userProfile && !user?.email) {
                        return 'Chargement...'
                      }
                      // Prefer profile data, fallback to auth user email
                      return userProfile?.pseudo || userProfile?.email || user?.email?.split('@')[0] || user?.email || 'Utilisateur'
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {userProfile 
                      ? `Travail sur ${userProfile.pseudo || userProfile.email}` 
                      : (loading && !user?.email ? 'Chargement...' : t('nav.online'))}
                  </p>
                  {userProfile?.pseudo && userProfile?.email && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {userProfile.email}
                    </p>
                  )}
                </div>
                
                <div className="py-1">
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <User className="h-4 w-4 mr-3" />
                    {t('nav.profile')}
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Settings className="h-4 w-4 mr-3" />
                    {t('nav.settings')}
                  </button>
                </div>
                
                <div className="border-t-0 shadow-sm py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {t('nav.signOut')}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('nav.search')}
            className="pl-10 w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>
    </motion.header>
  )
}
