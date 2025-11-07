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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Eye, Trash2, TrendingDown, DollarSign, Plus, Calendar } from "lucide-react"
import { AddExpense } from "@/components/financial/add-expense"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Expense {
  id: string
  categorie: string
  montant: number
  date: string
  fournisseur_id?: string
  note?: string
  created_at: string
  enregistre_par: string
  user?: {
    id: string
    first_name: string
    last_name: string
  }
  linked_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

export default function ExpensesPage() {
  const { user: authUser } = useAuth()
  const searchParams = useSearchParams()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [activeTab, setActiveTab] = useState<'main' | 'finances'>('main')
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const itemsPerPage = 20

  // Finance expense categories (admin only)
  const financeCategories = ['salaire', 'salaire_travailleur']
  const normalCategories = ['achat_produits', 'charges', 'loyer', 'electricite', 'eau', 'internet', 'marketing', 'equipement', 'formation', 'transport', 'maintenance', 'repair', 'food', 'autre']

  useEffect(() => {
    fetchCurrentUserRole()
  }, [authUser])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when tab changes
  }, [activeTab])

  useEffect(() => {
    fetchExpenses()
  }, [currentPage, dateFilter, dateRange, activeTab])

  const fetchCurrentUserRole = async () => {
    if (!authUser) return
    
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error) throw error

      const role = data?.role || ''
      setCurrentUserRole(role)
      setIsAdmin(role === 'admin' || role === 'superadmin')
    } catch (error) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('dd-depenses')
        .select(`
          *,
          user:dd-users!enregistre_par(id, first_name, last_name)
        `, { count: 'exact' })

      // Note: We'll filter by category after fetching since Supabase doesn't support NOT IN easily

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

      // Filter by tab type
      let filteredData: Expense[] = (data || []) as unknown as Expense[]
      if (activeTab === 'main') {
        // Main expenses: exclude finance categories
        filteredData = filteredData.filter((exp: Expense) => !financeCategories.includes(exp.categorie))
      } else if (activeTab === 'finances') {
        // Finances tab: show only finance categories (admin only)
        filteredData = filteredData.filter((exp: Expense) => financeCategories.includes(exp.categorie))
      }

      // For finance expenses, fetch linked user info if fournisseur_id exists
      if (activeTab === 'finances' && filteredData.length > 0) {
        const fournisseurIds = filteredData
          .filter(exp => exp.fournisseur_id)
          .map(exp => exp.fournisseur_id)
          .filter((id): id is string => !!id)

        if (fournisseurIds.length > 0) {
          const { data: linkedUsers } = await supabase
            .from('dd-users')
            .select('id, first_name, last_name')
            .in('id', fournisseurIds)

          // Map linked users to expenses
          filteredData = filteredData.map(exp => {
            if (exp.fournisseur_id && linkedUsers) {
              const linkedUser = linkedUsers.find(u => u.id === exp.fournisseur_id)
              return { ...exp, linked_user: linkedUser || undefined }
            }
            return exp
          }) as Expense[]
        }
      }

      setExpenses(filteredData)
      // Recalculate total pages based on filtered data
      // Since we filter after fetching, we need to get the actual count
      const financeCount = ((data || []) as unknown as Expense[]).filter((exp: Expense) => financeCategories.includes(exp.categorie)).length
      const normalCount = ((data || []) as unknown as Expense[]).filter((exp: Expense) => !financeCategories.includes(exp.categorie)).length
      const totalFiltered = activeTab === 'main' ? normalCount : financeCount
      setTotalPages(Math.max(1, Math.ceil(totalFiltered / itemsPerPage)))
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.error('Erreur lors du chargement des dépenses')
    } finally {
      setLoading(false)
    }
  }

  const deleteExpense = async (expenseId: string) => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas la permission de supprimer des dépenses')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-depenses')
        .delete()
        .eq('id', expenseId)

      if (error) throw error

      toast.success('Dépense supprimée avec succès!')
      fetchExpenses()
    } catch (error) {
      console.error('Error deleting expense:', error)
      toast.error('Erreur lors de la suppression de la dépense')
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'achat_produits':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'salaire':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'charges':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'loyer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'electricite':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'eau':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400'
      case 'internet':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
      case 'marketing':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400'
      case 'equipement':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'formation':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400'
      case 'transport':
        return 'bg-lime-100 text-lime-800 dark:bg-lime-900/20 dark:text-lime-400'
      case 'maintenance':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'autre':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'achat_produits': return 'Achat Produits'
      case 'salaire': return 'Salaire'
      case 'salaire_travailleur': return 'Salaire Travailleur'
      case 'charges': return 'Charges'
      case 'loyer': return 'Loyer'
      case 'electricite': return 'Électricité'
      case 'eau': return 'Eau'
      case 'internet': return 'Internet'
      case 'marketing': return 'Marketing'
      case 'equipement': return 'Équipement'
      case 'formation': return 'Formation'
      case 'transport': return 'Transport'
      case 'maintenance': return 'Maintenance'
      case 'repair': return 'Réparation'
      case 'food': return 'Nourriture'
      case 'autre': return 'Autre'
      default: return category
    }
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.categorie.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.fournisseur_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.user?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalExpenses = expenses.length
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.montant, 0)
  const averageExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0
  const thisMonthExpenses = expenses.filter(e => {
    const expenseDate = new Date(e.date)
    const now = new Date()
    return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
  }).length

  if (showCreateForm) {
    return <AddExpense onExpenseCreated={fetchExpenses} expenseType={activeTab} isAdmin={isAdmin} />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Dépenses</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez toutes vos dépenses et sorties d'argent</p>
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
          {activeTab === 'finances' ? 'Nouvelle Dépense Finance' : 'Nouvelle Dépense'}
        </AnimatedButton>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'main' | 'finances')}>
        <TabsList className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <TabsTrigger value="main">Dépenses</TabsTrigger>
          {isAdmin && <TabsTrigger value="finances">Finances</TabsTrigger>}
        </TabsList>

        <TabsContent value="main" className="mt-4">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Montant Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAmount.toFixed(0)}f</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{thisMonthExpenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{averageExpense.toFixed(0)}f</p>
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
                placeholder="Rechercher des dépenses..."
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

      {/* Expenses Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Catégorie</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Fournisseur ID</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Enregistré par</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        <Badge className={getCategoryColor(expense.categorie)}>
                          {getCategoryText(expense.categorie)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {expense.montant.toFixed(0)}f
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {activeTab === 'finances' && expense.linked_user
                            ? `${expense.linked_user.first_name} ${expense.linked_user.last_name}`
                            : expense.fournisseur_id || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(expense.date).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(expense.date).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {expense.user ? `${expense.user.first_name} ${expense.user.last_name}` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to expense details
                              window.location.href = `/admin/expenses/${expense.id}`
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="finances" className="mt-4">
            {/* Stats Cards for Finances */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses Finances</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                      <DollarSign className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Montant Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {expenses.reduce((sum, expense) => sum + expense.montant, 0).toFixed(0)}f
                      </p>
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
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {expenses.filter(e => {
                          const expenseDate = new Date(e.date)
                          const now = new Date()
                          return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear()
                        }).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Moyenne</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {expenses.length > 0 
                          ? (expenses.reduce((sum, expense) => sum + expense.montant, 0) / expenses.length).toFixed(0)
                          : '0'}f
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filters for Finances */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher des dépenses finances..."
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

            {/* Finances Expenses Table */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Liste des Dépenses Finances</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <TableLoadingState />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 dark:border-gray-700">
                          <TableHead className="text-gray-700 dark:text-gray-300">Catégorie</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Montant</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">
                            {activeTab === 'finances' ? 'Utilisateur/Travailleur' : 'Fournisseur ID'}
                          </TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Enregistré par</TableHead>
                          <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.map((expense) => (
                          <TableRow key={expense.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <TableCell>
                              <Badge className={getCategoryColor(expense.categorie)}>
                                {getCategoryText(expense.categorie)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {expense.montant.toFixed(0)}f
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-900 dark:text-white">
                                {expense.linked_user
                                  ? `${expense.linked_user.first_name} ${expense.linked_user.last_name}`
                                  : expense.fournisseur_id || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {new Date(expense.date).toLocaleDateString('fr-FR')}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(expense.date).toLocaleTimeString('fr-FR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-gray-900 dark:text-white">
                                {expense.user ? `${expense.user.first_name} ${expense.user.last_name}` : "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.location.href = `/admin/expenses/${expense.id}`
                                  }}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteExpense(expense.id)}
                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
