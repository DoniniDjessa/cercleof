"use client"

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

interface Revenue {
  id: string
  type: string
  source_id?: string
  montant: number
  date: string
  note?: string
  created_at: string
  enregistre_par: string
  user?: {
    id: string
    pseudo: string
    first_name?: string
    last_name?: string
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRevenueId, setEditingRevenueId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [checkingRole, setCheckingRole] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
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
    if (user) {
      fetchUserRole()
    }
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      fetchRevenues()
      fetchExpenses()
    }
  }, [currentPage, dateFilter, dateRange, isAdmin])

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
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('dd-revenues')
        .select(`
          *,
          user:"dd-users"!enregistre_par(id, pseudo, first_name, last_name)
        `, { count: 'exact' })

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

      const { data, error, count } = await query
        .range(from, to)
        .order('date', { ascending: false })

      if (error) throw error

      setRevenues((data || []) as unknown as Revenue[])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
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
      const { error } = await supabase
        .from('dd-revenues')
        .delete()
        .eq('id', revenueId)

      if (error) throw error

      toast.success('Revenu supprimé avec succès!')
      fetchRevenues()
    } catch (error) {
      console.error('Error deleting revenue:', error)
      toast.error('Erreur lors de la suppression du revenu')
    }
  }

  const getTypeColor = (type: string) => {
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

  const getTypeText = (type: string) => {
    switch (type) {
      case 'vente': return 'Vente'
      case 'service': return 'Service'
      case 'abonnement': return 'Abonnement'
      case 'partenariat': return 'Partenariat'
      case 'investissement': return 'Investissement'
      case 'autre': return 'Autre'
      default: return type
    }
  }

  const filteredRevenues = revenues.filter(revenue =>
    revenue.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    revenue.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    revenue.source_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    revenue.user?.pseudo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    revenue.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    revenue.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate stats based on filtered data
  const totalRevenues = revenues.length
  const totalRevenueAmount = revenues.reduce((sum, revenue) => sum + revenue.montant, 0)
  const averageRevenue = totalRevenues > 0 ? totalRevenueAmount / totalRevenues : 0
  
  // Filter by current month only for "this month" stat
  const now = new Date()
  const thisMonthRevenues = revenues.filter(r => {
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalRevenueAmount.toFixed(0)}f</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{totalExpenseAmount.toFixed(0)}f</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Dépenses normales: {normalExpenseAmount.toFixed(0)}f | Finances: {financeExpenseAmount.toFixed(0)}f
              </p>
            </div>
            <div className={`bg-white dark:bg-gray-800 rounded-lg p-4 border ${profit >= 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice Net</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {profit.toFixed(0)}f
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenus</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Montant Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalRevenueAmount.toFixed(0)}f</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ce Mois</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{thisMonthRevenues}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageRevenue.toFixed(0)}f</p>
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
                placeholder="Rechercher des revenus..."
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
                <option value="month">Ce mois</option>
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

      {/* Revenues Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Revenus</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Source ID</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Enregistré par</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRevenues.map((revenue) => (
                    <TableRow key={revenue.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        <Badge className={getTypeColor(revenue.type)}>
                          {getTypeText(revenue.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {revenue.montant.toFixed(0)}f
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {revenue.source_id || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(revenue.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(revenue.date).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {revenue.user?.pseudo || 
                           (revenue.user?.first_name && revenue.user?.last_name 
                             ? `${revenue.user.first_name} ${revenue.user.last_name}` 
                             : "—")}
                        </span>
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
