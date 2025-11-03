'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnimatedCard } from '@/components/ui/animated-card'
import { PageTransition } from '@/components/ui/page-transition'
import { ProfileSetupLoading, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function SetupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pseudo: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'superadmin'
  })

  const handleCreateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from('dd-users')
        .select('*')
        .eq('auth_user_id', user?.id)
        .single()

      if (existingProfile) {
        toast.error('You already have a profile!')
        router.push('/')
        return
      }

      // Create user profile
      const { error } = await supabase
        .from('dd-users')
        .insert({
          auth_user_id: user?.id,
          email: user?.email,
          pseudo: formData.pseudo,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || null,
          role: formData.role,
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Superadmin profile created successfully!')
      router.push('/')
    } catch (error) {
      console.error('Error creating admin profile:', error)
      toast.error('Error creating profile: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Please log in first</div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <AnimatedCard className="w-full max-w-md" delay={0.2}>
          <div className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Setup Your Profile</h1>
              <p className="mt-2 text-gray-600">
                Complete your superadmin profile to access the system
              </p>
            </div>

            <form onSubmit={handleCreateAdminProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Read-only)</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pseudo">Username *</Label>
                <Input
                  id="pseudo"
                  type="text"
                  placeholder="Choose a unique username"
                  value={formData.pseudo}
                  onChange={(e) => setFormData({ ...formData, pseudo: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="superadmin">Super Admin</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <ButtonLoadingSpinner /> : 'Create Superadmin Profile'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>This will create your superadmin profile in the system</p>
            </div>
          </div>
        </AnimatedCard>
      </div>
    </PageTransition>
  )
}
