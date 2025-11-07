"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Search, Eye, Trash2, ShoppingCart, DollarSign, CreditCard, User, Calendar } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Sale {
  id: string
  client_id?: string
  user_id: string
  date: string
  type: string
  total_brut: number
  reduction: number
  total_net: number
  methode_paiement: string
  reference?: string
  status: string
  source: string
  note?: string
  created_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    phone?: string
  }
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    pseudo: string
  }
  items?: SaleItem[]
}

interface SaleItem {
  id: string
  product_id?: string
  service_id?: string
  quantite: number
  prix_unitaire: number
  total: number
  product?: {
    id: string
    name: string
    sku?: string
  }
  service?: {
    id: string
    name: string
  }
}

export default function SalesPage() {
  const { user: authUser } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const itemsPerPage = 20

  useEffect(() => {
    fetchCurrentUserRole()
  }, [authUser])

  useEffect(() => {
    fetchSales()
  }, [currentPage, dateFilter, dateRange])

  const fetchCurrentUserRole = async () => {
    try {
      if (!authUser?.id) {
        setCurrentUserRole('')
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setCurrentUserRole('')
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error fetching user role:', error)
      setCurrentUserRole('')
    }
  }

  // Check if user can delete sales (admin, manager, superadmin)
  const canDeleteSales = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchSales = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('dd-ventes')
        .select('*', { count: 'exact' })

      // Apply date filters
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        query = query.gte('date', today.toISOString()).lt('date', tomorrow.toISOString())
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const today = new Date(yesterday)
        today.setDate(today.getDate() + 1)
        query = query.gte('date', yesterday.toISOString()).lt('date', today.toISOString())
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        query = query.gte('date', weekAgo.toISOString())
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        query = query.gte('date', monthAgo.toISOString())
      } else if (dateFilter === 'range' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        query = query.gte('date', start.toISOString()).lte('date', end.toISOString())
      }

      const { data: salesData, error, count } = await query
        .range(from, to)
        .order('date', { ascending: false })

      if (error) throw error

      if (!salesData || salesData.length === 0) {
        setSales([])
        setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        return
      }

      // Fetch related data separately
      const clientIds = salesData
        .map(sale => sale.client_id)
        .filter((id): id is string => !!id)
      
      const userIds = salesData
        .map(sale => sale.user_id)
        .filter((id): id is string => !!id)
      
      const venteIds = salesData.map(sale => sale.id)

      // Fetch clients
      const clientsMap = new Map<string, { id: string; first_name: string; last_name: string; phone: string }>()
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from('dd-clients')
          .select('id, first_name, last_name, phone')
          .in('id', clientIds)
        
        clients?.forEach(client => {
          clientsMap.set(client.id, {
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            phone: client.phone || ''
          })
        })
      }

      // Fetch users
      const usersMap = new Map<string, { id: string; first_name: string; last_name: string; email: string; pseudo: string }>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('dd-users')
          .select('id, first_name, last_name, email, pseudo')
          .in('id', userIds)
        
        users?.forEach(user => {
          usersMap.set(user.id, {
            id: user.id,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            pseudo: user.pseudo || ''
          })
        })
      }

      // Fetch sale items
      const { data: saleItemsData } = await supabase
        .from('dd-ventes-items')
        .select('*')
        .in('vente_id', venteIds)

      // Fetch products for sale items
      const productIds = saleItemsData
        ?.map(item => item.product_id)
        .filter((id): id is string => !!id) || []

      const productsMap = new Map<string, { id: string; name: string; sku: string }>()
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('dd-products')
          .select('id, name, sku')
          .in('id', productIds)
        
        products?.forEach(product => {
          productsMap.set(product.id, {
            id: product.id,
            name: product.name,
            sku: product.sku || ''
          })
        })
      }

      // Fetch services for sale items
      const serviceIds = saleItemsData
        ?.map(item => item.service_id)
        .filter((id): id is string => !!id) || []

      const servicesMap = new Map<string, { id: string; name: string }>()
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('dd-services')
          .select('id, name')
          .in('id', serviceIds)
        
        services?.forEach(service => {
          servicesMap.set(service.id, {
            id: service.id,
            name: service.name || ''
          })
        })
      }

      // Map items to sales
      const itemsByVenteId = new Map<string, any[]>()
      saleItemsData?.forEach(item => {
        const venteId = item.vente_id
        if (!itemsByVenteId.has(venteId)) {
          itemsByVenteId.set(venteId, [])
        }
        itemsByVenteId.get(venteId)?.push({
          ...item,
          product: item.product_id 
            ? (productsMap.get(item.product_id) || { id: item.product_id, name: 'inconnu', sku: '' })
            : undefined,
          service: item.service_id ? servicesMap.get(item.service_id) : undefined
        })
      })

      // Map related data to sales
      const salesWithRelations = salesData.map(sale => ({
        ...sale,
        client: sale.client_id ? clientsMap.get(sale.client_id) : undefined,
        user: sale.user_id ? usersMap.get(sale.user_id) : undefined,
        items: itemsByVenteId.get(sale.id) || []
      })) as Sale[]

      setSales(salesWithRelations)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast.error('Erreur lors du chargement des ventes')
    } finally {
      setLoading(false)
    }
  }

  const deleteSale = async (saleId: string) => {
    if (!canDeleteSales) {
      toast.error('Vous n\'avez pas la permission de supprimer des ventes')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      console.log('Starting deletion of sale:', saleId)

      // First, check if there are any deliveries
      const { data: deliveries, error: checkDeliveriesError } = await supabase
        .from('dd-livraisons')
        .select('id')
        .eq('vente_id', saleId)

      if (checkDeliveriesError && checkDeliveriesError.code !== 'PGRST116') {
        console.warn('Error checking deliveries:', checkDeliveriesError)
      }

      // Delete related deliveries (livraisons) if they exist
      if (deliveries && deliveries.length > 0) {
        console.log(`Found ${deliveries.length} delivery(ies) to delete`)
        const { error: deliveryError, data: deletedDeliveries } = await supabase
          .from('dd-livraisons')
          .delete()
          .eq('vente_id', saleId)
          .select()

        if (deliveryError) {
          console.error('Error deleting deliveries:', deliveryError)
          toast.error(`Erreur lors de la suppression des livraisons: ${deliveryError.message}`)
          return
        }
        console.log(`Deleted ${deletedDeliveries?.length || deliveries.length} delivery(ies)`)
      }

      // Check if there are any sale items
      const { data: saleItems, error: checkItemsError } = await supabase
        .from('dd-ventes-items')
        .select('id')
        .eq('vente_id', saleId)

      if (checkItemsError && checkItemsError.code !== 'PGRST116') {
        console.warn('Error checking sale items:', checkItemsError)
      }

      // Delete sale items (should cascade, but doing it explicitly to be sure)
      if (saleItems && saleItems.length > 0) {
        console.log(`Found ${saleItems.length} sale item(s) to delete`)
        const { error: itemsError, data: deletedItems } = await supabase
          .from('dd-ventes-items')
          .delete()
          .eq('vente_id', saleId)
          .select()

        if (itemsError) {
          console.error('Error deleting sale items:', itemsError)
          // Check if it's a permission error
          if (itemsError.message?.includes('policy') || itemsError.message?.includes('permission')) {
            toast.error('Permission insuffisante pour supprimer les articles de vente. Vérifiez vos permissions RLS.')
            return
          }
          // For other errors, we'll still try to delete the sale as it might cascade
          console.warn('Continuing with sale deletion despite items deletion error')
        } else {
          console.log(`Deleted ${deletedItems?.length || saleItems.length} sale item(s)`)
        }
      }

      // Then delete the sale
      console.log('Deleting sale:', saleId)
      const { error: deleteError, data: deletedSale } = await supabase
        .from('dd-ventes')
        .delete()
        .eq('id', saleId)
        .select()

      if (deleteError) {
        console.error('Error deleting sale:', deleteError)
        // Check for specific error codes
        if (deleteError.code === '23503' || deleteError.message?.includes('foreign key') || deleteError.message?.includes('violates foreign key')) {
          toast.error('Impossible de supprimer la vente car elle est référencée dans d\'autres données (livraisons, actions, etc.)')
        } else if (deleteError.message?.includes('policy') || deleteError.message?.includes('permission') || deleteError.message?.includes('RLS')) {
          toast.error('Permission insuffisante pour supprimer la vente. Vérifiez vos permissions RLS (vous devez être admin ou manager).')
        } else {
          toast.error(`Erreur lors de la suppression de la vente: ${deleteError.message}`)
        }
        return
      }

      if (!deletedSale || deletedSale.length === 0) {
        console.error('No rows deleted - sale may not exist or RLS prevented deletion')
        console.error('Current user role:', currentUserRole)
        console.error('Can delete sales:', canDeleteSales)
        // Check if sale still exists
        const { data: stillExists } = await supabase
          .from('dd-ventes')
          .select('id')
          .eq('id', saleId)
          .maybeSingle()
        
        if (stillExists) {
          toast.error('La suppression a échoué. La politique RLS bloque probablement la suppression. Vérifiez que vous êtes admin/manager et que la politique RLS est correctement configurée (auth_user_id au lieu de id).')
        } else {
          toast.error('Aucune ligne supprimée. La vente n\'existe peut-être pas.')
        }
        return
      }

      console.log(`Successfully deleted sale. Rows affected: ${deletedSale.length}`)

      // Wait a bit to ensure the deletion is committed
      await new Promise(resolve => setTimeout(resolve, 200))

      // Verify deletion was successful by checking if the sale still exists
      const { data: verifySale, error: verifyError } = await supabase
        .from('dd-ventes')
        .select('id')
        .eq('id', saleId)
        .maybeSingle()

      if (verifySale) {
        // Sale still exists - deletion failed silently
        console.error('Sale still exists after deletion attempt', verifySale)
        toast.error('La suppression a échoué. La vente existe toujours dans la base de données. Vérifiez vos permissions RLS.')
        // Don't update local state if deletion failed
        return
      }

      // If verifyError exists but it's a "not found" error, that's good - sale was deleted
      if (verifyError && verifyError.code !== 'PGRST116') {
        console.warn('Error verifying deletion (but this might be OK):', verifyError)
      }

      // Immediately remove from local state for instant UI update
      setSales(prevSales => {
        const updated = prevSales.filter(sale => sale.id !== saleId)
        // Update total pages if needed
        const newTotalPages = Math.ceil((updated.length) / itemsPerPage)
        if (newTotalPages < totalPages) {
          setTotalPages(newTotalPages)
        }
        // If we're on a page that becomes empty, go back to page 1
        // But don't trigger useEffect by changing page - just update the count
        if (updated.length === 0 && currentPage > 1) {
          // Don't change page here - it would trigger fetchSales()
          // The user can navigate manually if needed
        }
        return updated
      })
      
      toast.success('Vente supprimée avec succès!')
      
      // Don't refresh immediately - the local state update is sufficient
      // The data will refresh naturally when filters change or page changes
      // This prevents stale data from being fetched before deletion is fully committed
      // If user wants fresh data, they can change filters or navigate
    } catch (error: any) {
      console.error('Error deleting sale:', error)
      toast.error(`Erreur lors de la suppression de la vente: ${error?.message || 'Erreur inconnue'}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paye':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'annule':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'rembourse':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paye': return 'Payé'
      case 'annule': return 'Annulé'
      case 'en_attente': return 'En Attente'
      case 'rembourse': return 'Remboursé'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'produit': return 'Produit'
      case 'service': return 'Service'
      case 'mixte': return 'Mixte'
      default: return type
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces'
      case 'carte': return 'Carte'
      case 'mobile_money': return 'Mobile Money'
      case 'cheque': return 'Chèque'
      default: return method
    }
  }

  const filteredSales = sales.filter(sale =>
    sale.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.user?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalSales = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_net, 0)
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0
  const paidSales = sales.filter(s => s.status === 'paye').length

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground dark:text-white">Ventes</h1>
          <p className="text-xs text-muted-foreground dark:text-gray-400">Gérez toutes vos ventes et transactions</p>
        </div>
        <AnimatedButton
          onClick={() => {
            window.location.href = '/admin/pos'
          }}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Nouvelle Vente
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-3 px-4">
            <div className="flex items-center">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total Ventes</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-3 px-4">
            <div className="flex items-center">
              <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Chiffre d'Affaires</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{totalRevenue.toFixed(0)}f</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-3 px-4">
            <div className="flex items-center">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Panier Moyen</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{averageSale.toFixed(0)}f</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="py-3 px-4">
            <div className="flex items-center">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <User className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Ventes Payées</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{paidSales}</p>
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
                placeholder="Rechercher des ventes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
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

      {/* Sales Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm text-gray-900 dark:text-white">Liste des Ventes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Référence</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Client</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Type</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Total</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Paiement</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Statut</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Date</TableHead>
                    <TableHead className="text-xs text-gray-700 dark:text-gray-300 py-2">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell className="py-1.5">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {sale.reference || `#${sale.id.slice(-8)}`}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        {sale.client && (sale.client.first_name || sale.client.last_name || sale.client.phone) ? (
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {sale.client.first_name || ''} {sale.client.last_name || ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Client anonyme</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {getTypeText(sale.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {sale.total_net.toFixed(0)}f
                          </p>
                          {sale.reduction > 0 && (
                            <p className="text-[10px] text-red-500 dark:text-red-400">
                              -{sale.reduction.toFixed(0)}f
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <span className="text-xs text-gray-900 dark:text-white">
                          {getPaymentMethodText(sale.methode_paiement)}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge className={`text-[10px] ${getStatusColor(sale.status)}`}>
                          {getStatusText(sale.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">
                            {new Date(sale.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {new Date(sale.date).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to sale details
                              window.location.href = `/admin/sales/${sale.id}`
                            }}
                            className="h-6 w-6 p-0 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          {canDeleteSales && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSale(sale.id)}
                              className="h-6 w-6 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
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
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-700 dark:text-gray-300">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 text-xs px-2"
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 text-xs px-2"
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
