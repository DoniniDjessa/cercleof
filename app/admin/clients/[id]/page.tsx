'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { TableLoadingState, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit, Save, X, Calendar, Phone, Mail, MapPin, User, Heart } from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  preferred_contact_method?: string
  marketing_consent: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export default function ClientDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { t } = useTheme()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    preferred_contact_method: 'email',
    marketing_consent: false
  })

  useEffect(() => {
    if (params.id) {
      fetchClient()
      fetchCurrentUserRole()
    }
  }, [params.id])

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('id, role')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (error && error.code === 'PGRST116') {
        console.log('User not found in dd-users table')
        setCurrentUserRole('')
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error fetching current user role:', error)
      setCurrentUserRole('')
    }
  }

  // Check if user can edit/delete clients (admin, manager, superadmin)
  const canEditClients = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-clients')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setClient(data)
      
      // Populate form data
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        date_of_birth: data.date_of_birth || '',
        gender: data.gender || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'France',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        notes: data.notes || '',
        preferred_contact_method: data.preferred_contact_method || 'email',
        marketing_consent: data.marketing_consent || false
      })
    } catch (error) {
      console.error('Error fetching client:', error)
      toast.error('Error fetching client')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateClient = async () => {
    if (!canEditClients) {
      toast.error('You do not have permission to edit clients')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('dd-clients')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (error) throw error
      
      setEditing(false)
      fetchClient()
      toast.success('Client updated successfully!')
    } catch (error) {
      console.error('Error updating client:', error)
      toast.error('Error updating client: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleClientStatus = async () => {
    if (!client) return
    
    try {
      const { error } = await supabase
        .from('dd-clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id)

      if (error) throw error
      fetchClient()
      toast.success(`Client ${!client.is_active ? 'activated' : 'deactivated'} successfully!`)
    } catch (error) {
      console.error('Error updating client status:', error)
      toast.error('Error updating client status')
    }
  }

  const deleteClient = async () => {
    if (!client || !canEditClients) {
      toast.error('You do not have permission to delete clients')
      return
    }

    if (!confirm(`Are you sure you want to delete client ${client.first_name} ${client.last_name}? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-clients')
        .delete()
        .eq('id', client.id)

      if (error) throw error
      toast.success('Client deleted successfully!')
      router.push('/admin/clients')
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Error deleting client')
    }
  }

  if (loading) {
    return <TableLoadingState />
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Client Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">The client you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/admin/clients')}>
          Back to Clients
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/clients')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Clients</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Client Details
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={toggleClientStatus}
            className={client.is_active ? 'text-red-600 border-red-200 hover:border-red-300' : 'text-green-600 border-green-200 hover:border-green-300'}
          >
            {client.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          {canEditClients && !editing ? (
            <Button onClick={() => setEditing(true)} className="flex items-center space-x-2">
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          ) : canEditClients && editing ? (
            <div className="flex space-x-2">
              <Button onClick={handleUpdateClient} disabled={loading} className="flex items-center space-x-2">
                {loading ? <ButtonLoadingSpinner /> : <Save className="w-4 h-4" />}
                <span>Save</span>
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="flex items-center space-x-2">
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </Button>
            </div>
          ) : null}
          {canEditClients && (
            <Button
              variant="outline"
              onClick={deleteClient}
              className="text-red-600 border-red-200 hover:border-red-300"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Client Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Personal Information */}
        <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.1}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Personal Information</span>
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">First Name</Label>
                  {editing ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{client.first_name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Last Name</Label>
                  {editing ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{client.last_name}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Date of Birth</Label>
                  {editing ? (
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : '-'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Gender</Label>
                  {editing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white"
                    >
                      <option value="">Select gender</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white capitalize">{client.gender || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Contact Information */}
        <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.2}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Contact Information</span>
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Email</Label>
                {editing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.email || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Phone</Label>
                {editing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.phone || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Preferred Contact Method</Label>
                {editing ? (
                  <select
                    value={formData.preferred_contact_method}
                    onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white capitalize">{client.preferred_contact_method || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Address Information */}
        <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.3}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Address Information</span>
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Address</Label>
                {editing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.address || '-'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">City</Label>
                  {editing ? (
                    <Input
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{client.city || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Postal Code</Label>
                  {editing ? (
                    <Input
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{client.postal_code || '-'}</p>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Country</Label>
                {editing ? (
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.country || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </AnimatedCard>

        {/* Emergency Contact & Notes */}
        <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.4}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
              <Heart className="w-5 h-5" />
              <span>Emergency Contact & Notes</span>
            </h2>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Emergency Contact Name</Label>
                {editing ? (
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.emergency_contact_name || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Emergency Contact Phone</Label>
                {editing ? (
                  <Input
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{client.emergency_contact_phone || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-gray-700 dark:text-gray-300">Notes</Label>
                {editing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="flex w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm ring-offset-background text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{client.notes || '-'}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="marketing_consent"
                  checked={formData.marketing_consent}
                  onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                  disabled={!editing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="marketing_consent" className="text-gray-700 dark:text-gray-300">
                  Marketing consent
                </Label>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Future: Transactions and Appointments */}
      <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.5}>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Transactions & Appointments</span>
          </h2>
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This section will display client transactions and appointments in future updates.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Features coming soon:
            </div>
            <ul className="text-sm text-gray-500 dark:text-gray-500 mt-2 space-y-1">
              <li>• Service history</li>
              <li>• Payment records</li>
              <li>• Appointment history</li>
              <li>• Loyalty points</li>
            </ul>
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
