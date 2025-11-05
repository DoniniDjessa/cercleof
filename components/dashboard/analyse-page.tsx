'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
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
  CreditCard,
  RefreshCw
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { toast } from 'react-hot-toast'

interface AnalysePageProps {
  userRole?: string
}

interface AnalyseData {
  revenueByMonth: Array<{ month: string; revenue: number; expenses: number; profit: number }>
  salesByDay: Array<{ day: string; sales: number; count: number }>
  productsByCategory: Array<{ category: string; count: number; revenue: number }>
  clientsByMonth: Array<{ month: string; new: number; total: number }>
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>
  topSellingServices: Array<{ name: string; count: number; revenue: number }>
  paymentMethods: Array<{ method: string; count: number; amount: number }>
}

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']

export function AnalysePage({ userRole }: AnalysePageProps) {
  const [data, setData] = useState<AnalyseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalyseData()
  }, [timeRange])

  const fetchAnalyseData = async () => {
    try {
      setLoading(true)
      const days = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Fetch all data
      const [
        { data: sales },
        { data: revenues },
        { data: expenses },
        { data: clients },
        { data: products },
        { data: services },
        { data: salesItems },
        { data: appointments }
      ] = await Promise.all([
        supabase.from('dd-ventes').select('total_net, date, methode_paiement').eq('status', 'paye').gte('date', startDate.toISOString()),
        supabase.from('dd-revenues').select('montant, date').gte('date', startDate.toISOString()),
        supabase.from('dd-depenses').select('montant, date').gte('date', startDate.toISOString()),
        supabase.from('dd-clients').select('id, created_at').gte('created_at', startDate.toISOString()),
        supabase.from('dd-products').select('id, name, category_id').eq('is_active', true),
        supabase.from('dd-services').select('id, name').eq('actif', true),
        supabase.from('dd-ventes-items').select('*, product:dd-products(name, category_id), service:dd-services(name)').gte('created_at', startDate.toISOString()),
        supabase.from('dd-rdv').select('id, service_id, date_rdv').gte('date_rdv', startDate.toISOString())
      ])

      // Revenue by month
      const revenueByMonth: { [key: string]: { revenue: number; expenses: number; profit: number } } = {}
      sales?.forEach(sale => {
        const month = new Date(sale.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].revenue += sale.total_net || 0
      })
      revenues?.forEach(rev => {
        const month = new Date(rev.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].revenue += rev.montant || 0
      })
      expenses?.forEach(exp => {
        const month = new Date(exp.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].expenses += exp.montant || 0
      })
      Object.keys(revenueByMonth).forEach(month => {
        revenueByMonth[month].profit = revenueByMonth[month].revenue - revenueByMonth[month].expenses
      })

      // Sales by day
      const salesByDay: { [key: string]: { sales: number; count: number } } = {}
      sales?.forEach(sale => {
        const day = new Date(sale.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        if (!salesByDay[day]) {
          salesByDay[day] = { sales: 0, count: 0 }
        }
        salesByDay[day].sales += sale.total_net || 0
        salesByDay[day].count += 1
      })

      // Payment methods
      const paymentMethods: { [key: string]: { count: number; amount: number } } = {}
      sales?.forEach(sale => {
        const method = sale.methode_paiement || 'cash'
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, amount: 0 }
        }
        paymentMethods[method].count += 1
        paymentMethods[method].amount += sale.total_net || 0
      })

      // Top selling products
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.product) {
          const name = item.product.name || 'Produit'
          if (!productSales[name]) {
            productSales[name] = { quantity: 0, revenue: 0 }
          }
          productSales[name].quantity += item.quantite || 0
          productSales[name].revenue += item.total || 0
        }
      })

      // Top selling services
      const serviceSales: { [key: string]: { count: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.service) {
          const name = item.service.name || 'Service'
          if (!serviceSales[name]) {
            serviceSales[name] = { count: 0, revenue: 0 }
          }
          serviceSales[name].count += item.quantite || 0
          serviceSales[name].revenue += item.total || 0
        }
      })

      // Clients by month
      const clientsByMonth: { [key: string]: { new: number; total: number } } = {}
      clients?.forEach(client => {
        const month = new Date(client.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!clientsByMonth[month]) {
          clientsByMonth[month] = { new: 0, total: 0 }
        }
        clientsByMonth[month].new += 1
      })
      let total = 0
      Object.keys(clientsByMonth).forEach(month => {
        total += clientsByMonth[month].new
        clientsByMonth[month].total = total
      })

      setData({
        revenueByMonth: Object.entries(revenueByMonth).map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.profit
        })).slice(-6),
        salesByDay: Object.entries(salesByDay).map(([day, data]) => ({
          day,
          sales: data.sales,
          count: data.count
        })).slice(-14),
        productsByCategory: [],
        clientsByMonth: Object.entries(clientsByMonth).map(([month, data]) => ({
          month,
          new: data.new,
          total: data.total
        })),
        topSellingProducts: Object.entries(productSales)
          .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        topSellingServices: Object.entries(serviceSales)
          .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount
        }))
      })
    } catch (error) {
      console.error('Error fetching analyse data:', error)
      toast.error('Erreur lors du chargement des données')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Chargement des analyses...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-gray-500">Aucune donnée disponible</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analyses Précises</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Analyses détaillées basées sur toutes vos données</p>
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
          <Button onClick={fetchAnalyseData} variant="outline" size="sm" className="text-xs">
            <RefreshCw className="w-3 h-3 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Analysis */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Analyse Revenus/Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }} 
                />
                <Legend fontSize={10} />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#9333ea" fill="#9333ea" fillOpacity={0.6} name="Revenus" />
                <Area type="monotone" dataKey="expenses" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Dépenses" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.4} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Day */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Ventes par Jour</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }} 
                />
                <Legend fontSize={10} />
                <Bar dataKey="sales" fill="#9333ea" name="Montant" />
                <Bar dataKey="count" fill="#a855f7" name="Nombre" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clients Growth */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Croissance Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.clientsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }} 
                />
                <Legend fontSize={10} />
                <Line type="monotone" dataKey="new" stroke="#9333ea" strokeWidth={2} name="Nouveaux" />
                <Line type="monotone" dataKey="total" stroke="#a855f7" strokeWidth={2} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Méthodes de Paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="method" stroke="#6b7280" fontSize={10} />
                <YAxis stroke="#6b7280" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }} 
                />
                <Legend fontSize={10} />
                <Bar dataKey="count" fill="#9333ea" name="Nombre" />
                <Bar dataKey="amount" fill="#a855f7" name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Top Produits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topSellingProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {product.quantity} vendus
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topSellingServices.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{service.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {service.count} vendus
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(service.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

