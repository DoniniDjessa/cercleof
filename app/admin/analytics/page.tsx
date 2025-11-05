"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Calendar,
  Scissors,
  Truck,
  CreditCard
} from "lucide-react"

interface AnalyticsData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalSales: number
  totalClients: number
  totalProducts: number
  totalServices: number
  totalAppointments: number
  totalDeliveries: number
  averageSale: number
  revenueGrowth: number
  expenseGrowth: number
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const days = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      // Fetch revenues
      const { data: revenues, error: revenuesError } = await supabase
        .from('dd-revenues')
        .select('montant, date')
        .gte('date', startDate.toISOString())

      if (revenuesError) throw revenuesError

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('dd-depenses')
        .select('montant, date')
        .gte('date', startDate.toISOString())

      if (expensesError) throw expensesError

      // Fetch sales
      const { data: sales, error: salesError } = await supabase
        .from('dd-ventes')
        .select('total_net, date')
        .eq('status', 'paye')
        .gte('date', startDate.toISOString())

      if (salesError) throw salesError

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from('dd-clients')
        .select('id, created_at')
        .eq('is_active', true)
        .gte('created_at', startDate.toISOString())

      if (clientsError) throw clientsError

      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('dd-products')
        .select('id')
        .eq('is_active', true)

      if (productsError) throw productsError

      // Fetch services
      const { data: services, error: servicesError } = await supabase
        .from('dd-services')
        .select('id')
        .eq('actif', true)

      if (servicesError) throw servicesError

      // Fetch appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('dd-rdv')
        .select('id, date_rdv')
        .gte('date_rdv', startDate.toISOString())

      if (appointmentsError) throw appointmentsError

      // Fetch deliveries
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('dd-livraisons')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())

      if (deliveriesError) throw deliveriesError

      // Calculate totals
      const totalRevenue = revenues?.reduce((sum, r) => sum + r.montant, 0) || 0
      const totalExpenses = expenses?.reduce((sum, e) => sum + e.montant, 0) || 0
      const totalSales = sales?.reduce((sum, s) => sum + s.total_net, 0) || 0
      const netProfit = totalRevenue + totalSales - totalExpenses
      const averageSale = sales?.length ? totalSales / sales.length : 0

      // Calculate growth (simplified - comparing with previous period)
      const previousStartDate = new Date()
      previousStartDate.setDate(previousStartDate.getDate() - (days * 2))
      
      const { data: prevRevenues } = await supabase
        .from('dd-revenues')
        .select('montant')
        .gte('date', previousStartDate.toISOString())
        .lt('date', startDate.toISOString())

      const { data: prevExpenses } = await supabase
        .from('dd-depenses')
        .select('montant')
        .gte('date', previousStartDate.toISOString())
        .lt('date', startDate.toISOString())

      const prevRevenue = prevRevenues?.reduce((sum, r) => sum + r.montant, 0) || 0
      const prevExpense = prevExpenses?.reduce((sum, e) => sum + e.montant, 0) || 0

      const revenueGrowth = prevRevenue ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const expenseGrowth = prevExpense ? ((totalExpenses - prevExpense) / prevExpense) * 100 : 0

      setAnalyticsData({
        totalRevenue: totalRevenue + totalSales,
        totalExpenses,
        netProfit,
        totalSales: sales?.length || 0,
        totalClients: clients?.length || 0,
        totalProducts: products?.length || 0,
        totalServices: services?.length || 0,
        totalAppointments: appointments?.length || 0,
        totalDeliveries: deliveries?.length || 0,
        averageSale,
        revenueGrowth,
        expenseGrowth
      })

    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + 'f'
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Rapports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Tableau de bord et indicateurs de performance</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline" size="sm" className="text-xs">
            Actualiser
          </Button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Key Metrics - Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Clients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalClients}</p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ventes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalSales}</p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Revenus</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Croissance</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatPercentage(analyticsData.revenueGrowth)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row - Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Revenus par Période</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aujourd'hui</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(analyticsData.totalRevenue / 30)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cette Semaine</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(analyticsData.totalRevenue / 4)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ce Mois</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(analyticsData.totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Vue d'ensemble</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Produits</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{analyticsData.totalProducts}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Services</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{analyticsData.totalServices}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Rendez-vous</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{analyticsData.totalAppointments}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Livraisons</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{analyticsData.totalDeliveries}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Financial Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Dépenses</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.totalExpenses)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className={`text-xs ${analyticsData.expenseGrowth <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(analyticsData.expenseGrowth)} vs période précédente
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bénéfice Net</p>
                    <p className={`text-xl font-bold ${analyticsData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(analyticsData.netProfit)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Revenus - Dépenses
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Panier Moyen</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.averageSale)}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Par transaction
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
