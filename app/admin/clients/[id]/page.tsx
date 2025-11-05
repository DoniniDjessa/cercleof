'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableLoadingState, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Edit, Save, X, Calendar, Phone, Mail, MapPin, User, Heart, DollarSign, ShoppingBag, Star, Palette, Sparkles, TrendingUp, Clock, Tag } from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  date_of_birth?: string
  birth_date?: string
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
  // Additional fields from comprehensive schema
  skin_type?: string
  hair_type?: string
  nail_type?: string
  allergies?: string
  product_preferences?: string
  brand_preferences?: string
  loyalty_level?: string
  total_spent?: number
  average_purchase?: number
  last_visit_date?: string
  next_visit_date?: string
  favorite_categories?: string[]
  acquisition_channel?: string
  internal_status?: string
  satisfaction_rating?: number
}

interface SaleStats {
  totalSales: number
  totalPurchases: number
  lastPurchaseDate: string | null
  averagePurchase: number
  mostPurchasedProducts: Array<{ name: string; count: number; total: number }>
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
  const [saleStats, setSaleStats] = useState<SaleStats | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    birth_date: '',
    gender: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    preferred_contact_method: 'email',
    marketing_consent: false,
    skin_type: '',
    hair_type: '',
    nail_type: '',
    allergies: '',
    product_preferences: '',
    brand_preferences: '',
    loyalty_level: 'bronze',
    acquisition_channel: ''
  })

  useEffect(() => {
    if (params.id) {
      fetchClient()
      fetchCurrentUserRole()
      fetchSaleStats()
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

  const fetchSaleStats = async () => {
    if (!params.id) return
    
    try {
      // Fetch sales for this client
      const { data: sales, error } = await supabase
        .from('dd-ventes')
        .select('id, total_net, date')
        .eq('client_id', params.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching sales:', error)
        return
      }

      const totalSales = (sales || []).reduce((sum: number, sale: any) => sum + (sale.total_net || 0), 0)
      const totalPurchases = sales?.length || 0
      const lastPurchaseDate = sales && sales.length > 0 ? sales[0].date : null
      const averagePurchase = totalPurchases > 0 ? totalSales / totalPurchases : 0

      // Fetch sale items separately to get product information
      const saleIds = sales?.map((sale: any) => sale.id) || []
      let productCounts: Record<string, { count: number; total: number; name: string }> = {}
      
      if (saleIds.length > 0) {
        const { data: saleItems, error: itemsError } = await supabase
          .from('dd-ventes-items')
          .select('product_id, quantity, prix_unitaire, vente_id')
          .in('vente_id', saleIds)

        if (!itemsError && saleItems) {
          // Fetch product names
          const productIds = [...new Set(saleItems.map((item: any) => item.product_id).filter(Boolean))]
          if (productIds.length > 0) {
            const { data: products } = await supabase
              .from('dd-products')
              .select('id, name')
              .in('id', productIds)

            const productMap = new Map((products || []).map((p: any) => [p.id, p.name]))
            
            saleItems.forEach((item: any) => {
              if (item.product_id) {
                const productName = productMap.get(item.product_id) || 'Unknown Product'
                if (!productCounts[productName]) {
                  productCounts[productName] = { count: 0, total: 0, name: productName }
                }
                productCounts[productName].count += item.quantity || 1
                productCounts[productName].total += (item.prix_unitaire || 0) * (item.quantity || 1)
              }
            })
          }
        }
      }

      const mostPurchasedProducts = Object.values(productCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      setSaleStats({
        totalSales,
        totalPurchases,
        lastPurchaseDate,
        averagePurchase,
        mostPurchasedProducts
      })
    } catch (error) {
      console.error('Error fetching sale stats:', error)
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
        date_of_birth: data.date_of_birth || data.birth_date || '',
        birth_date: data.birth_date || data.date_of_birth || '',
        gender: data.gender || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'France',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        notes: data.notes || '',
        preferred_contact_method: data.preferred_contact_method || 'email',
        marketing_consent: data.marketing_consent || false,
        skin_type: data.skin_type || '',
        hair_type: data.hair_type || '',
        nail_type: data.nail_type || '',
        allergies: data.allergies || '',
        product_preferences: data.product_preferences || '',
        brand_preferences: data.brand_preferences || '',
        loyalty_level: data.loyalty_level || 'bronze',
        acquisition_channel: data.acquisition_channel || ''
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

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const getLoyaltyBadgeColor = (level?: string) => {
    switch (level) {
      case 'platinum': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'gold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'silver': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      default: return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    }
  }

  if (loading) {
    return <TableLoadingState />
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Client Not Found</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">The client you're looking for doesn't exist.</p>
        <Button onClick={() => router.push('/admin/clients')}>
          Back to Clients
        </Button>
      </div>
    )
  }

  const age = calculateAge(client.date_of_birth || client.birth_date)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/clients')}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="text-xs">Back</span>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {client.first_name} {client.last_name}
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Client Details
            </p>
          </div>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleClientStatus}
            className={client.is_active ? 'text-red-600 border-red-200 hover:border-red-300 text-xs' : 'text-green-600 border-green-200 hover:border-green-300 text-xs'}
          >
            {client.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          {canEditClients && !editing ? (
            <Button size="sm" onClick={() => setEditing(true)} className="flex items-center space-x-1 text-xs">
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </Button>
          ) : canEditClients && editing ? (
            <div className="flex space-x-1">
              <Button size="sm" onClick={handleUpdateClient} disabled={loading} className="flex items-center space-x-1 text-xs">
                {loading ? <ButtonLoadingSpinner /> : <Save className="w-3 h-3" />}
                <span>Save</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="flex items-center space-x-1 text-xs">
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </Button>
            </div>
          ) : null}
          {canEditClients && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteClient}
              className="text-red-600 border-red-200 hover:border-red-300 text-xs"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Payé</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {saleStats?.totalSales ? saleStats.totalSales.toFixed(2) : client.total_spent?.toFixed(2) || '0.00'} XOF
                </p>
              </div>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Dernier Achat</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {saleStats?.lastPurchaseDate 
                    ? new Date(saleStats.lastPurchaseDate).toLocaleDateString()
                    : client.last_visit_date 
                      ? new Date(client.last_visit_date).toLocaleDateString()
                      : 'Jamais'}
                </p>
              </div>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Niveau Fidélité</p>
                <Badge className={`text-xs ${getLoyaltyBadgeColor(client.loyalty_level)}`}>
                  {client.loyalty_level ? client.loyalty_level.charAt(0).toUpperCase() + client.loyalty_level.slice(1) : 'Bronze'}
                </Badge>
              </div>
              <Star className="w-4 h-4 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Achats Totaux</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {saleStats?.totalPurchases || 0}
                </p>
              </div>
              <ShoppingBag className="w-4 h-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Purchased - Moved to top */}
      {saleStats && saleStats.mostPurchasedProducts.length > 0 && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Tag className="w-4 h-4" />
              <span>Produits les Plus Achetés</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {saleStats.mostPurchasedProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900">{idx + 1}</Badge>
                    <span className="text-gray-900 dark:text-white font-medium">{product.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">{product.count}x</Badge>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">{product.total.toFixed(2)} XOF</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Personal Information */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Informations Personnelles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Prénom</Label>
                {editing ? (
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white">{client.first_name}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Nom</Label>
                {editing ? (
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white">{client.last_name}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Date de Naissance</Label>
                {editing ? (
                  <Input
                    type="date"
                    value={formData.date_of_birth || formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value, birth_date: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white">
                    {client.date_of_birth || client.birth_date 
                      ? `${new Date(client.date_of_birth || client.birth_date || '').toLocaleDateString()}${age ? ` (${age} ans)` : ''}`
                      : '-'}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Sexe</Label>
                {editing ? (
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="flex h-8 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="">Sélectionner</option>
                    <option value="female">Femme</option>
                    <option value="male">Homme</option>
                    <option value="other">Autre</option>
                  </select>
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white capitalize">{client.gender || '-'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Email</Label>
              {editing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.email || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Téléphone</Label>
              {editing ? (
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.phone || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Méthode de Contact Préférée</Label>
              {editing ? (
                <select
                  value={formData.preferred_contact_method}
                  onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                  className="flex h-8 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                >
                  <option value="email">Email</option>
                  <option value="phone">Téléphone</option>
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              ) : (
                <p className="text-xs text-gray-900 dark:text-white capitalize">{client.preferred_contact_method || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Beauty Profile */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span>Profil Beauté</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Type de Peau</Label>
              {editing ? (
                <Input
                  value={formData.skin_type}
                  onChange={(e) => setFormData({ ...formData, skin_type: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: Sèche, Grasse, Mixte, Sensible"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.skin_type || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Type de Cheveux</Label>
              {editing ? (
                <Input
                  value={formData.hair_type}
                  onChange={(e) => setFormData({ ...formData, hair_type: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: Lisses, Bouclés, Crépus"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.hair_type || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Type d'Ongles</Label>
              {editing ? (
                <Input
                  value={formData.nail_type}
                  onChange={(e) => setFormData({ ...formData, nail_type: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: Naturels, Manucure, Ongles en gel"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.nail_type || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Allergies</Label>
              {editing ? (
                <Input
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Liste des allergies"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.allergies || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preferences & Stats */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Préférences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Préférences Produits</Label>
              {editing ? (
                <Input
                  value={formData.product_preferences}
                  onChange={(e) => setFormData({ ...formData, product_preferences: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: Produits bio, naturels"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.product_preferences || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Marques Préférées</Label>
              {editing ? (
                <Input
                  value={formData.brand_preferences}
                  onChange={(e) => setFormData({ ...formData, brand_preferences: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: L'Oréal, Garnier"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.brand_preferences || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Catégories Préférées</Label>
              {client.favorite_categories && client.favorite_categories.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {client.favorite_categories.map((cat, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">{cat}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">-</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Canal d'Acquisition</Label>
              {editing ? (
                <Input
                  value={formData.acquisition_channel}
                  onChange={(e) => setFormData({ ...formData, acquisition_channel: e.target.value })}
                  className="h-8 text-xs"
                  placeholder="Ex: Bouche à oreille, Instagram"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.acquisition_channel || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Adresse</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Adresse</Label>
              {editing ? (
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.address || '-'}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Ville</Label>
                {editing ? (
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white">{client.city || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Code Postal</Label>
                {editing ? (
                  <Input
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="h-8 text-xs"
                  />
                ) : (
                  <p className="text-xs text-gray-900 dark:text-white">{client.postal_code || '-'}</p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Pays</Label>
              {editing ? (
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.country || '-'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact & Notes */}
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Heart className="w-4 h-4" />
              <span>Contact d'Urgence & Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Nom Contact Urgence</Label>
              {editing ? (
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.emergency_contact_name || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Téléphone Contact Urgence</Label>
              {editing ? (
                <Input
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white">{client.emergency_contact_phone || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-gray-700 dark:text-gray-300">Notes</Label>
              {editing ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="flex w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-xs text-gray-900 dark:text-white whitespace-pre-wrap">{client.notes || '-'}</p>
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
              <Label htmlFor="marketing_consent" className="text-xs text-gray-700 dark:text-gray-300">
                Consentement Marketing
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Sales Statistics */}
      {saleStats && (
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Statistiques d'Achat</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Achat Moyen</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {saleStats.averagePurchase.toFixed(2)} XOF
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Achats</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {saleStats.totalPurchases}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
