'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useDashboardYear } from '@/contexts/DashboardYearContext'
import {
  MONTH_OPTIONS,
  RelativeDayFilter,
  RevenueChartMode,
  buildEmptyMonthSeries,
  buildEmptyWeekSeries,
  buildEmptyWeekdaySeries,
  buildEmptyYearSeries,
  getBucketKey,
  getPreviousPeriod,
  getRevenueChartRange,
  resolveActiveFilterMode,
  resolveDashboardDateRange,
} from '@/lib/dashboard-date-utils'
import {
  Users,
  ShoppingCart,
  Calendar,
  BarChart3,
  DollarSign,
  Package,
  Scissors,
  Truck,
  X,
  Filter,
  RefreshCw,
  LayoutDashboard,
  PieChart as PieIcon,
} from 'lucide-react'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { StatCard, StatGrid, TONES } from '@/components/ui/stat-card'
import { PageHeader, SectionTitle, EmptyState } from '@/components/ui/page-header'

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
  salesByType: Array<{ name: string; value: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topServices: Array<{ name: string; count: number; revenue: number }>
  topClients: Array<{ name: string; purchases: number; revenue: number }>
  periodLabel: string
}

type RevenueChartPoint = { label: string; revenue: number; sales: number }

// Categorical palette (distinct hues, readable on light and dark)
const COLORS = ['#c9a227', '#8f6b1f', '#e07f24', '#dfc27a', '#f59e0b', '#a89d8c']

const CHART_TITLES: Record<RevenueChartMode, string> = {
  month: 'Revenus par Mois',
  week: 'Revenus par Semaine',
  weekday: 'Revenus par Jour de la Semaine',
  year: 'Revenus par Année',
}

