"use client"

import { PeriodFilter } from '@/components/ui/period-filter'

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Search, Eye, Trash2, TrendingUp, DollarSign, Plus, Calendar, TrendingDown, BarChart3, Pencil } from "lucide-react"
import { AddRevenue } from "@/components/financial/add-revenue"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { AuthLoadingScreen } from "@/components/ui/context-loaders"
import { StatCard, StatGrid } from '@/components/ui/stat-card'

interface Revenue {
  id: string
  type: string
  source_id?: string
  montant: number
  date: string
  note?: string
  description?: string
  created_at: string
  enregistre_par: string
  revenue_source: 'manual' | 'pos_product' | 'pos_service' // New field to distinguish sources
  user?: {
    id: string
    pseudo: string
    first_name?: string
    last_name?: string
  }
  sale?: {
    id: string
    client?: {
      first_name?: string
      last_name?: string
    }
    items?: Array<{
      product?: { name: string }
      service?: { name: string }
      quantite?: number
    }>
  }
}

interface Expense {
  id: string
  categorie: string
  montant: number
  date: string
}

export default function RevenuesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [revenues, setRevenues] = useState<Revenue[]>([])
  const [allFilteredRevenues, setAllFilteredRevenues] = useState<Revenue[]>([]) // Store all filtered revenues for stats
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'pos_product' | 'pos_service' | 'manual'>('all')
  const [checkingRole, setCheckingRole] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const itemsPerPage = 20

  // Check if user is receptionist (restricted access)
  const isReceptionist = Boolean(user?.role && user.role === 'receptionniste')
  
  // Show access denied for receptionist
  if (user && isReceptionist) {
    return (
      <div className="p-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Accès Interdit
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Vous n'avez pas l'autorisation d'accéder à cette page.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Cette section est réservée aux administrateurs et managers.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/admin')} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (user) {
      fetchUserRole()
    }
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      setCurrentPage(1) // Reset to first page when filters change
      fetchRevenues()
      fetchExpenses()
    }
  }, [dateFilter, dateRange, isAdmin]) // Removed currentPage from dependencies

  // Reset to page 1 when search term or revenue filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, revenueFilter])

  const fetchUserRole = async () => {
    if (!user?.id) {
      setCheckingRole(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user role:', error)
        setUserRole('')
        setIsAdmin(false)
      } else {
        const role = data?.role || ''
        setUserRole(role)
        setIsAdmin(['admin', 'superadmin', 'manager'].includes(role.toLowerCase()))
        
        // Redirect non-admins immediately
        if (role && !['admin', 'superadmin', 'manager'].includes(role.toLowerCase())) {
          toast.error('Accès restreint : Cette page est réservée aux administrateurs')
          router.push('/admin/pos')
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
      setUserRole('')
      setIsAdmin(false)
    } finally {
      setCheckingRole(false)
    }
  }

  const fetchRevenues = async () => {
    try {
      setLoading(true)

      // Build date filter conditions
      let dateFilterConditions: any = {}
      if (dateFilter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        dateFilterConditions = { start: today.toISOString(), end: tomorrow.toISOString() }
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        const today = new Date(yesterday)
        today.setDate(today.getDate() + 1)
        dateFilterConditions = { start: yesterday.toISOString(), end: today.toISOString() }
      } else if (dateFilter === 'week') {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        dateFilterConditions = { start: weekAgo.toISOString() }
      } else if (dateFilter === 'month') {
        const monthAgo = new Date()
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        dateFilterConditions = { start: monthAgo.toISOString() }
      } else if (dateFilter === 'range' && dateRange.start && dateRange.end) {
        const start = new Date(dateRange.start)
        start.setHours(0, 0, 0, 0)
        const end = new Date(dateRange.end)
        end.setHours(23, 59, 59, 999)
        dateFilterConditions = { start: start.toISOString(), end: end.toISOString() }
      }

      // Fetch manual revenues
      let revenuesQuery = supabase
        .from('dd-revenues')
        .select(`
          *,
          user:"dd-users"!enregistre_par(id, pseudo, first_name, last_name)
        `, { count: 'exact' })

      if (dateFilterConditions.start) {
        revenuesQuery = revenuesQuery.gte('date', dateFilterConditions.start)
      }
      if (dateFilterConditions.end) {
        revenuesQuery = revenuesQuery.lt('date', dateFilterConditions.end)
      }

      const { data: revenuesData, error: revenuesError, count: revenuesCount } = await revenuesQuery
        .order('date', { ascending: false })

      if (revenuesError) throw revenuesError

      // Fetch sales (POS transactions)
      let salesQuery = supabase
        .from('dd-ventes')
        .select(`
          id,
          date,
          total_net,
          client_id,
          created_by,
          client:dd-clients(id, first_name, last_name)
        `)
        .eq('status', 'paye')

      if (dateFilterConditions.start) {
        salesQuery = salesQuery.gte('date', dateFilterConditions.start)
      }
      if (dateFilterConditions.end) {
        salesQuery = salesQuery.lt('date', dateFilterConditions.end)
      }

      const { data: salesData, error: salesError } = await salesQuery
        .order('date', { ascending: false })

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        throw salesError
      }

      // Fetch sale items to categorize as product or service
      const saleIds = (salesData || []).map((s: any) => s.id)
      // Read-only, in chunks: one .in() with every sale id of the period makes the URL
      // too long and the request failed silently ("Aucun détail"). Names are read
      // separately, like the sale detail page does.
      const chunk = <T,>(arr: T[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size))
      const fetchInChunks = async (table: string, columns: string, column: string, ids: string[]) => {
        const rows: any[] = []
        const groups = chunk(chunk(ids, 150), 6) // 150 ids per request, 6 requests at a time
        for (const group of groups) {
          const results = await Promise.all(
            group.map(part => supabase.from(table).select(columns).in(column, part))
          )
          results.forEach(({ data, error }) => {
            if (error) console.error(`Error fetching ${table}:`, error)
            else if (data) rows.push(...data)
          })
        }
        return rows
      }

      let saleItemsData: any[] = []
      if (saleIds.length > 0) {
        const items = await fetchInChunks(
          'dd-ventes-items', 'vente_id, product_id, service_id, quantite', 'vente_id', saleIds
        )
        const productIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))] as string[]
        const serviceIds = [...new Set(items.map((i: any) => i.service_id).filter(Boolean))] as string[]
        const [products, services] = await Promise.all([
          productIds.length ? fetchInChunks('dd-products', 'id, name', 'id', productIds) : Promise.resolve([]),
          serviceIds.length ? fetchInChunks('dd-services', 'id, name', 'id', serviceIds) : Promise.resolve([]),
        ])
        const productNames = new Map(products.map((p: any) => [p.id, p.name]))
        const serviceNames = new Map(services.map((s: any) => [s.id, s.name]))
        saleItemsData = items.map((item: any) => ({
          ...item,
          product: item.product_id ? { name: productNames.get(item.product_id) || 'Produit inconnu' } : null,
          service: item.service_id ? { name: serviceNames.get(item.service_id) || 'Service inconnu' } : null,
        }))
      }

      // Group sale items by vente_id
      const saleItemsByVente = saleItemsData.reduce((acc: any, item: any) => {
        if (!acc[item.vente_id]) {
          acc[item.vente_id] = []
        }
        acc[item.vente_id].push(item)
        return acc
      }, {})

      // Transform manual revenues - all revenues from dd-revenues without source_id are manual
      // (created via "Nouveau Revenu" form)
      // Revenues with source_id are references to POS sales and should NOT appear in manual list
      const transformedRevenues: Revenue[] = (revenuesData || [])
        .filter((r: any) => {
          // Only include revenues without source_id (these are true manual revenues)
          return !r.source_id
        })
        .map((r: any) => ({
          ...r,
          revenue_source: 'manual' as const, // Explicitly mark as manual revenue
          montant: r.montant || 0,
          description: r.description || null
        }))

      // Get deleted POS sale IDs from dd-revenues
      const { data: deletedPosSales } = await supabase
        .from('dd-revenues')
        .select('source_id')
        .eq('type', 'deleted_pos_sale')
        .not('source_id', 'is', null)

      const deletedPosSaleIds = new Set(
        (deletedPosSales || []).map(r => r.source_id)
      )

      // Transform sales into revenue entries - display POS sales from dd-ventes table
      // Exclude POS sales that have been marked as deleted
      const transformedSales: Revenue[] = (salesData || [])
        .filter((sale: any) => !deletedPosSaleIds.has(sale.id))
        .map((sale: any) => {
        const items = saleItemsByVente[sale.id] || []
        
        // Check if sale has products, services, or both
        const hasProducts = items.some((item: any) => item.product_id && !item.service_id)
        const hasServices = items.some((item: any) => item.service_id && !item.product_id)
        
        // Determine revenue source type based on items
        let revenueSource: 'pos_product' | 'pos_service' = 'pos_product' // Default to product
        
        if (items.length > 0) {
          if (hasServices && !hasProducts) {
            // Pure service sale - only services, no products
            revenueSource = 'pos_service'
          } else if (hasProducts && !hasServices) {
            // Pure product sale - only products, no services
            revenueSource = 'pos_product'
          } else if (hasProducts && hasServices) {
            // Mixed sale - has both products and services, classify as product
            revenueSource = 'pos_product'
          }
          // If no items match (shouldn't happen), default to 'pos_product'
        }
        // If sale has no items, default to 'pos_product'

        return {
          id: sale.id,
          type: revenueSource === 'pos_product' ? 'Vente Produit (POS)' : 'Vente Service (POS)',
          source_id: sale.id, // POS sales always have source_id (their own sale ID)
          montant: sale.total_net || 0,
          date: sale.date,
          note: sale.client ? `${sale.client.first_name || ''} ${sale.client.last_name || ''}`.trim() : 'Client anonyme',
          created_at: sale.created_at || sale.date,
          enregistre_par: sale.created_by || '',
          revenue_source: revenueSource, // This will be 'pos_product' or 'pos_service'
          user: undefined,
          sale: {
            id: sale.id,
            client: sale.client,
            items: items
          }
        }
      })

      // Combine and sort by date
      const allRevenues = [...transformedRevenues, ...transformedSales]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      // Debug: Log what we have
      console.log('Revenue Summary:', {
        manualRevenues: transformedRevenues.length,
        posSales: transformedSales.length,
        posProducts: transformedSales.filter(s => s.revenue_source === 'pos_product').length,
        posServices: transformedSales.filter(s => s.revenue_source === 'pos_service').length,
        total: allRevenues.length
      })

      // Store all filtered revenues for stats calculation
      setAllFilteredRevenues(allRevenues as Revenue[])

      // Paginate for display (only if not already on page 1 or if currentPage changed)
      const paginatedRevenues = allRevenues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
      const totalCount = allRevenues.length

      setRevenues(paginatedRevenues as Revenue[])
      setTotalPages(Math.ceil(totalCount / itemsPerPage))
    } catch (error) {
      console.error('Error fetching revenues:', error)
      toast.error('Erreur lors du chargement des revenus')
    } finally {
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      let query = supabase
        .from('dd-depenses')
        .select('id, categorie, montant, date')

      // Apply same date filters as revenues
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

      const { data, error } = await query.order('date', { ascending: false })

      if (error) throw error

      setExpenses((data || []) as Expense[])
    } catch (error) {
      console.error('Error fetching expenses:', error)
      // Don't show error toast for expenses, just log it
    }
  }

  const deleteRevenue = async (revenueId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce revenu ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      // Find the revenue to determine if it's a POS sale or manual revenue
      const revenue = allFilteredRevenues.find(r => r.id === revenueId)
      
      if (!revenue) {
        toast.error('Revenu introuvable')
        return
      }

      if (revenue.revenue_source === 'manual') {
        // For manual revenues, delete from dd-revenues table
        const { error } = await supabase
          .from('dd-revenues')
          .delete()
          .eq('id', revenueId)

        if (error) throw error
      } else {
        // For POS sales, create a "deleted" record in dd-revenues to prevent reappearing
        // First get the dd-users ID from the auth user ID
        const { data: userData, error: userError } = await supabase
          .from('dd-users')
          .select('id')
          .eq('auth_user_id', user?.id)
          .single()

        if (userError || !userData) {
          console.error('Error fetching user data:', userError)
          toast.error('Erreur lors de la récupération des données utilisateur')
          return
        }

        const { error } = await supabase
          .from('dd-revenues')
          .insert({
            source_id: revenueId, // Reference to the POS sale ID
            type: 'deleted_pos_sale',
            montant: 0,
            date: new Date().toISOString(),
            note: `Vente POS supprimée: ${revenue.type}`,
            enregistre_par: userData.id, // Use dd-users.id instead of auth user id
            manual: false
          })

        if (error) throw error
      }

      toast.success('Revenu supprimé avec succès!')
      fetchRevenues()
    } catch (error) {
      console.error('Error deleting revenue:', error)
      toast.error('Erreur lors de la suppression du revenu')
    }
  }

  const getTypeColor = (type: string, revenueSource?: string) => {
    // Check revenue source first for POS sales
    if (revenueSource === 'pos_product') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
    if (revenueSource === 'pos_service') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
    
    // Manual revenue types
    switch (type) {
      case 'vente':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'service':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'abonnement':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'partenariat':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'investissement':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'autre':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getTypeText = (type: string, revenueSource?: string) => {
    // For POS sales, the type already includes "(POS)" in the name
    // For manual revenues, show the type as is
    if (revenueSource === 'pos_product' || revenueSource === 'pos_service') {
      return type // Already formatted as "Vente Produit (POS)" or "Vente Service (POS)"
    }
    // For manual revenues, ensure proper capitalization
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  // Apply search filter and revenue source filter to all filtered revenues
  const filteredRevenues = allFilteredRevenues.filter(revenue => {
    // Apply revenue source filter
    if (revenueFilter !== 'all') {
      if (revenue.revenue_source !== revenueFilter) {
        return false
      }
    }
    
    // Apply search filter (only if search term exists)
    if (searchTerm) {
      const matchesSearch = (
        revenue.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revenue.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revenue.source_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revenue.user?.pseudo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revenue.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        revenue.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      if (!matchesSearch) {
        return false
      }
    }
    
    return true
  })

  // Calculate stats based on ALL filtered data (including search term AND revenue filter)
  // Use filteredRevenues which already applies both filters
  const statsRevenues = filteredRevenues
  const totalRevenues = statsRevenues.length
  const totalRevenueAmount = statsRevenues.reduce((sum, revenue) => sum + revenue.montant, 0)
  const averageRevenue = totalRevenues > 0 ? totalRevenueAmount / totalRevenues : 0
  
  // Breakdown by source (for benefits card)
  const manualRevenuesAmount = statsRevenues
    .filter(r => r.revenue_source === 'manual')
    .reduce((sum, revenue) => sum + revenue.montant, 0)
  const posProductAmount = statsRevenues
    .filter(r => r.revenue_source === 'pos_product')
    .reduce((sum, revenue) => sum + revenue.montant, 0)
  const posServiceAmount = statsRevenues
    .filter(r => r.revenue_source === 'pos_service')
    .reduce((sum, revenue) => sum + revenue.montant, 0)
  
  // Filter by current month only for "this month" stat
  const now = new Date()
  const thisMonthRevenues = statsRevenues.filter(r => {
    const revenueDate = new Date(r.date)
    return revenueDate.getMonth() === now.getMonth() && revenueDate.getFullYear() === now.getFullYear()
  }).length

  // Calculate benefits (profit) - using filtered expenses that match the date filter
  const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.montant, 0)
  const profit = totalRevenueAmount - totalExpenseAmount
  const profitMargin = totalRevenueAmount > 0 ? (profit / totalRevenueAmount) * 100 : 0
  
  // Calculate expenses breakdown
  const financeExpenseAmount = expenses
    .filter(exp => ['salaire', 'salaire_travailleur'].includes(exp.categorie))
    .reduce((sum, expense) => sum + expense.montant, 0)
  const normalExpenseAmount = totalExpenseAmount - financeExpenseAmount

  if (showCreateForm) {
    return <AddRevenue onRevenueCreated={() => {
      setShowCreateForm(false)
      fetchRevenues()
    }} />
  }

  if (editingRevenueId) {
    return <AddRevenue 
      revenueId={editingRevenueId}
      onRevenueCreated={() => {
        setEditingRevenueId(null)
        fetchRevenues()
      }}
      onCancel={() => {
        setEditingRevenueId(null)
      }}
    />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Revenus</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez tous vos revenus et entrées d'argent</p>
        </div>
        <AnimatedButton
          onClick={() => {
            router.push('/admin/revenues?action=create')
          }}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau Revenu
        </AnimatedButton>
      </div>

      {/* Benefits Overview Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
            Bénéfices (Profit)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenus</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalRevenueAmount.toFixed(0)} FCFA</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalExpenseAmount.toFixed(0)} FCFA</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dépenses normales: {normalExpenseAmount.toFixed(0)} FCFA | Finances: {financeExpenseAmount.toFixed(0)} FCFA
              </p>
            </div>
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${profit >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice Net</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profit.toFixed(0)} FCFA
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Marge de Profit</p>
              <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profitMargin.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <StatGrid cols={4}>
        <StatCard index={0} label="Total Revenus" value={totalRevenues} icon={TrendingUp} tone="emerald" />
        <StatCard index={1} label="Montant Total" value={<>{totalRevenueAmount.toFixed(0)} FCFA</>} icon={DollarSign} tone="sky" />
        <StatCard index={2} label="Ce Mois" value={thisMonthRevenues} icon={Calendar} tone="violet" />
        <StatCard index={3} label="Moyenne" value={<>{averageRevenue.toFixed(0)} FCFA</>} icon={TrendingUp} tone="amber" />
      </StatGrid>

      {/* Search and period filters (same bar as the dashboard) */}
      <PeriodFilter
        dateFilter={dateFilter}
        dateRange={dateRange}
        onChange={(filter, range) => {
          setDateFilter(filter)
          setDateRange(range)
          setCurrentPage(1)
        }}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Rechercher des revenus..."
      >
            {/* Revenue Source Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Filtrer par source:</span>
              <Button
                variant={revenueFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setRevenueFilter('all')
                  setCurrentPage(1)
                }}
                className="text-xs h-8"
              >
                Tous
              </Button>
              <Button
                variant={revenueFilter === 'pos_product' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setRevenueFilter('pos_product')
                  setCurrentPage(1)
                }}
                className="text-xs h-8 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
              >
                Produits Vendus (POS)
              </Button>
              <Button
                variant={revenueFilter === 'pos_service' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setRevenueFilter('pos_service')
                  setCurrentPage(1)
                }}
                className="text-xs h-8 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              >
                Services Vendus (POS)
              </Button>
              <Button
                variant={revenueFilter === 'manual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setRevenueFilter('manual')
                  setCurrentPage(1)
                }}
                className="text-xs h-8 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800"
              >
                Revenus Manuels
              </Button>
            </div>
      </PeriodFilter>

      {/* Revenues Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            {revenueFilter === 'all' && 'Liste des Revenus'}
            {revenueFilter === 'pos_product' && 'Produits Vendus (POS)'}
            {revenueFilter === 'pos_service' && 'Services Vendus (POS)'}
            {revenueFilter === 'manual' && 'Revenus Manuels'}
          </CardTitle>
          {revenueFilter !== 'all' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredRevenues.length} entrée{filteredRevenues.length > 1 ? 's' : ''} trouvée{filteredRevenues.length > 1 ? 's' : ''}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : filteredRevenues.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                {revenueFilter === 'all' && 'Aucun revenu trouvé'}
                {revenueFilter === 'pos_product' && 'Aucun produit vendu (POS) trouvé'}
                {revenueFilter === 'pos_service' && 'Aucun service vendu (POS) trouvé'}
                {revenueFilter === 'manual' && 'Aucun revenu manuel trouvé'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {searchTerm ? 'Essayez de modifier vos critères de recherche.' : 'Les revenus correspondants apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Détails</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRevenues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((revenue) => (
                    <TableRow key={revenue.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getTypeColor(revenue.type, revenue.revenue_source)}>
                            {getTypeText(revenue.type, revenue.revenue_source)}
                          </Badge>
                          {revenue.revenue_source === 'manual' && (
                            <Badge variant="outline" className="text-xs">
                              Manuel
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {revenue.montant.toFixed(0)} FCFA
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {/* For POS sales, show products/services sold */}
                          {(revenue.revenue_source === 'pos_product' || revenue.revenue_source === 'pos_service') && revenue.sale?.items ? (
                            revenue.sale.items.length > 0 ? (
                              <div className="space-y-1">
                                {revenue.sale.items.slice(0, 3).map((item: any, idx: number) => (
                                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                    {item.product ? (
                                      <span>
                                        <span className="font-medium">📦 {item.product.name}</span>
                                        {item.quantite > 1 && <span className="text-gray-500"> × {item.quantite}</span>}
                                      </span>
                                    ) : item.service ? (
                                      <span>
                                        <span className="font-medium">✂️ {item.service.name}</span>
                                        {item.quantite > 1 && <span className="text-gray-500"> × {item.quantite}</span>}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
                                {revenue.sale.items.length > 3 && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    +{revenue.sale.items.length - 3} autre(s)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">Aucun détail</span>
                            )
                          ) : revenue.revenue_source === 'manual' ? (
                            // Manual revenue details
                            <div className="space-y-1">
                              {revenue.description && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Description:</span> {revenue.description}
                                </div>
                              )}
                              {revenue.type === 'service' && revenue.note ? (
                                // Manual service revenue with JSON details
                                (() => {
                                  try {
                                    const serviceDetails: {
                                      categorie?: string
                                      sous_categorie?: string
                                      type_employe?: string
                                      nom_employe?: string
                                      rating?: number
                                      note_text?: string
                                    } = JSON.parse(revenue.note)
                                    return (
                                      <>
                                        {serviceDetails.categorie && serviceDetails.categorie !== 'none' && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Catégorie:</span> {serviceDetails.categorie}
                                          </div>
                                        )}
                                        {serviceDetails.sous_categorie && serviceDetails.sous_categorie !== 'none' && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Sous-catégorie:</span> {serviceDetails.sous_categorie}
                                          </div>
                                        )}
                                        {serviceDetails.nom_employe && serviceDetails.nom_employe !== 'none' && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Employé:</span> {serviceDetails.nom_employe}
                                          </div>
                                        )}
                                        {serviceDetails.rating && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Note:</span> {serviceDetails.rating}/10
                                          </div>
                                        )}
                                        {serviceDetails.note_text && (
                                          <div className="text-xs text-gray-500 dark:text-gray-500 italic truncate max-w-xs">
                                            {serviceDetails.note_text}
                                          </div>
                                        )}
                                      </>
                                    )
                                  } catch {
                                    return (
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">Note:</span> {revenue.note}
                                      </div>
                                    )
                                  }
                                })()
                              ) : revenue.note ? (
                                // Other manual revenue with note
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Note:</span> {revenue.note}
                                </div>
                              ) : revenue.type && (
                                // Show type if no other details
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Type:</span> {revenue.type}
                                </div>
                              )}
                              {revenue.source_id && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">ID Source:</span> {revenue.source_id.slice(0, 8)}...
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(revenue.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(revenue.date).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingRevenueId(revenue.id)}
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to revenue details
                              window.location.href = `/admin/revenues/${revenue.id}`
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRevenue(revenue.id)}
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
          {Math.ceil(filteredRevenues.length / itemsPerPage) > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} sur {Math.ceil(filteredRevenues.length / itemsPerPage)} ({filteredRevenues.length} entrées)
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredRevenues.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(filteredRevenues.length / itemsPerPage)}
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
