"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AnimatedButton } from '@/components/ui/animated-button'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { AddPromotion } from '@/components/promotions/add-promotion'
import { X } from 'lucide-react'
import { 
  Tag, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar,
  Percent,
  DollarSign,
  Users,
  Package
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Promotion {
  id: string
  name: string
  description: string
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping'
  value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  start_date: string
  end_date: string
  is_active: boolean
  applicable_to: 'all' | 'products' | 'services' | 'specific_items'
  usage_limit?: number
  usage_count: number
  created_at: string
}

export default function PromotionsPage() {
  const { user: authUser } = useAuth()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  const searchParams = useSearchParams()

  // Check if user can manage promotions (admin, manager, superadmin)
  const canManagePromotions = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  useEffect(() => {
    fetchCurrentUserRole()
  }, [authUser])

  const fetchCurrentUserRole = async () => {
    try {
      if (!authUser?.id) {
        setCheckingRole(false)
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current user role:', error)
        setCurrentUserRole('')
        setCheckingRole(false)
        return
      }

      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error:', error)
      setCurrentUserRole('')
    } finally {
      setCheckingRole(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchPromotions()
  }, [currentPage])

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-promotions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching promotions:', error)
        toast.error('Erreur lors du chargement des promotions')
        return
      }

      setPromotions(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des promotions')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-promotions')
        .delete()
        .eq('id', promotionId)

      if (error) {
        console.error('Error deleting promotion:', error)
        toast.error('Erreur lors de la suppression')
        return
      }

      toast.success('Promotion supprimée avec succès')
      fetchPromotions()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="h-4 w-4" />
      case 'fixed_amount': return <DollarSign className="h-4 w-4" />
      case 'buy_x_get_y': return <Package className="h-4 w-4" />
      case 'free_shipping': return <Package className="h-4 w-4" />
      default: return <Tag className="h-4 w-4" />
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'percentage': return 'Pourcentage'
      case 'fixed_amount': return 'Montant fixe'
      case 'buy_x_get_y': return 'Achetez X, obtenez Y'
      case 'free_shipping': return 'Livraison gratuite'
      default: return type
    }
  }

  const getStatusColor = (isActive: boolean, startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (!isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    if (now < start) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (now > end) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
  }

  const getStatusText = (isActive: boolean, startDate: string, endDate: string) => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (!isActive) return 'Inactive'
    if (now < start) return 'Programmée'
    if (now > end) return 'Expirée'
    return 'Active'
  }

  const filteredPromotions = promotions.filter(promotion =>
    promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    promotion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getTypeText(promotion.type).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: promotions.length,
    active: promotions.filter(p => {
      const now = new Date()
      const start = new Date(p.start_date)
      const end = new Date(p.end_date)
      return p.is_active && now >= start && now <= end
    }).length,
    scheduled: promotions.filter(p => {
      const now = new Date()
      const start = new Date(p.start_date)
      return p.is_active && now < start
    }).length,
    expired: promotions.filter(p => {
      const now = new Date()
      const end = new Date(p.end_date)
      return now > end
    }).length
  }

  if (checkingRole || loading) {
    return <ButtonLoadingSpinner />
  }

  // Access control: only admins and managers can access this page
  if (!canManagePromotions) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accès Interdit</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                Seuls les administrateurs et les managers peuvent gérer les promotions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {showCreateForm ? (
        <AddPromotion 
          onPromotionCreated={() => {
            fetchPromotions()
            setShowCreateForm(false)
            // Clear URL parameters
            window.history.replaceState({}, '', '/admin/promotions')
          }}
          onCancel={() => {
            setShowCreateForm(false)
            // Clear URL parameters
            window.history.replaceState({}, '', '/admin/promotions')
          }}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Promotions</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gérez toutes les promotions et offres spéciales
              </p>
            </div>
            {canManagePromotions && (
              <AnimatedButton
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Promotion
              </AnimatedButton>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Tag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actives</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Programmées</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <Calendar className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Expirées</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.expired}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher des promotions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Promotions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Liste des Promotions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Utilisations</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPromotions.map((promotion) => (
                      <TableRow key={promotion.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{promotion.name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {promotion.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(promotion.type)}
                            <span className="text-sm">{getTypeText(promotion.type)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {promotion.type === 'percentage' 
                              ? `${promotion.value}%`
                              : `${promotion.value.toLocaleString()} XOF`
                            }
                          </div>
                          {promotion.min_purchase_amount && (
                            <div className="text-xs text-gray-500">
                              Min: {promotion.min_purchase_amount.toLocaleString()} XOF
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(promotion.start_date).toLocaleDateString('fr-FR')}</div>
                            <div className="text-gray-500">
                              au {new Date(promotion.end_date).toLocaleDateString('fr-FR')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(promotion.is_active, promotion.start_date, promotion.end_date)}>
                            {getStatusText(promotion.is_active, promotion.start_date, promotion.end_date)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {promotion.usage_count}
                            {promotion.usage_limit && (
                              <span className="text-gray-500"> / {promotion.usage_limit}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canManagePromotions && (
                              <>
                                <Button size="sm" variant="outline">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDeletePromotion(promotion.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
