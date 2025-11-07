"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, ArrowLeft, Plus, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import toast from "react-hot-toast"

interface ProductVariant {
  id: string
  product_id: string
  name: string
  sku?: string
  quantity: number
}

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
  variants?: ProductVariant[]
}

interface ProductsDetailsProps {
  productId?: string
}

export function ProductsDetails({ productId }: ProductsDetailsProps) {
  const { user: authUser } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [stockIncreaseDialog, setStockIncreaseDialog] = useState(false)
  const [stockQuantity, setStockQuantity] = useState('')
  const [increasingStock, setIncreasingStock] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string>('global')
  const [variantDialogOpen, setVariantDialogOpen] = useState(false)
  const [savingVariant, setSavingVariant] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [variantForm, setVariantForm] = useState({
    name: '',
    sku: '',
    quantity: ''
  })

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
        .select(`
          *,
          category:dd-categories(id, name),
          variants:dd-product-variants(
            id,
            product_id,
            name,
            sku,
            quantity
          )
        `)
        .eq('id', productId)
        .single()

      if (error) throw error
      const productData = data as unknown as Product
      setProduct(productData)
      setVariants(productData.variants || [])
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

    // Check if product is referenced in sales items
    const { data: salesItems, error: checkError } = await supabase
      .from('dd-ventes-items')
      .select('id')
      .eq('product_id', product.id)
      .limit(1)

    if (checkError) {
      console.error('Error checking product references:', checkError)
    }

    if (salesItems && salesItems.length > 0) {
      // Product is referenced in sales - do soft delete instead
      const confirmSoftDelete = confirm(
        `Le produit "${product.name}" est référencé dans des ventes et ne peut pas être supprimé définitivement.\n\n` +
        `Voulez-vous le désactiver (soft delete) ? Il sera masqué mais les données de vente seront conservées.`
      )
      
      if (!confirmSoftDelete) {
        return
      }

      try {
        const { error } = await supabase
          .from('dd-products')
          .update({ is_active: false, status: 'archived' })
          .eq('id', product.id)

        if (error) throw error
        
        toast.success('Produit désactivé avec succès!')
        window.history.back()
      } catch (error) {
        console.error('Error deactivating product:', error)
        toast.error('Erreur lors de la désactivation du produit')
      }
    } else {
      // Product is not referenced - can do hard delete
      if (!confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product.name}" ? Cette action ne peut pas être annulée.`)) {
        return
      }

      try {
        const { error } = await supabase
          .from('dd-products')
          .delete()
          .eq('id', product.id)

        if (error) {
          // Check if it's a foreign key constraint error
          if (error.code === '23503' || error.message?.includes('foreign key')) {
            // Try soft delete instead
            const { error: softDeleteError } = await supabase
              .from('dd-products')
              .update({ is_active: false, status: 'archived' })
              .eq('id', product.id)

            if (softDeleteError) throw softDeleteError
            
            toast.success('Le produit ne peut pas être supprimé définitivement. Il a été désactivé.')
            window.history.back()
          } else {
            throw error
          }
        } else {
          toast.success('Produit supprimé avec succès!')
          window.history.back()
        }
      } catch (error: any) {
        console.error('Error deleting product:', error)
        const errorMessage = error.message || 'Erreur lors de la suppression du produit'
        toast.error(errorMessage)
      }
    }
  }

  const openStockIncreaseDialog = () => {
    if (!canManageProducts) {
      toast.error('Vous n\'avez pas la permission de modifier le stock')
      return
    }
    setStockIncreaseDialog(true)
    setStockQuantity('')
    setSelectedVariantId('global')
  }

  const closeStockIncreaseDialog = () => {
    setStockIncreaseDialog(false)
    setStockQuantity('')
    setSelectedVariantId('global')
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

      if (selectedVariantId !== 'global') {
        const variant = variants.find(v => v.id === selectedVariantId)
        const currentVariantQuantity = variant?.quantity ?? 0
        const { error: variantError } = await supabase
          .from('dd-product-variants')
          .update({ quantity: currentVariantQuantity + quantity })
          .eq('id', selectedVariantId)

        if (variantError) throw variantError
      }

      toast.success(`Stock augmenté de ${quantity} unités${selectedVariantId !== 'global' ? ' pour la variante sélectionnée' : ''}. Nouveau stock: ${newStock}`)
      closeStockIncreaseDialog()
      fetchProduct()
    } catch (error) {
      console.error('Error increasing stock:', error)
      toast.error('Erreur lors de l\'augmentation du stock')
    } finally {
      setIncreasingStock(false)
    }
  }

  const variantTotalQuantity = variants.reduce((sum, variant) => sum + variant.quantity, 0)

  const openVariantDialog = (variant?: ProductVariant) => {
    if (!product) return

    setEditingVariant(variant || null)
    setVariantForm({
      name: variant?.name || '',
      sku: variant?.sku || '',
      quantity: variant ? String(variant.quantity) : ''
    })
    setVariantDialogOpen(true)
  }

  const closeVariantDialog = () => {
    setVariantDialogOpen(false)
    setEditingVariant(null)
    setVariantForm({ name: '', sku: '', quantity: '' })
  }

  const handleVariantSave = async () => {
    if (!product) return

    const trimmedName = variantForm.name.trim()
    const trimmedSku = variantForm.sku.trim() || null
    const quantity = parseInt(variantForm.quantity, 10)

    if (!trimmedName) {
      toast.error('Le nom de la variante est obligatoire')
      return
    }

    if (isNaN(quantity) || quantity < 0) {
      toast.error('Veuillez entrer une quantité valide (0 ou plus)')
      return
    }

    const variantsExcludingCurrent = variants.filter(v => v.id !== editingVariant?.id)
    const existingNames = variantsExcludingCurrent.map(v => v.name.toLowerCase())

    if (existingNames.includes(trimmedName.toLowerCase())) {
      toast.error('Une variante avec ce nom existe déjà')
      return
    }

    const otherTotal = variantsExcludingCurrent.reduce((sum, v) => sum + v.quantity, 0)
    const availableCapacity = product.stock_quantity - otherTotal

    if (quantity > availableCapacity) {
      toast.error(`La quantité dépasse le stock disponible (${availableCapacity} restant).`)
      return
    }

    try {
      setSavingVariant(true)

      if (editingVariant) {
        const { error } = await supabase
          .from('dd-product-variants')
          .update({
            name: trimmedName,
            sku: trimmedSku,
            quantity
          })
          .eq('id', editingVariant.id)

        if (error) throw error
        toast.success('Variante mise à jour avec succès!')
      } else {
        const { error } = await supabase
          .from('dd-product-variants')
          .insert({
            product_id: product.id,
            name: trimmedName,
            sku: trimmedSku,
            quantity
          })

        if (error) throw error
        toast.success('Variante ajoutée avec succès!')
      }

      await fetchProduct()
      closeVariantDialog()
    } catch (error: any) {
      console.error('Error saving variant:', error)
      toast.error(error?.message || 'Erreur lors de l\'enregistrement de la variante')
    } finally {
      setSavingVariant(false)
    }
  }

  const handleDeleteVariant = async (variant: ProductVariant) => {
    if (!confirm(`Supprimer la variante "${variant.name}" ?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-product-variants')
        .delete()
        .eq('id', variant.id)

      if (error) throw error

      toast.success('Variante supprimée avec succès!')
      await fetchProduct()
    } catch (error: any) {
      console.error('Error deleting variant:', error)
      toast.error(error?.message || 'Erreur lors de la suppression de la variante')
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
  const availableVariantCapacity = Math.max(product.stock_quantity - variantTotalQuantity, 0)

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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{product.price.toFixed(2)}f</p>
                </div>
                {canManageProducts && (
                  <>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Prix de Revient</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{product.cost.toFixed(2)}f</p>
                    </div>
                    <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <p className="text-xs text-muted-foreground dark:text-gray-400">Bénéfice</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">{profit.toFixed(2)}f</p>
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

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-gray-900 dark:text-white">Variantes</CardTitle>
                <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                  Total des variantes: {variantTotalQuantity} / {product.stock_quantity} unités
                </p>
              </div>
              {canManageProducts && (
                <Button
                  size="sm"
                  onClick={() => openVariantDialog()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground dark:text-gray-400">
                  Aucune variante définie pour ce produit.
                </p>
              ) : (
                <div className="space-y-2">
                  {variants.map(variant => (
                    <div key={variant.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{variant.name}</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">
                          SKU: {variant.sku || '—'} • Stock: {variant.quantity}
                        </p>
                      </div>
                      {canManageProducts && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openVariantDialog(variant)}
                            className="h-8 w-8 p-0"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteVariant(variant)}
                            className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canManageProducts && availableVariantCapacity > 0 && (
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Capacité restante pour les variantes: {availableVariantCapacity} unité(s).
                </p>
              )}
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
                  {(product.price * product.stock_quantity).toFixed(2)}f
                </p>
              </div>
              {canManageProducts && (
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Bénéfice Potentiel</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(profit * product.stock_quantity).toFixed(2)}f
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
                {variants.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Sélectionnez une variante (facultatif) :</p>
                    <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionner une variante" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-800">
                        <SelectItem value="global">Sans variante (stock global)</SelectItem>
                        {variants.map(variant => (
                          <SelectItem key={variant.id} value={variant.id}>
                            {variant.name} • Stock: {variant.quantity}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

      {variantDialogOpen && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white">
                {editingVariant ? 'Modifier la Variante' : 'Ajouter une Variante'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeVariantDialog}
                className="h-6 w-6 text-gray-600 dark:text-gray-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="variant-name" className="text-gray-700 dark:text-gray-300">Nom de la variante *</Label>
                <Input
                  id="variant-name"
                  value={variantForm.name}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Taille M, Couleur Rouge"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variant-sku" className="text-gray-700 dark:text-gray-300">SKU (optionnel)</Label>
                <Input
                  id="variant-sku"
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU spécifique à la variante"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variant-quantity" className="text-gray-700 dark:text-gray-300">Quantité *</Label>
                <Input
                  id="variant-quantity"
                  type="number"
                  min="0"
                  value={variantForm.quantity}
                  onChange={(e) => setVariantForm(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="0"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={closeVariantDialog}
                  className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleVariantSave}
                  disabled={savingVariant}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {savingVariant ? <ButtonLoadingSpinner /> : editingVariant ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
