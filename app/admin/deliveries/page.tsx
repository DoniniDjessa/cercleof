"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Search, Eye, Trash2, Truck, MapPin, User, Package, Plus, Clock, DollarSign } from "lucide-react"
import { AddDelivery } from "@/components/deliveries/add-delivery"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Delivery {
  id: string
  vente_id?: string
  client_id?: string
  adresse: string
  livreur_id?: string
  statut: string
  date_livraison?: string
  frais: number
  mode: string
  preuve_photo?: string
  note?: string
  created_at: string
  vente?: {
    id: string
    total_net: number
    date: string
  }
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phones: string[]
  }
  livreur?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

export default function DeliveriesPage() {
  const searchParams = useSearchParams()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const itemsPerPage = 20

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchDeliveries()
  }, [currentPage, dateFilter, dateRange])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('dd-livraisons')
        .select(`
          *,
          vente:dd-ventes(id, total_net, date),
          client:dd-clients(id, first_name, last_name, email, phones),
          livreur:dd-users(id, first_name, last_name, role)
        `, { count: 'exact' })

      // Apply date filters
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        query = query.gte('created_at', today.toISOString()).lt('created_at', tomorrow.toISOString())
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const today = new Date(yesterday)
        today.setDate(today.getDate() + 1)
        query = query.gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('created_at', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('created_at', monthAgo.toISOString())
      } else if (dateFilter === 'range' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
      }

      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      setDeliveries(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching deliveries:', error)
      toast.error('Erreur lors du chargement des livraisons')
    } finally {
      setLoading(false)
    }
  }

  const deleteDelivery = async (deliveryId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette livraison ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-livraisons')
        .delete()
        .eq('id', deliveryId)

      if (error) throw error

      toast.success('Livraison supprimée avec succès!')
      fetchDeliveries()
    } catch (error) {
      console.error('Error deleting delivery:', error)
      toast.error('Erreur lors de la suppression de la livraison')
    }
  }

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('dd-livraisons')
        .update({ statut: newStatus })
        .eq('id', deliveryId)

      if (error) throw error

      toast.success('Statut mis à jour avec succès!')
      fetchDeliveries()
    } catch (error) {
      console.error('Error updating delivery status:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_preparation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'expedie':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'livre':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'annule':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'retourne':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_preparation': return 'En Préparation'
      case 'expedie': return 'Expédié'
      case 'livre': return 'Livré'
      case 'annule': return 'Annulé'
      case 'retourne': return 'Retourné'
      default: return status
    }
  }

  const getModeText = (mode: string) => {
    switch (mode) {
      case 'interne': return 'Interne'
      case 'externe': return 'Externe'
      default: return mode
    }
  }

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.adresse.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.livreur?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.livreur?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.vente?.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDeliveries = deliveries.length
  const pendingDeliveries = deliveries.filter(d => d.statut === 'en_preparation').length
  const shippedDeliveries = deliveries.filter(d => d.statut === 'expedie').length
  const deliveredDeliveries = deliveries.filter(d => d.statut === 'livre').length
  const totalFees = deliveries.reduce((sum, delivery) => sum + delivery.frais, 0)

  if (showCreateForm) {
    return <AddDelivery onDeliveryCreated={fetchDeliveries} />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Livraisons</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez toutes vos livraisons et expéditions</p>
        </div>
        <AnimatedButton
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.set('action', 'create')
            window.history.pushState({}, '', url.toString())
            setShowCreateForm(true)
          }}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Livraison
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Livraisons</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Préparation</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Livrées</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{deliveredDeliveries}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Frais Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalFees.toFixed(0)}f</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher des livraisons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
              >
                <option value="all">Toutes les dates</option>
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="range">Période personnalisée</option>
              </select>
              {dateFilter === 'range' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="text-xs h-8"
                  />
                  <span className="text-xs text-gray-500">à</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Livraisons</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Adresse</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Livreur</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Mode</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date Livraison</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Frais</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Statut</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        {delivery.client ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {delivery.client.first_name} {delivery.client.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {delivery.client.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Client anonyme</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {delivery.adresse}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {delivery.livreur ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {delivery.livreur.first_name} {delivery.livreur.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {delivery.livreur.role}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {getModeText(delivery.mode)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {delivery.date_livraison ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(delivery.date_livraison).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(delivery.date_livraison).toLocaleTimeString('fr-FR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Non planifiée</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {delivery.frais.toFixed(0)}f
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(delivery.statut)}>
                          {getStatusText(delivery.statut)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to delivery details
                              window.location.href = `/admin/deliveries/${delivery.id}`
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {delivery.statut === 'en_preparation' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDeliveryStatus(delivery.id, 'expedie')}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              Expédier
                            </Button>
                          )}
                          {delivery.statut === 'expedie' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateDeliveryStatus(delivery.id, 'livre')}
                              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                            >
                              Livrer
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDelivery(delivery.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
