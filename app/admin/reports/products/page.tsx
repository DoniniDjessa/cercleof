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
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ProductReport {
  total_products: number
  active_products: number
  low_stock_products: number
  out_of_stock_products: number
  top_selling_products: Array<{
    product_name: string
    quantity_sold: number
    revenue: number
    profit: number
  }>
  products_by_category: Array<{
    category_name: string
    count: number
    total_value: number
  }>
  stock_value_by_category: Array<{
    category_name: string
    stock_quantity: number
    stock_value: number
  }>
}

export default function ProductReportPage() {
  const [report, setReport] = useState<ProductReport | null>(null)
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
      fetchProductReport()
    }
  }, [startDate, endDate])

  const fetchProductReport = async () => {
    try {
      setLoading(true)

      // Fetch products data first
      const { data: productsData, error: productsError } = await supabase
        .from('dd-products')
        .select('*')

      if (productsError) {
        console.error('Error fetching products:', productsError)
        toast.error('Erreur lors du chargement des données produits')
        return
      }

      if (!productsData || productsData.length === 0) {
        setReport({
          total_products: 0,
          active_products: 0,
          low_stock_products: 0,
          out_of_stock_products: 0,
          top_selling_products: [],
          products_by_category: [],
          stock_value_by_category: []
        })
        return
      }

      // Fetch categories separately
      const categoryIds = productsData
        .map(p => p.category_id)
        .filter((id): id is string => !!id)

      const categoriesMap = new Map<string, { id: string; name: string }>()
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('dd-categories')
          .select('id, name')
          .in('id', categoryIds)
        
        categories?.forEach(cat => {
          categoriesMap.set(cat.id, { id: cat.id, name: cat.name })
        })
      }

      // Map categories to products
      const products = productsData.map(product => ({
        ...product,
        category: product.category_id ? categoriesMap.get(product.category_id) : undefined
      }))

      // Fetch sales items first
      const { data: salesItemsData, error: salesItemsError } = await supabase
        .from('dd-ventes-items')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (salesItemsError) {
        console.error('Error fetching sales items:', salesItemsError)
        toast.error('Erreur lors du chargement des données de vente')
        return
      }

      // Fetch related ventes to filter by status and date
      const venteIds = salesItemsData
        ?.map(item => item.vente_id)
        .filter((id): id is string => !!id) || []

      let paidVenteIds: string[] = []
      if (venteIds.length > 0) {
        const { data: ventes } = await supabase
          .from('dd-ventes')
          .select('id, date, status')
          .in('id', venteIds)
          .eq('status', 'paye')
          .gte('date', startDate)
          .lte('date', endDate)
        
        paidVenteIds = ventes?.map(v => v.id) || []
      }

      // Filter sales items by paid ventes
      const salesItems = salesItemsData?.filter(item => paidVenteIds.includes(item.vente_id)) || []

      // Fetch products for sales items
      const productIds = salesItems
        .map(item => item.product_id)
        .filter((id): id is string => !!id)

      const salesProductsMap = new Map<string, { id: string; name: string; cost: number; price: number }>()
      if (productIds.length > 0) {
        const { data: salesProducts } = await supabase
          .from('dd-products')
          .select('id, name, cost, price')
          .in('id', productIds)
        
        salesProducts?.forEach(prod => {
          salesProductsMap.set(prod.id, {
            id: prod.id,
            name: prod.name,
            cost: prod.cost || 0,
            price: prod.price || 0
          })
        })
      }

      // Map products to sales items
      const sales = salesItems.map(item => ({
        ...item,
        product: item.product_id ? salesProductsMap.get(item.product_id) : undefined
      }))

      // Calculate report data
      const totalProducts = products.length
      const activeProducts = products.filter(p => p.is_active && p.status === 'active').length
      const lowStockProducts = products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= 10).length
      const outOfStockProducts = products.filter(p => p.stock_quantity === 0).length

      // Top selling products
      const productSales: { [key: string]: { name: string; quantity: number; revenue: number; profit: number } } = {}
      sales.forEach(sale => {
        if (sale.product) {
          const key = sale.product.name
          if (!productSales[key]) {
            productSales[key] = { 
              name: key, 
              quantity: 0, 
              revenue: 0, 
              profit: 0 
            }
          }
          productSales[key].quantity += sale.quantity || 0
          productSales[key].revenue += sale.total_price || 0
          productSales[key].profit += (sale.product.price - sale.product.cost) * (sale.quantity || 0)
        }
      })

      const topSellingProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(prod => ({
          product_name: prod.name,
          quantity_sold: prod.quantity,
          revenue: prod.revenue,
          profit: prod.profit
        }))

      // Products by category
      const productsByCategory: { [key: string]: { count: number; value: number } } = {}
      products.forEach(product => {
        const category = product.category?.name || 'Sans catégorie'
        if (!productsByCategory[category]) {
          productsByCategory[category] = { count: 0, value: 0 }
        }
        productsByCategory[category].count += 1
        productsByCategory[category].value += (product.price || 0) * (product.stock_quantity || 0)
      })

      const productsByCategoryArray = Object.entries(productsByCategory)
        .map(([category, data]) => ({ 
          category_name: category, 
          count: data.count, 
          total_value: data.value 
        }))
        .sort((a, b) => b.count - a.count)

      // Stock value by category
      const stockValueByCategory: { [key: string]: { quantity: number; value: number } } = {}
      products.forEach(product => {
        const category = product.category?.name || 'Sans catégorie'
        if (!stockValueByCategory[category]) {
          stockValueByCategory[category] = { quantity: 0, value: 0 }
        }
        stockValueByCategory[category].quantity += product.stock_quantity || 0
        stockValueByCategory[category].value += (product.price || 0) * (product.stock_quantity || 0)
      })

      const stockValueByCategoryArray = Object.entries(stockValueByCategory)
        .map(([category, data]) => ({ 
          category_name: category, 
          stock_quantity: data.quantity, 
          stock_value: data.value 
        }))
        .sort((a, b) => b.stock_value - a.stock_value)

      setReport({
        total_products: totalProducts,
        active_products: activeProducts,
        low_stock_products: lowStockProducts,
        out_of_stock_products: outOfStockProducts,
        top_selling_products: topSellingProducts,
        products_by_category: productsByCategoryArray,
        stock_value_by_category: stockValueByCategoryArray
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
      ['Rapport Produits', '', '', ''],
      ['Période', `${startDate} au ${endDate}`, '', ''],
      ['', '', '', ''],
      ['Métriques', 'Valeur', '', ''],
      ['Total Produits', report.total_products.toString(), '', ''],
      ['Produits Actifs', report.active_products.toString(), '', ''],
      ['Stock Faible', report.low_stock_products.toString(), '', ''],
      ['Rupture de Stock', report.out_of_stock_products.toString(), '', ''],
      ['', '', '', ''],
      ['Top Produits Vendeurs', 'Quantité Vendue', 'Chiffre d\'Affaires', 'Profit'],
      ...report.top_selling_products.map(product => [
        product.product_name,
        product.quantity_sold.toString(),
        `${product.revenue.toLocaleString()} XOF`,
        `${product.profit.toLocaleString()} XOF`
      ]),
      ['', '', '', ''],
      ['Produits par Catégorie', 'Nombre', 'Valeur Total', ''],
      ...report.products_by_category.map(item => [
        item.category_name,
        item.count.toString(),
        `${item.total_value.toLocaleString()} XOF`,
        ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-produits-${startDate}-${endDate}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapport Produits</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analysez vos produits et leur performance
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
              <Button onClick={fetchProductReport}>
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
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Produits</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.total_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Produits Actifs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.active_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stock Faible</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.low_stock_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <Package className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rupture de Stock</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.out_of_stock_products}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Produits Vendeurs
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
                      <TableHead>Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.top_selling_products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.quantity_sold}</TableCell>
                        <TableCell>{product.revenue.toLocaleString()} XOF</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {product.profit.toLocaleString()} XOF
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Products by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produits par Catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Nombre de Produits</TableHead>
                      <TableHead>Valeur Total du Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.products_by_category.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category_name}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>{item.total_value.toLocaleString()} XOF</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Stock Value by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Valeur du Stock par Catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Quantité en Stock</TableHead>
                      <TableHead>Valeur du Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.stock_value_by_category.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category_name}</TableCell>
                        <TableCell>{item.stock_quantity}</TableCell>
                        <TableCell className="font-medium">
                          {item.stock_value.toLocaleString()} XOF
                        </TableCell>
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
