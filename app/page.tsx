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

  // Show loading screen only if auth is still loading
  // Don't block if we have a user but profile is still loading
  if (loading) {
    return <AuthLoadingScreen />
  }

  // If no user after auth loads, show loading (will redirect via AuthContext)
  if (!user) {
    return <AuthLoadingScreen />
  }

  // If we have a user but profile is still loading, show dashboard with loading state
  // Don't block the entire page - let the user see the dashboard
  if (profileLoading) {
    return (
      <div className="space-y-8">
        <DashboardCards userRole={undefined} />
      </div>
    )
  }

  // If we have a user but no profile, don't block - might be temporary
  // Show dashboard anyway - AuthContext will handle disconnection if needed
  if (!userProfile) {
    return (
      <div className="space-y-8">
        <DashboardCards userRole={undefined} />
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