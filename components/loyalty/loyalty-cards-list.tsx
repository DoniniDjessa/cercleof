"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AnimatedButton } from '@/components/ui/animated-button'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Star, 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  CreditCard,
  Gift,
  Award
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface LoyaltyCard {
  id: string
  client_id: string
  card_number: string
  points_balance: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  status: 'active' | 'inactive' | 'suspended'
  total_spent: number
  total_visits: number
  last_visit: string
  created_at: string
  client?: {
    first_name: string
    last_name: string
    email: string
    phone: string
  }
}

interface LoyaltyCardsListProps {
  onCardCreated?: () => void
  onCardUpdated?: () => void
}

export function LoyaltyCardsList({ onCardCreated: _onCardCreated, onCardUpdated: _onCardUpdated }: LoyaltyCardsListProps) {
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchLoyaltyCards()
  }, [currentPage])

  const fetchLoyaltyCards = async () => {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Fetch loyalty cards first
      const { data: loyaltyCardsData, error, count } = await supabase
        .from('dd-cartes-fidelite')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching loyalty cards:', error)
        toast.error('Erreur lors du chargement des cartes de fidélité')
        return
      }

      if (!loyaltyCardsData || loyaltyCardsData.length === 0) {
        setLoyaltyCards([])
        setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        return
      }

      // Fetch clients separately
      const clientIds = loyaltyCardsData
        .map(card => card.client_id)
        .filter((id): id is string => !!id)

      const clientsMap = new Map<string, { first_name: string; last_name: string; email: string; phone: string }>()
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('dd-clients')
          .select('id, first_name, last_name, email, phone')
          .in('id', clientIds)
        
        clients?.forEach(client => {
          clientsMap.set(client.id, {
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email || '',
            phone: client.phone || ''
          })
        })
      }

      // Map clients to loyalty cards
      const loyaltyCardsWithClients = loyaltyCardsData.map(card => ({
        ...card,
        client: card.client_id ? clientsMap.get(card.client_id) : undefined
      })) as LoyaltyCard[]

      setLoyaltyCards(loyaltyCardsWithClients)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des cartes de fidélité')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette carte de fidélité ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-cartes-fidelite')
        .delete()
        .eq('id', cardId)

      if (error) {
        console.error('Error deleting loyalty card:', error)
        toast.error('Erreur lors de la suppression')
        return
      }

      toast.success('Carte de fidélité supprimée avec succès')
      fetchLoyaltyCards()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'silver': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'gold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'platinum': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return '🥉'
      case 'silver': return '🥈'
      case 'gold': return '🥇'
      case 'platinum': return '💎'
      default: return '⭐'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const filteredCards = loyaltyCards.filter(card =>
    card.card_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.client?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.client?.phone.includes(searchTerm)
  )

  const stats = {
    total: loyaltyCards.length,
    active: loyaltyCards.filter(c => c.status === 'active').length,
    gold: loyaltyCards.filter(c => c.tier === 'gold').length,
    platinum: loyaltyCards.filter(c => c.tier === 'platinum').length
  }

  if (loading) {
    return <ButtonLoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cartes de Fidélité</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez le programme de fidélité et les cartes de vos clients
          </p>
        </div>
        <AnimatedButton
          onClick={() => {/* TODO: Add create card functionality */}}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-6 py-3 rounded-md font-medium transition-all duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Carte
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cartes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Star className="h-6 w-6 text-green-600 dark:text-green-400" />
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
                <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Gold</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.gold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Platinum</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.platinum}</p>
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
              placeholder="Rechercher par numéro de carte, nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Liste des Cartes de Fidélité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de Carte</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Dépenses Total</TableHead>
                  <TableHead>Visites</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell>
                      <div className="font-mono font-medium">
                        {card.card_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {card.client?.first_name} {card.client?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {card.client?.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {card.client?.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getTierColor(card.tier)}>
                        <span className="mr-1">{getTierIcon(card.tier)}</span>
                        {card.tier.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-lg">
                        {card.points_balance.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {card.total_spent.toLocaleString()} XOF
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {card.total_visits}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(card.status)}>
                        {card.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
    </div>
  )
}
