"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Trash2, ArrowLeft, Package, Image as ImageIcon, Plus, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import toast from "react-hot-toast"

interface Product {
  id: string
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost: number
  stock_quantity: number
  status: string
  show_to_website: boolean
  images: string[]
  brand?: string
  created_at: string
  category?: {
    id: string
    name: string
  }
}

interface ProductsDetailsProps {
  productId?: string
}

export function ProductsDetails({ productId }: ProductsDetailsProps) {
  const { user: authUser } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [stockIncreaseDialog, setStockIncreaseDialog] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('')
  const [increasingStock, setIncreasingStock] = useState(false)

  useEffect(() => {
    if (productId) {
      fetchProduct()
      fetchCurrentUserRole()
    }
  }, [productId])

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

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dd-products')
        .select('*, category:dd-categories(id, name)')
        .eq('id', productId)
        .single()

      if (error) throw error
      setProduct(data as unknown as Product)
    } catch (error) {
      console.error('Error fetching product:', error)
      setError('Erreur lors de la récupération du produit')
      toast.error('Erreur lors de la récupération du produit')
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async () => {
    if (!product || !canManageProducts) {
      toast.error('Vous n\'avez pas la permission de supprimer des produits')
      return
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}"? Cette action ne peut pas être annulée.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-products')
        .delete()
        .eq('id', product.id)

      if (error) throw error
      
      toast.success('Produit supprimé avec succès!')
      window.history.back()
    } catch (error) {
      console.error('Error deleting product:', error)
      toast.error('Erreur lors de la suppression du produit')
    }
  }

  const openStockIncreaseDialog = () => {
    if (!canManageProducts) {
      toast.error('Vous n\'avez pas la permission de modifier le stock')
      return
    }
    setStockIncreaseDialog(true)
    setStockQuantity('')
  }

  const closeStockIncreaseDialog = () => {
    setStockIncreaseDialog(false)
    setStockQuantity('')
  }

  const increaseStock = async () => {
    if (!product || !stockQuantity) {
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
      const newStock = product.stock_quantity + quantity

      const { error } = await supabase
        .from('dd-products')
        .update({ stock_quantity: newStock })
        .eq('id', product.id)

      if (error) throw error

      toast.success(`Stock augmenté de ${quantity} unités. Nouveau stock: ${newStock}`)
      closeStockIncreaseDialog()
      fetchProduct()
    } catch (error) {
      console.error('Error increasing stock:', error)
      toast.error('Erreur lors de l\'augmentation du stock')
    } finally {
      setIncreasingStock(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ButtonLoadingSpinner />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement du produit...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Produit non trouvé'}</p>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  const profit = product.price - product.cost
  const margin = ((profit / product.price) * 100).toFixed(1)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.history.back()}
          className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">{product.name}</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            SKU: {product.sku || 'N/A'} • Code-barres: {product.barcode || 'N/A'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          {product.images && product.images.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Images du Produit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Info */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Informations du Produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Catégorie</p>
                  <p className="font-medium text-gray-900 dark:text-white">{product.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Statut</p>
                  <Badge className={
                    product.status === 'active' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : product.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }>
                    {product.status === 'active' ? 'Actif' : product.status === 'draft' ? 'Brouillon' : 'Archivé'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Marque</p>
                  <p className="font-medium text-gray-900 dark:text-white">{product.brand || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Site Web</p>
                  <Badge className={product.show_to_website ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}>
                    {product.show_to_website ? 'Oui' : 'Non'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">Description</p>
                <p className="text-sm text-gray-900 dark:text-white">{product.description || 'Aucune description'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Inventory */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Prix et Inventaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${canManageProducts ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1'}`}>
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Prix de Vente</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{product.price.toFixed(2)} XOF</p>
                </div>
                {canManageProducts && (
                  <>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Prix de Revient</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{product.cost.toFixed(2)} XOF</p>
                    </div>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Bénéfice</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{profit.toFixed(2)} XOF</p>
                    </div>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Marge</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{margin}%</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stock Info */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white">Informations de Stock</CardTitle>
              {canManageProducts && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 border-green-200 dark:border-green-800"
                  onClick={openStockIncreaseDialog}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Augmenter le stock
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">Stock Actuel</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{product.stock_quantity} unités</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      product.stock_quantity === 0 
                        ? 'bg-red-600' 
                        : product.stock_quantity < 10 
                        ? 'bg-yellow-600' 
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min((product.stock_quantity / 100) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="text-sm text-muted-foreground dark:text-gray-400">
                  {product.stock_quantity === 0 
                    ? 'Rupture de stock' 
                    : product.stock_quantity < 10 
                    ? 'Stock faible' 
                    : 'Stock suffisant'
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManageProducts && (
                <>
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Edit className="w-4 h-4" />
                    Modifier le Produit
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={deleteProduct}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer le Produit
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Product Details */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Détails du Produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground dark:text-gray-400">Valeur du Stock</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(product.price * product.stock_quantity).toFixed(2)} XOF
                </p>
              </div>
              {canManageProducts && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Bénéfice Potentiel</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(profit * product.stock_quantity).toFixed(2)} XOF
                  </p>
                </div>
              )}
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs text-muted-foreground dark:text-gray-400">Date de Création</p>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {new Date(product.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Increase Dialog */}
      {stockIncreaseDialog && product && (
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
                  Produit: <span className="font-medium text-gray-900 dark:text-white">{product.name}</span>
                </p>
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Stock actuel: <span className="font-medium text-gray-900 dark:text-white">{product.stock_quantity}</span>
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
