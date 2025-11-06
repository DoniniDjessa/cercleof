"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, Package, Plus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface StockItem {
  id: string
  stock_id: string
  product_id: string
  quantity: number
  batch_code: string
  cost_per_unit: number
  total_cost: number
  received_date: string
  expiry_date?: string
  notes?: string
  product: {
    id: string
    name: string
    sku: string
    barcode: string
    price: number
  }
}

interface StockItemsListProps {
  stockId: string
  stockName: string
  stockRef: string
}

export function StockItemsList({ stockId, stockName, stockRef }: StockItemsListProps) {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchStockItems()
  }, [stockId, currentPage])

  const fetchStockItems = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Fetch stock items first
      const { data: stockItemsData, error, count } = await supabase
        .from('dd-stock-items')
        .select('*', { count: 'exact' })
        .eq('stock_id', stockId)
        .order('received_date', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      if (!stockItemsData || stockItemsData.length === 0) {
        setStockItems([])
        setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        return
      }

      // Fetch products separately
      const productIds = stockItemsData
        .map(item => item.product_id)
        .filter((id): id is string => !!id)

      const productsMap = new Map<string, { id: string; name: string; sku: string; barcode: string; price: number }>()
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('dd-products')
          .select('id, name, sku, barcode, price')
          .in('id', productIds)
        
        products?.forEach(product => {
          productsMap.set(product.id, {
            id: product.id,
            name: product.name,
            sku: product.sku || '',
            barcode: product.barcode || '',
            price: product.price || 0
          })
        })
      }

      // Map products to stock items
      const stockItemsWithProducts = stockItemsData.map(item => ({
        ...item,
        product: item.product_id ? productsMap.get(item.product_id) : undefined
      })) as StockItem[]

      setStockItems(stockItemsWithProducts)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching stock items:', error)
      toast.error('Erreur lors de la récupération des articles de stock')
    } finally {
      setLoading(false)
    }
  }

  const deleteStockItem = async (stockItemId: string, productName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" de ce stock? Cette action ne peut pas être annulée.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-stock-items')
        .delete()
        .eq('id', stockItemId)

      if (error) throw error
      
      fetchStockItems()
      toast.success('Article supprimé du stock avec succès!')
    } catch (error) {
      console.error('Error deleting stock item:', error)
      toast.error('Erreur lors de la suppression de l\'article')
    }
  }

  const exportStockItems = () => {
    const csvContent = [
      ['Produit', 'SKU', 'Code-barres', 'Stock', 'Batch Code', 'Quantité', 'Coût/Unité', 'Coût Total', 'Date Réception', 'Date Expiration'],
      ...stockItems.map(item => [
        item.product.name,
        item.product.sku,
        item.product.barcode,
        stockRef,
        item.batch_code,
        item.quantity.toString(),
        item.cost_per_unit.toString(),
        item.total_cost.toString(),
        new Date(item.received_date).toLocaleDateString('fr-FR'),
        item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('fr-FR') : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `stock-${stockRef}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Fichier CSV exporté avec succès!')
  }

  // Filter stock items based on search term
  const filteredStockItems = stockItems.filter(item =>
    item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && stockItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des articles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            Articles du Stock: {stockName}
          </h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Référence: {stockRef} • {stockItems.length} articles
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={exportStockItems}
            className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={() => window.history.replaceState({}, '', `/admin/stock/${stockId}/items?action=add`)}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter des Produits
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stockItems.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Quantité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stockItems.reduce((sum, item) => sum + item.quantity, 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Coût Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stockItems.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)} XOF
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Produits Uniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Set(stockItems.map(item => item.product_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 ">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Rechercher des Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
              <Input
                placeholder="Rechercher par nom, SKU ou batch code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Items Table */}
      <Card className="bg-white dark:bg-gray-800 ">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Articles ({filteredStockItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="">
                  <TableHead className="text-gray-600 dark:text-gray-400">Produit</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">SKU</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Code-barres</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Batch Code</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Quantité</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Coût/Unité</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Coût Total</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Date Réception</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStockItems.map((item) => (
                  <TableRow key={item.id} className=" hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                        {item.product.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 font-mono">
                      {item.product.sku}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 font-mono">
                      {item.product.barcode}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 font-mono">
                      {item.batch_code}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {item.cost_per_unit.toFixed(2)} XOF
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {item.total_cost.toFixed(2)} XOF
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(item.received_date).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          onClick={() => deleteStockItem(item.id, item.product.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredStockItems.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucun article trouvé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, stockItems.length)} sur {stockItems.length} articles
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Précédent
            </Button>
            <span className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
