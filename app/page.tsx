'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { AuthLoadingScreen } from '@/components/ui/context-loaders'
import { createClient } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'
import { AnalysePage } from '@/components/dashboard/analyse-page'
import { DetailsPage } from '@/components/dashboard/details-page'

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
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user])

  const fetchUserProfile = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dd-users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <AuthLoadingScreen />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
          <TabsTrigger value="dashboard" className="text-xs">
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger value="analyse" className="text-xs">
            Analyse
          </TabsTrigger>
          <TabsTrigger value="details" className="text-xs">
            Détails
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <DashboardOverview userRole={userProfile?.role} />
        </TabsContent>

        <TabsContent value="analyse" className="mt-0">
          <AnalysePage userRole={userProfile?.role} />
        </TabsContent>

        <TabsContent value="details" className="mt-0">
          <DetailsPage userRole={userProfile?.role} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
