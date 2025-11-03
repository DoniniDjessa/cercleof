'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'
import { AuthLoadingScreen } from '@/components/ui/context-loaders'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'

interface UserProfile {
  id: string
  pseudo: string
  first_name: string
  last_name: string
  role: string
  phone?: string
  hire_date?: string
}

export default function Home() {
  const { user, loading } = useAuth()
  const { t } = useTheme()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  console.log('Home page: loading:', loading, 'user:', !!user, 'userProfile:', !!userProfile, 'profileLoading:', profileLoading)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      console.log('Fetching profile for user ID:', user?.id)
      const { data, error } = await supabase
        .from('dd-users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single()

      console.log('Profile fetch result:', { data, error })

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else {
        console.log('Profile found:', data)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading || profileLoading) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <AuthLoadingScreen />
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AuthLoadingScreen />
          <div className="mt-8">
            <p className="text-gray-600 mb-4">{t('loading.settingUp')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* Dashboard Cards */}
      <DashboardCards userRole={userProfile?.role} />
    </div>
  )
}