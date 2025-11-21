'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Package,
  Scissors,
  Truck,
  CreditCard
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Image from 'next/image'

interface DashboardOverviewProps {
  userRole?: string
}

interface DashboardData {
  totalUsers: number
  totalClients: number
  totalSales: number
  totalRevenue: number
  totalProducts: number
  totalServices: number
  totalAppointments: number
  totalDeliveries: number
  revenueGrowth: number
  salesGrowth: number
  revenueByMonth: Array<{ month: string; revenue: number; sales: number }>
  salesByType: Array<{ name: string; value: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topServices: Array<{ name: string; count: number; revenue: number }>
  topClients: Array<{ name: string; purchases: number; revenue: number }>
}

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']

export function DashboardOverview({ userRole }: DashboardOverviewProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6) // Last 6 months

      // Fetch all data
      const [
        usersResult,
        clientsResult,
        salesResult,
        revenuesResult,
        productsResult,
        servicesResult,
        appointmentsResult,
        deliveriesResult,
        salesItemsResult
      ] = await Promise.all([
        supabase.from('dd-users').select('id').eq('is_active', true),
        supabase.from('dd-clients').select('id').eq('is_active', true),
        supabase.from('dd-ventes').select('total_net, date, type').eq('status', 'paye').gte('date', startDate.toISOString()),
        supabase.from('dd-revenues').select('montant, date').gte('date', startDate.toISOString()),
        supabase.from('dd-products').select('id, name').eq('is_active', true),
        supabase.from('dd-services').select('id, name').eq('is_active', true),
        supabase.from('dd-rdv').select('id').gte('date_rdv', startDate.toISOString()),
        supabase.from('dd-livraisons').select('id').gte('created_at', startDate.toISOString()),
        supabase.from('dd-ventes-items').select('*, product:dd-products(name), service:dd-services(name)').gte('created_at', startDate.toISOString())
      ])

      // Handle errors and extract data
      if (productsResult.error) {
        console.error('Error fetching products:', productsResult.error)
      }
      if (servicesResult.error) {
        console.error('Error fetching services:', servicesResult.error)
      }

      const users = usersResult.data
      const clients = clientsResult.data
      const sales = salesResult.data
      const revenues = revenuesResult.data
      const products = productsResult.data
      const services = servicesResult.data
      const appointments = appointmentsResult.data
      const deliveries = deliveriesResult.data
      const salesItems = salesItemsResult.data

      // Calculate totals
      const totalRevenue = (revenues?.reduce((sum, r) => sum + (r.montant || 0), 0) || 0) + 
                          (sales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0)
      
      // Calculate growth (simplified)
      const previousStartDate = new Date()
      previousStartDate.setMonth(previousStartDate.getMonth() - 12)
      const { data: prevSales } = await supabase
        .from('dd-ventes')
        .select('total_net')
        .eq('status', 'paye')
        .gte('date', previousStartDate.toISOString())
        .lt('date', startDate.toISOString())
      
      const prevSalesTotal = prevSales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
      const currentSalesTotal = sales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
      const salesGrowth = prevSalesTotal ? ((currentSalesTotal - prevSalesTotal) / prevSalesTotal) * 100 : 0

