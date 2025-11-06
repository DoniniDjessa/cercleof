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
import { AddGiftCard } from '@/components/gift-cards/add-gift-card'
import { 
  Gift, 
  Search, 
  Plus, 
  Eye, 
  Trash2, 
  Calendar,
  DollarSign,
  CreditCard,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface GiftCard {
  id: string
  code: string
  initial_amount: number
  current_balance: number
  client_id?: string
  purchased_by?: string
  purchase_date: string
  expiry_date?: string
  status: 'active' | 'used' | 'expired' | 'cancelled'
  notes?: string
  created_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  purchaser?: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function GiftCardsPage() {
  const { user: authUser } = useAuth()
  const [giftCards, setGiftCards] = useState<GiftCard[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  const searchParams = useSearchParams()

  // Check if user can manage gift cards (admin, manager, superadmin)
  const canManageGiftCards = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

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
    fetchGiftCards()
  }, [currentPage])

  const fetchGiftCards = async () => {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Fetch gift cards first
      const { data: giftCardsData, error, count } = await supabase
        .from('dd-gift-cards')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching gift cards:', error)
        toast.error('Erreur lors du chargement des cartes cadeaux')
        return
      }

      if (!giftCardsData || giftCardsData.length === 0) {
        setGiftCards([])
        setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        return
      }

      // Fetch related data separately
      const clientIds = giftCardsData
        .map(gc => gc.client_id)
        .filter((id): id is string => !!id)
      
      const purchaserIds = giftCardsData
        .map(gc => gc.purchased_by)
        .filter((id): id is string => !!id)

      // Fetch clients
      const clientsMap = new Map<string, { id: string; first_name: string; last_name: string; email: string }>()
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('dd-clients')
          .select('id, first_name, last_name, email')
          .in('id', clientIds)
        
        clients?.forEach(client => {
          clientsMap.set(client.id, {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email || ''
          })
        })
      }

      // Fetch purchasers
      const purchasersMap = new Map<string, { id: string; first_name: string; last_name: string }>()
      if (purchaserIds.length > 0) {
        const { data: purchasers } = await supabase
          .from('dd-users')
          .select('id, first_name, last_name')
          .in('id', purchaserIds)
        
        purchasers?.forEach(purchaser => {
          purchasersMap.set(purchaser.id, {
            id: purchaser.id,
            first_name: purchaser.first_name || '',
            last_name: purchaser.last_name || ''
          })
        })
      }

      // Map related data to gift cards
      const giftCardsWithRelations = giftCardsData.map(gc => ({
        ...gc,
        client: gc.client_id ? clientsMap.get(gc.client_id) : undefined,
        purchaser: gc.purchased_by ? purchasersMap.get(gc.purchased_by) : undefined
      })) as GiftCard[]

      setGiftCards(giftCardsWithRelations)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des cartes cadeaux')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGiftCard = async (giftCardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte cadeau ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-gift-cards')
        .delete()
        .eq('id', giftCardId)

      if (error) {
        console.error('Error deleting gift card:', error)
        toast.error('Erreur lors de la suppression')
        return
      }

      toast.success('Carte cadeau supprimée avec succès')
      fetchGiftCards()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'used':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'used': return 'Utilisée'
      case 'expired': return 'Expirée'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  const filteredGiftCards = giftCards.filter(giftCard =>
    giftCard.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    giftCard.client?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    giftCard.client?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    giftCard.client?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: giftCards.length,
    active: giftCards.filter(gc => gc.status === 'active').length,
    used: giftCards.filter(gc => gc.status === 'used').length,
    totalValue: giftCards.reduce((sum, gc) => sum + gc.current_balance, 0),
    totalInitialValue: giftCards.reduce((sum, gc) => sum + gc.initial_amount, 0)
  }

  if (checkingRole || loading) {
    return <ButtonLoadingSpinner />
  }

  // Access control: only admins and managers can access this page
  if (!canManageGiftCards) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Accès Interdit</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                Seuls les administrateurs et les managers peuvent gérer les cartes cadeaux.
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
        <AddGiftCard 
          onGiftCardCreated={() => {
            fetchGiftCards()
            setShowCreateForm(false)
            window.history.replaceState({}, '', '/admin/gift-cards')
          }}
          onCancel={() => {
            setShowCreateForm(false)
            window.history.replaceState({}, '', '/admin/gift-cards')
          }}
        />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Cartes Cadeaux</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gérez toutes les cartes cadeaux
              </p>
            </div>
            {canManageGiftCards && (
              <AnimatedButton
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-md font-medium transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Carte Cadeau
              </AnimatedButton>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Gift className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Actives</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{stats.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valeur Totale</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{stats.totalValue.toFixed(0)}f</p>
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valeur Initiale</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{stats.totalInitialValue.toFixed(0)}f</p>
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
                  placeholder="Rechercher des cartes cadeaux..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Gift Cards Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Liste des Cartes Cadeaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant Initial</TableHead>
                      <TableHead>Solde Actuel</TableHead>
                      <TableHead>Date d'Achat</TableHead>
                      <TableHead>Date d'Expiration</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGiftCards.map((giftCard) => (
                      <TableRow key={giftCard.id}>
                        <TableCell>
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                            {giftCard.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {giftCard.client ? (
                            <div>
                              <div className="font-medium">{giftCard.client.first_name} {giftCard.client.last_name}</div>
                              <div className="text-sm text-gray-500">{giftCard.client.email}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{giftCard.initial_amount.toFixed(0)}f</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            {giftCard.current_balance.toFixed(0)}f
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(giftCard.purchase_date).toLocaleDateString('fr-FR')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {giftCard.expiry_date ? (
                            <div className="text-sm">
                              {new Date(giftCard.expiry_date).toLocaleDateString('fr-FR')}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(giftCard.status)}>
                            {getStatusText(giftCard.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {canManageGiftCards && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeleteGiftCard(giftCard.id)}
                                className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

