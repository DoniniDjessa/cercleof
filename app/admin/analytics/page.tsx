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
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Analytics & Rapports</h1>
          <p className="text-muted-foreground dark:text-gray-400">Tableau de bord et indicateurs de performance</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline">
            Actualiser
          </Button>
        </div>
      </div>

      {analyticsData && (
        <>
          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenus Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.totalRevenue)}
                    </p>
                    <p className={`text-xs ${analyticsData.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(analyticsData.revenueGrowth)} vs période précédente
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dépenses Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.totalExpenses)}
                    </p>
                    <p className={`text-xs ${analyticsData.expenseGrowth <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(analyticsData.expenseGrowth)} vs période précédente
                    </p>
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
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice Net</p>
                    <p className={`text-2xl font-bold ${analyticsData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(analyticsData.netProfit)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Panier Moyen</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(analyticsData.averageSale)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouveaux Clients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalClients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Produits Actifs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalProducts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
                    <Scissors className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services Actifs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalServices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rendez-vous</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalAppointments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Operations Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                    <CreditCard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ventes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalSales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/20 rounded-lg">
                    <Truck className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Livraisons</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.totalDeliveries}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux de Conversion</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {analyticsData.totalClients > 0 ? 
                        ((analyticsData.totalSales / analyticsData.totalClients) * 100).toFixed(1) : 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
