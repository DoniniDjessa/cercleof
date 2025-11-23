'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  CreditCard,
  X
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
  const [selectedModal, setSelectedModal] = useState<'clients' | 'sales' | 'revenue' | 'growth' | null>(null)
  const [modalDetails, setModalDetails] = useState<any>(null)
  const [loadingModal, setLoadingModal] = useState(false)

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

  const fetchModalDetails = async (type: 'clients' | 'sales' | 'revenue' | 'growth') => {
    try {
      setLoadingModal(true)
      setSelectedModal(type)
      
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6)
      
      switch (type) {
        case 'clients':
          const { data: clientsData } = await supabase
            .from('dd-clients')
            .select('id, first_name, last_name, email, phone, created_at, total_spent, last_visit_date')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10)
          
          setModalDetails({
            title: 'Détails des Clients',
            total: data?.totalClients || 0,
            items: clientsData || []
          })
          break
          
        case 'sales':
          const { data: salesData } = await supabase
            .from('dd-ventes')
            .select('id, date, total_net, type, status')
            .eq('status', 'paye')
            .gte('date', startDate.toISOString())
            .order('date', { ascending: false })
            .limit(10)
          
          const salesTotal = (salesData || []).reduce((sum: number, s: any) => sum + (s.total_net || 0), 0)
          setModalDetails({
            title: 'Détails des Ventes',
            total: data?.totalSales || 0,
            totalAmount: salesTotal,
            items: salesData || []
          })
          break
          
        case 'revenue':
          const [revenuesData, salesForRevenue] = await Promise.all([
            supabase.from('dd-revenues').select('id, montant, date, description').gte('date', startDate.toISOString()).order('date', { ascending: false }),
            supabase.from('dd-ventes').select('id, date, total_net').eq('status', 'paye').gte('date', startDate.toISOString()).order('date', { ascending: false })
          ])
          
          const saleIds = (salesForRevenue.data || []).map((s: any) => s.id)
          
          // Fetch sale items with totals to properly categorize and split mixed sales
          let saleItemsWithTotals: Array<{ vente_id: string; product_id?: string; service_id?: string; total: number }> = []
          if (saleIds.length > 0) {
            const { data: items } = await supabase
              .from('dd-ventes-items')
              .select('vente_id, product_id, service_id, total')
              .in('vente_id', saleIds)
              .gte('created_at', startDate.toISOString())
            saleItemsWithTotals = (items || []).map((item: any) => ({
              vente_id: item.vente_id,
              product_id: item.product_id,
              service_id: item.service_id,
              total: typeof item.total === 'number' ? item.total : parseFloat(String(item.total)) || 0
            }))
          }
          
          // Categorize sales with proper splitting for mixed sales
          let produitsVendusAmount = 0
          let servicesAmount = 0
          
          (salesForRevenue.data || []).forEach((sale: any) => {
            const items = saleItemsWithTotals.filter((item) => item.vente_id === sale.id)
            
            if (items.length === 0) {
              // Sale with no items - count as products
              produitsVendusAmount += sale.total_net || 0
              return
            }
            
            const productItems = items.filter((item) => item.product_id && !item.service_id)
            const serviceItems = items.filter((item) => item.service_id && !item.product_id)
            const productItemsTotal = productItems.reduce((sum, item) => sum + item.total, 0)
            const serviceItemsTotal = serviceItems.reduce((sum, item) => sum + item.total, 0)
            const itemsTotal = productItemsTotal + serviceItemsTotal
            
            if (productItems.length > 0 && serviceItems.length === 0) {
              // Pure product sale
              produitsVendusAmount += sale.total_net || 0
            } else if (serviceItems.length > 0 && productItems.length === 0) {
              // Pure service sale
              servicesAmount += sale.total_net || 0
            } else if (productItems.length > 0 && serviceItems.length > 0) {
              // Mixed sale - split based on item totals proportion
              if (itemsTotal > 0) {
                const productRatio = productItemsTotal / itemsTotal
                const serviceRatio = serviceItemsTotal / itemsTotal
                produitsVendusAmount += (sale.total_net || 0) * productRatio
                servicesAmount += (sale.total_net || 0) * serviceRatio
              } else {
                // Fallback: split 50/50 if no item totals
                const halfAmount = (sale.total_net || 0) / 2
                produitsVendusAmount += halfAmount
                servicesAmount += halfAmount
              }
            } else {
              // Unknown - count as products
              produitsVendusAmount += sale.total_net || 0
            }
          })
          
          const revenusManuelsAmount = (revenuesData.data || []).reduce((sum: number, r: any) => sum + (r.montant || 0), 0)
          
          // Calculate actual total to verify
          const calculatedTotal = produitsVendusAmount + servicesAmount + revenusManuelsAmount
          
          setModalDetails({
            title: 'Détails des Revenus',
            total: data?.totalRevenue || calculatedTotal,
            breakdown: {
              produitsVendus: produitsVendusAmount,
              services: servicesAmount,
              revenusManuels: revenusManuelsAmount
            },
            revenues: revenuesData.data?.slice(0, 10) || [],
            sales: salesForRevenue.data?.slice(0, 10) || []
          })
          break
          
        case 'growth':
          const prevStartDate = new Date()
          prevStartDate.setMonth(prevStartDate.getMonth() - 12)
          const currentStartDate = new Date()
          currentStartDate.setMonth(currentStartDate.getMonth() - 6)
          
          const [prevPeriod, currentPeriod] = await Promise.all([
            supabase.from('dd-ventes').select('total_net, date').eq('status', 'paye').gte('date', prevStartDate.toISOString()).lt('date', currentStartDate.toISOString()),
            supabase.from('dd-ventes').select('total_net, date').eq('status', 'paye').gte('date', currentStartDate.toISOString())
          ])
          
          const prevTotal = prevPeriod.data?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
          const currentTotal = currentPeriod.data?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
          const growth = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0
          
          setModalDetails({
            title: 'Détails de la Croissance',
            growth: data?.revenueGrowth || 0,
            prevPeriodTotal: prevTotal,
            currentPeriodTotal: currentTotal,
            prevPeriodCount: prevPeriod.data?.length || 0,
            currentPeriodCount: currentPeriod.data?.length || 0
          })
          break
      }
    } catch (error) {
      console.error('Error fetching modal details:', error)
    } finally {
      setLoadingModal(false)
    }
  }
  
  const closeModal = () => {
    setSelectedModal(null)
    setModalDetails(null)
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
        <Card 
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
          onClick={() => fetchModalDetails('clients')}
        >
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

        <Card 
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
          onClick={() => fetchModalDetails('sales')}
        >
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

        <Card 
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
          onClick={() => fetchModalDetails('revenue')}
        >
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

        <Card 
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-purple-300 dark:hover:border-purple-600"
          onClick={() => fetchModalDetails('growth')}
        >
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

      {/* Summary Modals */}
      {selectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{modalDetails?.title || 'Détails'}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {loadingModal ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : modalDetails && (
                <div className="space-y-4">
                  {selectedModal === 'clients' && (
                    <>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total de clients</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{modalDetails.total}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Derniers clients ajoutés</h3>
                        <div className="space-y-2">
                          {modalDetails.items.length > 0 ? (
                            modalDetails.items.map((client: any) => (
                              <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{client.first_name} {client.last_name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {client.email || client.phone || 'Pas de contact'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                    {client.total_spent ? formatCurrency(client.total_spent) : '0f'}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {client.last_visit_date ? new Date(client.last_visit_date).toLocaleDateString('fr-FR') : 'Jamais'}
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun client trouvé</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModal === 'sales' && (
                    <>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total de ventes (6 derniers mois)</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{modalDetails.total}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Montant total: {formatCurrency(modalDetails.totalAmount || 0)}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dernières ventes</h3>
                        <div className="space-y-2">
                          {modalDetails.items.length > 0 ? (
                            modalDetails.items.map((sale: any) => (
                              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {sale.client ? `${sale.client.first_name} ${sale.client.last_name}` : 'Client anonyme'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(sale.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(sale.total_net || 0)}
                                  </p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{sale.type || 'N/A'}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune vente trouvée</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModal === 'revenue' && (
                    <>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Revenus totaux (6 derniers mois)</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(modalDetails.total)}
                        </p>
                      </div>
                      {modalDetails.breakdown && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Produits Vendus</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(modalDetails.breakdown.produitsVendus || 0)}
                            </p>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Services</p>
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(modalDetails.breakdown.services || 0)}
                            </p>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Revenus Manuels</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {formatCurrency(modalDetails.breakdown.revenusManuels || 0)}
                            </p>
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Derniers revenus enregistrés</h3>
                        <div className="space-y-2">
                          {modalDetails.revenues && modalDetails.revenues.length > 0 ? (
                            modalDetails.revenues.map((revenue: any) => (
                              <div key={revenue.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {revenue.description || 'Revenu'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(revenue.date).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(revenue.montant || 0)}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aucun revenu enregistré</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedModal === 'growth' && (
                    <>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Croissance des revenus</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {modalDetails.growth >= 0 ? '+' : ''}{modalDetails.growth.toFixed(1)}%
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Période précédente (6-12 mois)</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(modalDetails.prevPeriodTotal || 0)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {modalDetails.prevPeriodCount || 0} ventes
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Période actuelle (6 derniers mois)</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatCurrency(modalDetails.currentPeriodTotal || 0)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {modalDetails.currentPeriodCount || 0} ventes
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {modalDetails.growth >= 0 ? (
                            <>La croissance est <span className="font-bold text-green-600 dark:text-green-400">positive</span> avec une augmentation de {modalDetails.growth.toFixed(1)}% par rapport à la période précédente.</>
                          ) : (
                            <>La croissance est <span className="font-bold text-red-600 dark:text-red-400">négative</span> avec une baisse de {Math.abs(modalDetails.growth).toFixed(1)}% par rapport à la période précédente.</>
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-end mt-6">
                    <Button variant="outline" onClick={closeModal}>
                      Fermer
                    </Button>
                    <Link href={
                      selectedModal === 'clients' ? '/admin/clients' :
                      selectedModal === 'sales' ? '/admin/sales' :
                      selectedModal === 'revenue' ? '/admin/revenues' :
                      '/admin'
                    } className="ml-2">
                      <Button>
                        Voir tout
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