export function DashboardOverview({ userRole }: DashboardOverviewProps) {
  const currentYear = new Date().getFullYear()
  const { selectedYear, availableYears } = useDashboardYear()

  const [data, setData] = useState<DashboardData | null>(null)
  const [revenueChart, setRevenueChart] = useState<RevenueChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [selectedModal, setSelectedModal] = useState<'clients' | 'sales' | 'revenue' | 'growth' | null>(null)
  const [modalDetails, setModalDetails] = useState<any>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  const [relativeDay, setRelativeDay] = useState<RelativeDayFilter | ''>('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterRangeStart, setFilterRangeStart] = useState('')
  const [filterRangeEnd, setFilterRangeEnd] = useState('')

  const [chartMode, setChartMode] = useState<RevenueChartMode>('month')
  const [chartYear, setChartYear] = useState(currentYear)

  useEffect(() => {
    fetchDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, relativeDay, filterMonth, filterRangeStart, filterRangeEnd])

  useEffect(() => {
    fetchChartData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartMode, chartYear, availableYears])

  const getActiveDateRange = () => {
    const mode = resolveActiveFilterMode({
      relativeDay,
      month: filterMonth,
      rangeStart: filterRangeStart,
      rangeEnd: filterRangeEnd,
    })
    return resolveDashboardDateRange({
      mode,
      relativeDay,
      month: filterMonth,
      rangeStart: filterRangeStart,
      rangeEnd: filterRangeEnd,
      year: selectedYear,
    })
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const range = getActiveDateRange()
      const previousRange = getPreviousPeriod(range)

      const [
        usersResult,
        clientsResult,
        salesResult,
        revenuesResult,
        productsResult,
        servicesResult,
        appointmentsResult,
        deliveriesResult,
        salesItemsResult,
      ] = await Promise.all([
        supabase.from('dd-users').select('id').eq('is_active', true),
        supabase.from('dd-clients').select('id').eq('is_active', true),
        supabase
          .from('dd-ventes')
          .select('total_net, date, type')
          .eq('status', 'paye')
          .gte('date', range.start.toISOString())
          .lte('date', range.end.toISOString()),
        supabase
          .from('dd-revenues')
          .select('montant, date, source_id')
          .gte('date', range.start.toISOString())
          .lte('date', range.end.toISOString()),
        supabase.from('dd-products').select('id, name').eq('is_active', true),
        supabase.from('dd-services').select('id, name').eq('is_active', true),
        supabase
          .from('dd-rdv')
          .select('id')
          .gte('date_rdv', range.start.toISOString())
          .lte('date_rdv', range.end.toISOString()),
        supabase
          .from('dd-livraisons')
          .select('id')
          .gte('created_at', range.start.toISOString())
          .lte('created_at', range.end.toISOString()),
        supabase
          .from('dd-ventes-items')
          .select('*, product:dd-products(name), service:dd-services(name)')
          .gte('created_at', range.start.toISOString())
          .lte('created_at', range.end.toISOString()),
      ])

      if (productsResult.error) console.error('Error fetching products:', productsResult.error)
      if (servicesResult.error) console.error('Error fetching services:', servicesResult.error)

      const users = usersResult.data
      const clients = clientsResult.data
      const sales = salesResult.data
      const revenues = revenuesResult.data
      const products = productsResult.data
      const services = servicesResult.data
      const appointments = appointmentsResult.data
      const deliveries = deliveriesResult.data
      const salesItems = salesItemsResult.data

      const manualRevenuesOnly = revenues?.filter((r: any) => !r.source_id) || []
      const manualRevenuesAmount = manualRevenuesOnly.reduce((sum: number, r: any) => sum + (r.montant || 0), 0)
      const posSalesAmount = sales?.reduce((sum: number, s: any) => sum + (s.total_net || 0), 0) || 0
      const totalRevenue = manualRevenuesAmount + posSalesAmount

      const [prevRevenuesResult, prevSalesResult] = await Promise.all([
        supabase
          .from('dd-revenues')
          .select('montant, source_id')
          .gte('date', previousRange.start.toISOString())
          .lte('date', previousRange.end.toISOString()),
        supabase
          .from('dd-ventes')
          .select('total_net')
          .eq('status', 'paye')
          .gte('date', previousRange.start.toISOString())
          .lte('date', previousRange.end.toISOString()),
      ])

      const prevManualRevenues = (prevRevenuesResult.data || []).filter((r: any) => !r.source_id)
      const prevManualRevenuesAmount = prevManualRevenues.reduce((sum: number, r: any) => sum + (r.montant || 0), 0)
      const prevSalesAmount = (prevSalesResult.data || []).reduce((sum: number, s: any) => sum + (s.total_net || 0), 0)
      const prevPeriodTotal = prevManualRevenuesAmount + prevSalesAmount

      const revenueGrowth = prevPeriodTotal ? ((totalRevenue - prevPeriodTotal) / prevPeriodTotal) * 100 : 0
      const salesGrowth = prevSalesAmount ? ((posSalesAmount - prevSalesAmount) / prevSalesAmount) * 100 : 0

      const salesByType: { [key: string]: number } = {}
      sales?.forEach((sale) => {
        salesByType[sale.type] = (salesByType[sale.type] || 0) + (sale.total_net || 0)
      })

      const productSales: { [key: string]: { quantity: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.product && !item.service && item.product_id) {
          const name = item.product.name || 'Produit'
          if (!productSales[name]) productSales[name] = { quantity: 0, revenue: 0 }
          productSales[name].quantity += item.quantite || 0
          productSales[name].revenue += item.total || 0
        }
      })

      const serviceSales: { [key: string]: { count: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.service && !item.product && item.service_id) {
          const name = item.service.name || 'Service'
          if (!serviceSales[name]) serviceSales[name] = { count: 0, revenue: 0 }
          serviceSales[name].count += item.quantite || 0
          serviceSales[name].revenue += item.total || 0
        }
      })

      const clientSales: { [key: string]: { purchases: number; revenue: number } } = {}
      const { data: salesWithClients } = await supabase
        .from('dd-ventes')
        .select('total_net, client_id, client:dd-clients(id, first_name, last_name)')
        .eq('status', 'paye')
        .gte('date', range.start.toISOString())
        .lte('date', range.end.toISOString())
        .not('client_id', 'is', null)

      salesWithClients?.forEach((sale: any) => {
        if (sale.client) {
          const clientName = `${sale.client.first_name || ''} ${sale.client.last_name || ''}`.trim() || 'Client anonyme'
          if (!clientSales[clientName]) clientSales[clientName] = { purchases: 0, revenue: 0 }
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
        revenueGrowth,
        salesGrowth,
        salesByType: Object.entries(salesByType).map(([name, value]) => ({ name, value })),
        topProducts: Object.entries(productSales)
          .map(([name, item]) => ({ name, quantity: item.quantity, revenue: item.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        topServices: Object.entries(serviceSales)
          .map(([name, item]) => ({ name, count: item.count, revenue: item.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        topClients: Object.entries(clientSales)
          .map(([name, item]) => ({ name, purchases: item.purchases, revenue: item.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        periodLabel: range.label,
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPaged = async <T,>(
    buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const pageSize = 1000
    const all: T[] = []
    let from = 0

    while (true) {
      const to = from + pageSize - 1
      const { data, error } = await buildQuery(from, to)
      if (error) {
        console.error('Paged fetch error:', error)
        break
      }
      const rows = data || []
      all.push(...rows)
      if (rows.length < pageSize) break
      from += pageSize
      // Safety cap (~50k rows)
      if (from > 50000) break
    }

    return all
  }

  const fetchChartData = async () => {
    try {
      setChartLoading(true)
      const minYear = availableYears.length ? Math.min(...availableYears) : currentYear - 10
      const chartRange = getRevenueChartRange(chartMode, chartYear, minYear)

      let rangeStart = chartRange.start.toISOString()
      let rangeEnd = chartRange.end.toISOString()
      if (chartMode === 'month') {
        rangeStart = new Date(chartYear, 0, 1, 0, 0, 0, 0).toISOString()
        rangeEnd =
          chartYear === currentYear
            ? new Date().toISOString()
            : new Date(chartYear, 11, 31, 23, 59, 59, 999).toISOString()
      }

      // Paginate: Supabase caps at 1000 rows/request. Asc order was cutting off July/August.
      const [sales, revenues] = await Promise.all([
        fetchAllPaged<any>((from, to) =>
          supabase
            .from('dd-ventes')
            .select('total_net, date, created_at')
            .eq('status', 'paye')
            .gte('date', rangeStart)
            .lte('date', rangeEnd)
            .order('date', { ascending: true })
            .range(from, to)
        ),
        fetchAllPaged<any>((from, to) =>
          supabase
            .from('dd-revenues')
            .select('montant, date, source_id, created_at')
            .gte('date', rangeStart)
            .lte('date', rangeEnd)
            .order('date', { ascending: true })
            .range(from, to)
        ),
      ])

      let salesRows = sales
      if (salesRows.length === 0) {
        salesRows = await fetchAllPaged<any>((from, to) =>
          supabase
            .from('dd-ventes')
            .select('total_net, date, created_at')
            .eq('status', 'paye')
            .gte('created_at', rangeStart)
            .lte('created_at', rangeEnd)
            .order('created_at', { ascending: true })
            .range(from, to)
        )
      }

      const series =
        chartMode === 'month'
          ? buildEmptyMonthSeries(chartYear)
          : chartMode === 'week'
            ? buildEmptyWeekSeries(chartRange)
            : chartMode === 'weekday'
              ? buildEmptyWeekdaySeries()
              : buildEmptyYearSeries(minYear, currentYear)

      const bucketMap = new Map(series.map((item) => [item.key, item]))

      // Same revenue rules as summary card:
      // - POS paid sales (dd-ventes)
      // - manual revenues only (dd-revenues without source_id)
      const chartManualRevenues = revenues.filter((r: any) => !r.source_id)

      salesRows.forEach((sale: any) => {
        const rawDate = sale.date || sale.created_at
        if (!rawDate) return
        const key = getBucketKey(rawDate, chartMode)
        const bucket = bucketMap.get(key)
        if (bucket) bucket.sales += Number(sale.total_net) || 0
      })

      chartManualRevenues.forEach((rev: any) => {
        const rawDate = rev.date || rev.created_at
        if (!rawDate) return
        const key = getBucketKey(rawDate, chartMode)
        const bucket = bucketMap.get(key)
        if (bucket) bucket.revenue += Number(rev.montant) || 0
      })

      // Single business revenue curve (= card "Revenus")
      setRevenueChart(
        series.map(({ label, revenue, sales: posSales }) => ({
          label,
          revenue: revenue + posSales,
          sales: posSales,
        }))
      )
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setChartLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + 'f'
  }

  const resetFilters = () => {
    setRelativeDay('')
    setFilterMonth('')
    setFilterRangeStart('')
    setFilterRangeEnd('')
  }

  const fetchModalDetails = async (type: 'clients' | 'sales' | 'revenue' | 'growth') => {
    try {
      setLoadingModal(true)
      setSelectedModal(type)
      const range = getActiveDateRange()
      const previousRange = getPreviousPeriod(range)

      switch (type) {
        case 'clients': {
          const { data: clientsData } = await supabase
            .from('dd-clients')
            .select('id, first_name, last_name, email, phone, created_at, total_spent, last_visit_date')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(10)

          setModalDetails({
            title: 'Détails des Clients',
            total: data?.totalClients || 0,
            items: clientsData || [],
          })
          break
        }

        case 'sales': {
          const { data: salesData } = await supabase
            .from('dd-ventes')
            .select('id, date, total_net, type, status, client:dd-clients(first_name, last_name)')
            .eq('status', 'paye')
            .gte('date', range.start.toISOString())
            .lte('date', range.end.toISOString())
            .order('date', { ascending: false })
            .limit(10)

          const salesTotal = (salesData || []).reduce((sum: number, s: any) => sum + (s.total_net || 0), 0)
          setModalDetails({
            title: 'Détails des Ventes',
            total: data?.totalSales || 0,
            totalAmount: salesTotal,
            periodLabel: range.label,
            items: salesData || [],
          })
          break
        }

        case 'revenue': {
          const [revenuesResult, salesForRevenue] = await Promise.all([
            supabase
              .from('dd-revenues')
              .select('id, montant, date, description, source_id')
              .gte('date', range.start.toISOString())
              .lte('date', range.end.toISOString())
              .order('date', { ascending: false }),
            supabase
              .from('dd-ventes')
              .select('id, date, total_net, client_id, client:dd-clients(first_name, last_name)')
              .eq('status', 'paye')
              .gte('date', range.start.toISOString())
              .lte('date', range.end.toISOString())
              .order('date', { ascending: false }),
          ])

          const revenuesData = revenuesResult.data || []
          const salesDataForRevenue = salesForRevenue.data || []
          const manualRevenuesForModal = revenuesData.filter((r: any) => !r.source_id)
          const saleIds = salesDataForRevenue.map((s: any) => s.id)

          let saleItemsWithTotals: Array<{
            vente_id: string
            product_id?: string
            service_id?: string
            total: number
            product?: any
            service?: any
          }> = []

          if (saleIds.length > 0) {
            const { data: items } = await supabase
              .from('dd-ventes-items')
              .select('vente_id, product_id, service_id, total, product:dd-products(name), service:dd-services(name)')
              .in('vente_id', saleIds)

            saleItemsWithTotals = (items || []).map((item: any) => ({
              vente_id: item.vente_id,
              product_id: item.product_id,
              service_id: item.service_id,
              total: typeof item.total === 'number' ? item.total : parseFloat(String(item.total)) || 0,
              product: item.product,
              service: item.service,
            }))
          }

          let produitsVendusAmount = 0
          let servicesAmount = 0

          salesDataForRevenue.forEach((sale: any) => {
            const items = saleItemsWithTotals.filter((item) => item.vente_id === sale.id)

            if (items.length === 0) {
              produitsVendusAmount += sale.total_net || 0
              return
            }

            const productItems = items.filter((item) => item.product_id && !item.service_id)
            const serviceItems = items.filter((item) => item.service_id && !item.product_id)
            const productItemsTotal = productItems.reduce((sum, item) => sum + item.total, 0)
            const serviceItemsTotal = serviceItems.reduce((sum, item) => sum + item.total, 0)
            const itemsTotal = productItemsTotal + serviceItemsTotal

            if (productItems.length > 0 && serviceItems.length === 0) {
              produitsVendusAmount += sale.total_net || 0
            } else if (serviceItems.length > 0 && productItems.length === 0) {
              servicesAmount += sale.total_net || 0
            } else if (productItems.length > 0 && serviceItems.length > 0) {
              if (itemsTotal > 0) {
                produitsVendusAmount += (sale.total_net || 0) * (productItemsTotal / itemsTotal)
                servicesAmount += (sale.total_net || 0) * (serviceItemsTotal / itemsTotal)
              } else {
                const halfAmount = (sale.total_net || 0) / 2
                produitsVendusAmount += halfAmount
                servicesAmount += halfAmount
              }
            } else {
              produitsVendusAmount += sale.total_net || 0
            }
          })

          const revenusManuelsAmount = manualRevenuesForModal.reduce((sum: number, r: any) => sum + (r.montant || 0), 0)
          const calculatedTotal = produitsVendusAmount + servicesAmount + revenusManuelsAmount

          const salesForDisplay = salesDataForRevenue.slice(0, 10).map((sale: any) => {
            const items = saleItemsWithTotals.filter((item) => item.vente_id === sale.id)
            const productItems = items.filter((item) => item.product_id && !item.service_id)
            const serviceItems = items.filter((item) => item.service_id && !item.product_id)

            let type = 'Produit'
            let description = 'Vente POS'
            if (serviceItems.length > 0 && productItems.length === 0) type = 'Service'
            else if (serviceItems.length > 0 && productItems.length > 0) type = 'Mixte'

            if (items.length > 0) {
              const itemNames = items
                .map((item: any) => item.product?.name || item.service?.name || null)
                .filter(Boolean)
              description = itemNames.join(', ') || 'Vente POS'
            }

            return { ...sale, type, description, items }
          })

          setModalDetails({
            title: 'Détails des Revenus',
            total: data?.totalRevenue || calculatedTotal,
            periodLabel: range.label,
            breakdown: {
              produitsVendus: produitsVendusAmount,
              services: servicesAmount,
              revenusManuels: revenusManuelsAmount,
            },
            revenues: manualRevenuesForModal.slice(0, 10),
            sales: salesForDisplay,
          })
          break
        }

        case 'growth': {
          const [prevPeriod, currentPeriod] = await Promise.all([
            supabase
              .from('dd-ventes')
              .select('total_net, date')
              .eq('status', 'paye')
              .gte('date', previousRange.start.toISOString())
              .lte('date', previousRange.end.toISOString()),
            supabase
              .from('dd-ventes')
              .select('total_net, date')
              .eq('status', 'paye')
              .gte('date', range.start.toISOString())
              .lte('date', range.end.toISOString()),
          ])

          const prevTotal = prevPeriod.data?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
          const currentTotal = currentPeriod.data?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0

          setModalDetails({
            title: 'Détails de la Croissance',
            growth: data?.revenueGrowth || 0,
            prevPeriodTotal: prevTotal,
            currentPeriodTotal: currentTotal,
            prevPeriodCount: prevPeriod.data?.length || 0,
            currentPeriodCount: currentPeriod.data?.length || 0,
            periodLabel: range.label,
          })
          break
        }
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

  if (loading && !data) {
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

  const salesByTypeTotal = data.salesByType.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0)
  const maxTopProduct = Math.max(1, ...data.topProducts.map(p => Number(p.revenue) || 0))
  const maxTopService = Math.max(1, ...data.topServices.map(s => Number(s.revenue) || 0))
  const maxTopClient = Math.max(1, ...data.topClients.map(c => Number(c.revenue) || 0))

  const topLists = [
    { title: 'Top Produits', href: '/admin/products', empty: 'Aucun produit vendu', max: maxTopProduct,
      rows: data.topProducts.map(p => ({ name: p.name, sub: `${p.quantity} vendus`, revenue: p.revenue })) },
    { title: 'Top Services', href: '/admin/services', empty: 'Aucun service vendu', max: maxTopService,
      rows: data.topServices.map(s => ({ name: s.name, sub: `${s.count} vendus`, revenue: s.revenue })) },
    { title: 'Top Clients', href: '/admin/clients', empty: 'Aucun client', max: maxTopClient,
      rows: data.topClients.map(c => ({ name: c.name, sub: `${c.purchases} achat${c.purchases > 1 ? 's' : ''}`, revenue: c.revenue })) },
  ]

  const overviewRows = [
    { label: 'Produits', value: data.totalProducts, icon: Package, href: '/admin/products', tone: TONES.violet },
    { label: 'Services', value: data.totalServices, icon: Scissors, href: '/admin/services', tone: TONES.pink },
    { label: 'Rendez-vous', value: data.totalAppointments, icon: Calendar, href: '/admin/appointments', tone: TONES.sky },
    { label: 'Livraisons', value: data.totalDeliveries, icon: Truck, href: '/admin/deliveries', tone: TONES.amber },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Tableau de Bord"
        description={<>Vue d&apos;ensemble · {data.periodLabel}</>}
        actions={
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RefreshCw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        }
      />

      {/* Page filters — does not affect the revenue chart */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex items-center gap-2 lg:w-44 lg:shrink-0 lg:pb-2">
              <span className="brand-mark h-8 w-8 text-primary"><Filter className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-extrabold text-foreground">Filtrer les données</p>
                <p className="text-[11px] text-muted-foreground">Année : {selectedYear}</p>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Jour</Label>
                <Select
                  value={relativeDay || 'none'}
                  onValueChange={(value) => {
                    const next = value === 'none' ? '' : (value as RelativeDayFilter)
                    setRelativeDay(next)
                    if (next) {
                      setFilterMonth('')
                      setFilterRangeStart('')
                      setFilterRangeEnd('')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un jour" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Toute l&apos;année</SelectItem>
                    <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                    <SelectItem value="yesterday">Hier</SelectItem>
                    <SelectItem value="before_yesterday">Avant-hier</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Mois</Label>
                <Select
                  value={filterMonth || 'none'}
                  onValueChange={(value) => {
                    const next = value === 'none' ? '' : value
                    setFilterMonth(next)
                    if (next) {
                      setRelativeDay('')
                      setFilterRangeStart('')
                      setFilterRangeEnd('')
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tous les mois</SelectItem>
                    {MONTH_OPTIONS.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Du</Label>
                <Input
                  type="date"
                  value={filterRangeStart}
                  onChange={(e) => {
                    setFilterRangeStart(e.target.value)
                    if (e.target.value) {
                      setRelativeDay('')
                      setFilterMonth('')
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Au</Label>
                <Input
                  type="date"
                  value={filterRangeEnd}
                  onChange={(e) => {
                    setFilterRangeEnd(e.target.value)
                    if (e.target.value) {
                      setRelativeDay('')
                      setFilterMonth('')
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <StatGrid cols={4}>
        <StatCard index={0} label="Clients" value={data.totalClients.toLocaleString('fr-FR')} icon={Users} tone="violet"
          hint="Voir le détail" onClick={() => fetchModalDetails('clients')} />
        <StatCard index={1} label="Ventes" value={data.totalSales.toLocaleString('fr-FR')} icon={ShoppingCart} tone="pink"
          trend={data.salesGrowth} hint="vs période précédente" onClick={() => fetchModalDetails('sales')} />
        <StatCard index={2} label="Revenus" value={formatCurrency(data.totalRevenue)} icon={DollarSign} tone="emerald"
          hint={data.periodLabel} onClick={() => fetchModalDetails('revenue')} />
        <StatCard index={3} label="Croissance" value={`${data.revenueGrowth >= 0 ? '+' : ''}${data.revenueGrowth.toFixed(1)}%`}
          icon={BarChart3} tone={data.revenueGrowth >= 0 ? 'sky' : 'rose'} hint="Revenus vs période précédente" onClick={() => fetchModalDetails('growth')} />
      </StatGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <SectionTitle
              title={CHART_TITLES[chartMode]}
              description="Indépendant des filtres de la page"
              actions={
                <>
                  <div className="segmented" role="group" aria-label="Période du graphique">
                    {(
                      [
                        { value: 'month', label: 'Mois' },
                        { value: 'week', label: 'Semaines' },
                        { value: 'weekday', label: '7 jours' },
                        { value: 'year', label: 'Années' },
                      ] as const
                    ).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={chartMode === option.value}
                        onClick={() => setChartMode(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {chartMode === 'month' && (
                    <Select value={String(chartYear)} onValueChange={(v) => setChartYear(parseInt(v, 10))}>
                      <SelectTrigger className="h-8 w-[92px]" aria-label="Année du graphique">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              }
            />
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="skeleton h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c9a227" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#c9a227" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} width={70}
                    tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000).toLocaleString('fr-FR')}k` : String(v))} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ stroke: '#c9a227', strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={2.5} fill="url(#revenueFill)" name="Revenus"
                    dot={false} activeDot={{ r: 5, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <SectionTitle title="Ventes par Type" description={data.periodLabel} />
          </CardHeader>
          <CardContent>
            {data.salesByType.length === 0 || salesByTypeTotal === 0 ? (
              <EmptyState icon={PieIcon} title="Aucune vente" description="Les ventes de la période s’afficheront ici." />
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={data.salesByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={85}
                        paddingAngle={2}
                        stroke="none"
                        dataKey="value"
                      >
                        {data.salesByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Total</span>
                    <span className="text-lg font-extrabold text-foreground">{salesByTypeTotal.toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {data.salesByType.map((entry, index) => (
                    <li key={entry.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[index % COLORS.length] }} />
                      <span className="flex-1 truncate font-semibold text-foreground">{entry.name}</span>
                      <span className="font-bold text-muted-foreground">
                        {Math.round(((Number(entry.value) || 0) / salesByTypeTotal) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle title="Vue d&apos;ensemble" description="Catalogue et activité" />
          </CardHeader>
          <CardContent className="space-y-1 pt-1">
            {overviewRows.map((row) => (
              <Link key={row.label} href={row.href} className="list-row">
                <span className="stat-card-icon h-9 w-9" style={{ '--tone': row.tone } as React.CSSProperties}>
                  <row.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-xs font-bold text-muted-foreground">{row.label}</span>
                <span className="text-sm font-extrabold text-foreground">{Number(row.value).toLocaleString('fr-FR')}</span>
              </Link>
            ))}
          </CardContent>
        </Card>

        {topLists.map((list) => (
          <Card key={list.title}>
            <CardHeader className="pb-2">
              <SectionTitle
                title={list.title}
                actions={<Link href={list.href} className="text-[11px] font-bold text-primary hover:underline">Voir tout</Link>}
              />
            </CardHeader>
            <CardContent className="pt-1">
              {list.rows.length > 0 ? (
                <ul className="space-y-3">
                  {list.rows.map((row, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <span className="rank">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-xs font-bold text-foreground">{row.name}</p>
                          <p className="shrink-0 text-xs font-extrabold text-primary">{formatCurrency(row.revenue)}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="progress-track flex-1">
                            <div className="progress-bar" style={{ width: `${Math.max(4, Math.round(((Number(row.revenue) || 0) / list.max) * 100))}%` }} />
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{row.sub}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title={list.empty} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="app-card w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto shadow-[var(--shadow-pop)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{modalDetails?.title || 'Détails'}</h2>
              <Button variant="ghost" size="icon" onClick={closeModal} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {loadingModal ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
                </div>
              ) : (
                modalDetails && (
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
                                <div
                                  key={client.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {client.first_name} {client.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {client.email || client.phone || 'Pas de contact'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                                      {client.total_spent ? formatCurrency(client.total_spent) : '0f'}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {client.last_visit_date
                                        ? new Date(client.last_visit_date).toLocaleDateString('fr-FR')
                                        : 'Jamais'}
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
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total de ventes ({modalDetails.periodLabel})
                          </p>
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
                                <div
                                  key={sale.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {sale.client
                                        ? `${sale.client.first_name} ${sale.client.last_name}`
                                        : 'Client anonyme'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(sale.date).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                      {formatCurrency(sale.total_net || 0)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                                      {sale.type || 'N/A'}
                                    </p>
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
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Revenus totaux ({modalDetails.periodLabel})
                          </p>
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {formatCurrency(modalDetails.total || 0)}
                          </p>
                        </div>
                        {modalDetails.breakdown && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Produits Vendus</p>
                              <p className="text-lg font-bold text-primary">
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
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Derniers revenus manuels
                          </h3>
                          <div className="space-y-2">
                            {modalDetails.revenues?.length > 0 ? (
                              modalDetails.revenues.map((revenue: any) => (
                                <div
                                  key={revenue.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {revenue.description || 'Revenu manuel'}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(revenue.date).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(revenue.montant || 0)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Aucun revenu manuel enregistré
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dernières ventes POS</h3>
                          <div className="space-y-2">
                            {modalDetails.sales?.length > 0 ? (
                              modalDetails.sales.map((sale: any) => (
                                <div
                                  key={sale.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                      {sale.description ||
                                        (sale.client
                                          ? `${sale.client.first_name || ''} ${sale.client.last_name || ''}`.trim()
                                          : 'Client anonyme')}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(sale.date).toLocaleDateString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}{' '}
                                      • {sale.type || 'POS'}
                                    </p>
                                  </div>
                                  <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                                    {formatCurrency(sale.total_net || 0)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune vente POS trouvée</p>
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
                            {modalDetails.growth >= 0 ? '+' : ''}
                            {modalDetails.growth.toFixed(1)}%
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Période précédente</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(modalDetails.prevPeriodTotal || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {modalDetails.prevPeriodCount || 0} ventes
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              Période actuelle ({modalDetails.periodLabel})
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(modalDetails.currentPeriodTotal || 0)}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {modalDetails.currentPeriodCount || 0} ventes
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end mt-6">
                      <Button variant="outline" onClick={closeModal}>
                        Fermer
                      </Button>
                      <Link
                        href={
                          selectedModal === 'clients'
                            ? '/admin/clients'
                            : selectedModal === 'sales'
                              ? '/admin/sales'
                              : selectedModal === 'revenue'
                                ? '/admin/revenues'
                                : '/admin'
                        }
                        className="ml-2"
                      >
                        <Button>Voir tout</Button>
                      </Link>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
