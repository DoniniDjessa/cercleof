'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AnimatedButton } from '@/components/ui/animated-button'
import { TableLoadingState, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { Search, Eye, Trash2, Package, DollarSign, TrendingUp, Plus, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { AddProduct } from '@/components/products/add-product'
import { Label } from '@/components/ui/label'

interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  category_id?: string
  brand?: string
  price: number
  cost: number
  stock_quantity: number
  status: string
  show_to_website: boolean
  is_active: boolean
  created_at: string
  created_by?: string
  images?: string[] // Array of image URLs
}

export default function ProductsPage() {
  const { user: authUser } = useAuth()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [stockIncreaseDialog, setStockIncreaseDialog] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [stockQuantity, setStockQuantity] = useState('')
  const [increasingStock, setIncreasingStock] = useState(false)
  const [lowStockFilter, setLowStockFilter] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCurrentUserRole()
    
    // Check if we should show the create form based on URL params
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams, currentPage])

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setCurrentUserRole('')
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error fetching user role:', error)
      setCurrentUserRole('')
    }
  }

  // Check if user can manage products (admin, manager, superadmin)
  const canManageProducts = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-products')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      setProducts(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Error fetching products')
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (productId: string, productName: string) => {
    if (!canManageProducts) {
      toast.error('Vous n\'avez pas la permission de supprimer des produits')
      return
    }

    // Check if product is referenced in sales items
    const { data: salesItems, error: checkError } = await supabase
      .from('dd-ventes-items')
      .select('id')
      .eq('product_id', productId)
      .limit(1)

    if (checkError) {
      console.error('Error checking product references:', checkError)
    }

    if (salesItems && salesItems.length > 0) {
      // Product is referenced in sales - do soft delete instead
      const confirmSoftDelete = confirm(
        `Le produit "${productName}" est référencé dans des ventes et ne peut pas être supprimé définitivement.\n\n` +
        `Voulez-vous le désactiver (soft delete) ? Il sera masqué mais les données de vente seront conservées.`
      )
      
      if (!confirmSoftDelete) {
        return
      }

      try {
        const { error } = await supabase
          .from('dd-products')
          .update({ is_active: false, status: 'archived' })
          .eq('id', productId)

        if (error) throw error
        
        fetchProducts()
        toast.success('Produit désactivé avec succès!')
      } catch (error) {
        console.error('Error deactivating product:', error)
        toast.error('Erreur lors de la désactivation du produit')
      }
    } else {
      // Product is not referenced - can do hard delete
      if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${productName}" ? Cette action ne peut pas être annulée.`)) {
        return
      }

      try {
        const { error } = await supabase
          .from('dd-products')
          .delete()
          .eq('id', productId)

        if (error) {
          // Check if it's a foreign key constraint error
          if (error.code === '23503' || error.message?.includes('foreign key')) {
            // Try soft delete instead
            const { error: softDeleteError } = await supabase
              .from('dd-products')
              .update({ is_active: false, status: 'archived' })
              .eq('id', productId)

            if (softDeleteError) throw softDeleteError
            
            fetchProducts()
            toast.success('Le produit ne peut pas être supprimé définitivement. Il a été désactivé.')
          } else {
            throw error
          }
        } else {
          fetchProducts()
          toast.success('Produit supprimé avec succès!')
        }
      } catch (error: any) {
        console.error('Error deleting product:', error)
        const errorMessage = error.message || 'Erreur lors de la suppression du produit'
        toast.error(errorMessage)
      }
    }
  }

  const openStockIncreaseDialog = (product: Product) => {
    if (!canManageProducts) {
      toast.error('Vous n\'avez pas la permission de modifier le stock')
      return
    }
    setStockIncreaseDialog({ open: true, product })
    setStockQuantity('')
  }

  const closeStockIncreaseDialog = () => {
    setStockIncreaseDialog({ open: false, product: null })
    setStockQuantity('')
  }

  const increaseStock = async () => {
    if (!stockIncreaseDialog.product || !stockQuantity) {
      toast.error('Veuillez entrer une quantité valide')
      return
    }

    const quantity = parseInt(stockQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Veuillez entrer une quantité valide (nombre positif)')
      return
    }

    try {
      setIncreasingStock(true)
      const newStock = stockIncreaseDialog.product.stock_quantity + quantity

      const { error } = await supabase
        .from('dd-products')
        .update({ stock_quantity: newStock })
        .eq('id', stockIncreaseDialog.product.id)

      if (error) throw error

      toast.success(`Stock augmenté de ${quantity} unités. Nouveau stock: ${newStock}`)
      closeStockIncreaseDialog()
      fetchProducts()
    } catch (error) {
      console.error('Error increasing stock:', error)
      toast.error('Erreur lors de l\'augmentation du stock')
    } finally {
      setIncreasingStock(false)
    }
  }

  // Filter products based on search term and low stock filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.show_to_website && 'site web'.includes(searchTerm.toLowerCase())) ||
      (!product.show_to_website && 'non site web'.includes(searchTerm.toLowerCase()))
    
    if (lowStockFilter) {
      return matchesSearch && product.stock_quantity < 10
    }
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'draft':
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
      case 'draft': return 'Brouillon'
      case 'archived': return 'Archivé'
      default: return 'Inconnu'
    }
  }

  if (loading && products.length === 0) {
    return <TableLoadingState />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-foreground dark:text-white">Produits</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez votre inventaire de produits.</p>
        </div>
        {canManageProducts && (
          <AnimatedButton onClick={() => {
            setShowCreateForm(!showCreateForm)
            if (showCreateForm) {
              // Clear URL parameters when canceling
              window.history.replaceState({}, '', '/admin/products')
            }
          }} delay={0.1}>
            {showCreateForm ? 'Annuler' : 'Ajouter un Produit'}
          </AnimatedButton>
        )}
      </div>

      {/* Create Product Form */}
      {showCreateForm && <AddProduct onProductCreated={fetchProducts} />}

      {/* Only show products list when not in create mode */}
      {!showCreateForm && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-gray-900 dark:text-white">{products.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Produits Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-gray-900 dark:text-white">{products.filter((p) => p.status === 'active').length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Stock Faible</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-gray-900 dark:text-white">{products.filter((p) => p.stock_quantity < 10).length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Sur le Site Web</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-base font-bold text-gray-900 dark:text-white">{products.filter((p) => p.show_to_website).length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Rechercher des Produits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, SKU, marque ou statut site web..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <Button
                  variant={lowStockFilter ? "default" : "outline"}
                  onClick={() => setLowStockFilter(!lowStockFilter)}
                  className={lowStockFilter ? "bg-red-600 hover:bg-red-700 text-white" : "bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Stock Faibles
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Liste des Produits ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-700">
                      <TableHead className="text-gray-600 dark:text-gray-400">Image</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Nom</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">SKU</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Prix</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Stock</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Site Web</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Statut</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell>
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{product.sku || '—'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">${product.price.toFixed(2)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className={`text-sm font-medium ${
                              product.stock_quantity < 10 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {product.stock_quantity}
                            </span>
                            {canManageProducts && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                onClick={() => openStockIncreaseDialog(product)}
                                title="Augmenter le stock"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={product.show_to_website ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}>
                            {product.show_to_website ? 'Oui' : 'Non'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(product.status)}>
                            {getStatusText(product.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/admin/products/${product.id}`}>
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canManageProducts && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={() => deleteProduct(product.id, product.name)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No products found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, products.length)} sur {products.length} produits
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
        </>
      )}

      {/* Stock Increase Dialog */}
      {stockIncreaseDialog.open && stockIncreaseDialog.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white">
                Augmenter le Stock
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeStockIncreaseDialog}
                className="h-6 w-6 text-gray-600 dark:text-gray-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                  Produit: <span className="font-medium text-gray-900 dark:text-white">{stockIncreaseDialog.product.name}</span>
                </p>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Stock actuel: <span className="font-medium text-gray-900 dark:text-white">{stockIncreaseDialog.product.stock_quantity}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-quantity" className="text-gray-700 dark:text-gray-300">
                  Quantité à ajouter
                </Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Entrez la quantité"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={closeStockIncreaseDialog}
                  className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </Button>
                <Button
                  onClick={increaseStock}
                  disabled={increasingStock || !stockQuantity || parseInt(stockQuantity) <= 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {increasingStock ? <ButtonLoadingSpinner /> : 'Augmenter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
