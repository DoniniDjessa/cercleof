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
} from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
  salesByType: Array<{ name: string; value: number }>
  topProducts: Array<{ name: string; quantity: number; revenue: number }>
  topServices: Array<{ name: string; count: number; revenue: number }>
  topClients: Array<{ name: string; purchases: number; revenue: number }>
  periodLabel: string
}

type RevenueChartPoint = { label: string; revenue: number; sales: number }

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff']

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2">
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
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Vue d&apos;ensemble · {data.periodLabel}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters} className="self-start lg:self-auto text-xs">
          <RefreshCw className="w-3 h-3 mr-2" />
          Réinitialiser
        </Button>
      </div>

      {/* Page filters — does not affect the revenue chart */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Filtrer les données
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Année navbar: {selectedYear}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 dark:text-gray-300">Jour</Label>
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
                  <SelectTrigger className="text-xs bg-white text-gray-700 border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-50 [&>span]:text-gray-700 dark:[&>span]:text-gray-700">
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
                <Label className="text-xs text-gray-600 dark:text-gray-300">Mois</Label>
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
                  <SelectTrigger className="text-xs bg-white text-gray-700 border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-50 [&>span]:text-gray-700 dark:[&>span]:text-gray-700">
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
                <Label className="text-xs text-gray-600 dark:text-gray-300">Du</Label>
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
                  className="text-xs bg-white text-gray-700 border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600 dark:text-gray-300">Au</Label>
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
                  className="text-xs bg-white text-gray-700 border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  {data.revenueGrowth >= 0 ? '+' : ''}
                  {data.revenueGrowth.toFixed(1)}%
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
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                {CHART_TITLES[chartMode]}
              </CardTitle>
              {chartMode === 'month' && (
                <Select value={String(chartYear)} onValueChange={(v) => setChartYear(parseInt(v, 10))}>
                  <SelectTrigger className="w-[110px] h-8 text-xs bg-white text-gray-700 border-gray-200 dark:bg-white dark:text-gray-700 dark:border-gray-300 dark:hover:bg-gray-50 [&>span]:text-gray-700 dark:[&>span]:text-gray-700">
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
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: 'month', label: 'Par mois' },
                  { value: 'week', label: 'Par semaine' },
                  { value: 'weekday', label: 'Jours (7j)' },
                  { value: 'year', label: 'Par année' },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={chartMode === option.value ? 'default' : 'outline'}
                  className="text-[11px] h-7 px-2.5"
                  onClick={() => setChartMode(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex items-center justify-center h-[250px]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#6b7280" fontSize={10} />
                  <YAxis stroke="#6b7280" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend fontSize={10} />
                  <Line type="monotone" dataKey="revenue" stroke="#9333ea" strokeWidth={2} name="Revenus" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

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
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">Vue d&apos;ensemble</CardTitle>
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
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{product.quantity} vendus</p>
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
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{service.count} vendus</p>
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

      {selectedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
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
