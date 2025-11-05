"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  FileText, 
  Calendar, 
  Download,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface SalesReport {
  total_sales: number
  total_revenue: number
  total_orders: number
  average_order_value: number
  top_products: Array<{
    product_name: string
    quantity_sold: number
    revenue: number
  }>
  sales_by_date: Array<{
    date: string
    sales_count: number
    revenue: number
  }>
  sales_by_payment_method: Array<{
    payment_method: string
    count: number
    amount: number
  }>
}

export function SalesReport() {
  const [report, setReport] = useState<SalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesReport()
    }
  }, [startDate, endDate])

  const fetchSalesReport = async () => {
    try {
      setLoading(true)

      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('dd-ventes')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'paye')

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        toast.error('Erreur lors du chargement des données de vente')
        return
      }

      // Calculate report data
      const totalSales = sales?.length || 0
      const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_net || 0), 0) || 0
      const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

      // Top products - simplified for now since we don't have the items relationship
      const topProducts: Array<{
        product_name: string
        quantity_sold: number
        revenue: number
        profit: number
      }> = []

      // Sales by date
      const salesByDate: { [key: string]: { count: number; revenue: number } } = {}
      sales?.forEach(sale => {
        const date = sale.date.split('T')[0]
        if (!salesByDate[date]) {
          salesByDate[date] = { count: 0, revenue: 0 }
        }
        salesByDate[date].count += 1
        salesByDate[date].revenue += sale.total_net || 0
      })

      const salesByDateArray = Object.entries(salesByDate)
        .map(([date, data]) => ({ date, sales_count: data.count, revenue: data.revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Sales by payment method
      const salesByPayment: { [key: string]: { count: number; amount: number } } = {}
      sales?.forEach(sale => {
        const method = sale.payment_method || 'unknown'
        if (!salesByPayment[method]) {
          salesByPayment[method] = { count: 0, amount: 0 }
        }
        salesByPayment[method].count += 1
        salesByPayment[method].amount += sale.total_net || 0
      })

      const salesByPaymentArray = Object.entries(salesByPayment)
        .map(([method, data]) => ({ payment_method: method, count: data.count, amount: data.amount }))

      setReport({
        total_sales: totalSales,
        total_revenue: totalRevenue,
        total_orders: totalSales,
        average_order_value: averageOrderValue,
        top_products: topProducts,
        sales_by_date: salesByDateArray,
        sales_by_payment_method: salesByPaymentArray
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la génération du rapport')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!report) return

    const csvContent = [
      ['Rapport de Ventes', '', '', ''],
      ['Période', `${startDate} au ${endDate}`, '', ''],
      ['', '', '', ''],
      ['Métriques', 'Valeur', '', ''],
      ['Total des Ventes', report.total_sales.toString(), '', ''],
      ['Chiffre d\'Affaires Total', `${report.total_revenue.toLocaleString()} XOF`, '', ''],
      ['Valeur Moyenne des Commandes', `${report.average_order_value.toLocaleString()} XOF`, '', ''],
      ['', '', '', ''],
      ['Top Produits', 'Quantité Vendue', 'Chiffre d\'Affaires', ''],
      ...report.top_products.map(product => [
        product.product_name,
        product.quantity_sold.toString(),
        `${product.revenue.toLocaleString()} XOF`,
        ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-ventes-${startDate}-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <ButtonLoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapport de Ventes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analysez les performances de vos ventes
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de Début
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchSalesReport}>
                <Calendar className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-sm">
                    <ShoppingCart className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ventes</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.total_sales}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-sm">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Chiffre d'Affaires</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {report.total_revenue.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-sm">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Panier Moyen</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {report.average_order_value.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-sm">
                    <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Produits Vendus</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {report.top_products.reduce((sum, p) => sum + p.quantity_sold, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Produits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Quantité Vendue</TableHead>
                      <TableHead>Chiffre d'Affaires</TableHead>
                      <TableHead>% du CA Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.top_products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.quantity_sold}</TableCell>
                        <TableCell>{product.revenue.toLocaleString()} XOF</TableCell>
                        <TableCell>
                          {((product.revenue / report.total_revenue) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sales by Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ventes par Mode de Paiement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mode de Paiement</TableHead>
                      <TableHead>Nombre de Ventes</TableHead>
                      <TableHead>Montant Total</TableHead>
                      <TableHead>% du CA Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.sales_by_payment_method.map((payment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">{payment.payment_method}</TableCell>
                        <TableCell>{payment.count}</TableCell>
                        <TableCell>{payment.amount.toLocaleString()} XOF</TableCell>
                        <TableCell>
                          {((payment.amount / report.total_revenue) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sales by Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Ventes par Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Nombre de Ventes</TableHead>
                      <TableHead>Chiffre d'Affaires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.sales_by_date.slice(-10).map((sale, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {new Date(sale.date).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{sale.sales_count}</TableCell>
                        <TableCell>{sale.revenue.toLocaleString()} XOF</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
