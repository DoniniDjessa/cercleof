"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Trash2, Package, Plus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Stock {
  id: string
  name: string
  description?: string
  stock_ref: string
  status: string
  is_active: boolean
  created_at: string
  created_by?: string
}

export function StockList() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchStocks()
  }, [currentPage])

  const fetchStocks = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-stocks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      setStocks(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching stocks:', error)
      toast.error('Erreur lors de la récupération des stocks')
    } finally {
      setLoading(false)
    }
  }

  const deleteStock = async (stockId: string, stockName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le stock "${stockName}"? Cette action ne peut pas être annulée.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-stocks')
        .delete()
        .eq('id', stockId)

      if (error) throw error
      
      fetchStocks()
      toast.success('Stock supprimé avec succès!')
    } catch (error) {
      console.error('Error deleting stock:', error)
      toast.error('Erreur lors de la suppression du stock')
    }
  }

  // Filter stocks based on search term
  const filteredStocks = stocks.filter(stock =>
    stock.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.stock_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'closed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif'
      case 'closed': return 'Fermé'
      case 'archived': return 'Archivé'
      default: return 'Inconnu'
    }
  }

  if (loading && stocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des stocks...</p>
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
            Gestion des Stocks
          </h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Gérez vos lots de stock et leurs articles
          </p>
        </div>
        <Button onClick={() => window.history.replaceState({}, '', '/admin/stock?action=create')}>
          Créer un Stock
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Stocks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stocks.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Stocks Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stocks.filter((s) => s.status === 'active').length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Stocks Fermés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stocks.filter((s) => s.status === 'closed').length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 ">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Rechercher des Stocks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
              <Input
                placeholder="Rechercher par nom, référence ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stocks Table */}
      <Card className="bg-white dark:bg-gray-800 ">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Stocks ({filteredStocks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="">
                  <TableHead className="text-gray-600 dark:text-gray-400">Nom</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Référence</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Statut</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Date de Création</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStocks.map((stock) => (
                  <TableRow key={stock.id} className=" hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                        {stock.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400 font-mono">
                      {stock.stock_ref}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {stock.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(stock.status)}>
                        {getStatusText(stock.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(stock.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          onClick={() => window.history.replaceState({}, '', `/admin/stock/${stock.id}/items?action=add`)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                          onClick={() => window.history.replaceState({}, '', `/admin/stock/${stock.id}/items`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          onClick={() => deleteStock(stock.id, stock.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredStocks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucun stock trouvé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, stocks.length)} sur {stocks.length} stocks
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