      // Revenue by month
      const revenueByMonth: { [key: string]: { revenue: number; sales: number } } = {}
      sales?.forEach(sale => {
        const month = new Date(sale.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, sales: 0 }
        }
        revenueByMonth[month].sales += sale.total_net || 0
      })
      revenues?.forEach(rev => {
        const month = new Date(rev.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, sales: 0 }
        }
        revenueByMonth[month].revenue += rev.montant || 0
      })

      // Sales by type
      const salesByType: { [key: string]: number } = {}
      sales?.forEach(sale => {
        salesByType[sale.type] = (salesByType[sale.type] || 0) + (sale.total_net || 0)
      })

      // Top products - only items with product_id and no service_id
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        // Only count as product if it has product and no service
        if (item.product && !item.service && item.product_id) {
          const name = item.product.name || 'Produit'
          if (!productSales[name]) {
            productSales[name] = { quantity: 0, revenue: 0 }
          }
          productSales[name].quantity += item.quantite || 0
          productSales[name].revenue += item.total || 0
        }
      })

      // Top services - only items with service_id and no product_id
      const serviceSales: { [key: string]: { count: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        // Only count as service if it has service and no product
        if (item.service && !item.product && item.service_id) {
          const name = item.service.name || 'Service'
          if (!serviceSales[name]) {
            serviceSales[name] = { count: 0, revenue: 0 }
          }
          serviceSales[name].count += item.quantite || 0
          serviceSales[name].revenue += item.total || 0
        }
      })

      // Top clients - fetch from sales with client info
      const clientSales: { [key: string]: { purchases: number; revenue: number } } = {}
      const { data: salesWithClients } = await supabase
        .from('dd-ventes')
        .select('total_net, client_id, client:dd-clients(id, first_name, last_name)')
        .eq('status', 'paye')
        .gte('date', startDate.toISOString())
        .not('client_id', 'is', null)

      salesWithClients?.forEach((sale: any) => {
        if (sale.client) {
          const clientName = `${sale.client.first_name || ''} ${sale.client.last_name || ''}`.trim() || 'Client anonyme'
          if (!clientSales[clientName]) {
            clientSales[clientName] = { purchases: 0, revenue: 0 }
          }
          clientSales[clientName].purchases += 1
          clientSales[clientName].revenue += sale.total_net || 0
        }
      })

      setData({
        totalUsers: users?.length || 0,
        totalClients: clients?.length || 0,
        totalSales: sales?.length || 0,
        totalRevenue,
        totalProducts: products?.length || 0,
        totalServices: services?.length || 0,
        totalAppointments: appointments?.length || 0,
        totalDeliveries: deliveries?.length || 0,
        revenueGrowth: salesGrowth,
        salesGrowth,
        revenueByMonth: Object.entries(revenueByMonth).map(([month, data]) => ({
          month,
          revenue: data.revenue,
          sales: data.sales
        })).slice(-6),
        salesByType: Object.entries(salesByType).map(([name, value]) => ({ name, value })),
        topProducts: Object.entries(productSales)
          .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        topServices: Object.entries(serviceSales)
          .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        topClients: Object.entries(clientSales)
          .map(([name, data]) => ({ name, purchases: data.purchases, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center text-gray-500">Aucune donnée disponible</div>
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header with Logo */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Image 
            src="/cbmin.png" 
            alt="Cercle Of Logo" 
            width={48}
            height={48}
            className="object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de Bord</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Vue d&apos;ensemble de votre institut</p>
          </div>
        </div>
      </div>
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/admin/clients">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Clients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalClients}</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/sales">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ventes</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalSales}</p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/revenues">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Revenus</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(data.totalRevenue)}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Croissance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.revenueGrowth >= 0 ? '+' : ''}{data.revenueGrowth.toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Revenus par Mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.revenueByMonth}>
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
                <Line type="monotone" dataKey="revenue" stroke="#9333ea" strokeWidth={2} name="Revenus" />
                <Line type="monotone" dataKey="sales" stroke="#a855f7" strokeWidth={2} name="Ventes" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Type */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Ventes par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.salesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.salesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Stats Overview */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Vue d'ensemble</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/admin/products">
              <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Produits</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{data.totalProducts}</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/admin/services">
              <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Scissors className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Services</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{data.totalServices}</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/admin/appointments">
              <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Rendez-vous</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{data.totalAppointments}</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link href="/admin/deliveries">
              <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Livraisons</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{data.totalDeliveries}</p>
                  </div>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Link href="/admin/products">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Top Produits</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topProducts.length > 0 ? (
                data.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {product.quantity} vendus
                      </p>
                    </div>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucun produit vendu</p>
              )}
            </div>
          </CardContent>
          </Card>
        </Link>

        {/* Top Services */}
        <Link href="/admin/services">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Top Services</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topServices.length > 0 ? (
                data.topServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{service.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {service.count} vendus
                      </p>
                    </div>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(service.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucun service vendu</p>
              )}
            </div>
          </CardContent>
          </Card>
        </Link>

        {/* Top Clients */}
        <Link href="/admin/clients">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Top Clients</CardTitle>
            </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topClients.length > 0 ? (
                data.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{client.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {client.purchases} achat{client.purchases > 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(client.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">Aucun client</p>
              )}
            </div>
          </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}

