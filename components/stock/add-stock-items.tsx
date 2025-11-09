"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Package } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { generateBatchCode } from "@/lib/code-generators"
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
  sku?: string
  barcode?: string
  price: number
  brand?: string
  stock_quantity?: number
  variants?: ProductVariant[]
}

interface StockItem {
  product_id: string
  quantity: number
  cost_per_unit: number
  expiry_date?: string
  notes?: string
}

interface AddStockItemsProps {
  stockId: string
  stockRef: string
  onStockItemsAdded?: () => void
}

export function AddStockItems({ stockId, stockRef, onStockItemsAdded }: AddStockItemsProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([
    { product_id: "", quantity: 0, cost_per_unit: 0 }
  ])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-products')
        .select('id, name, sku, barcode, price, stock_quantity')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Erreur lors de la récupération des produits')
    }
  }

  const addStockItem = () => {
    setStockItems([...stockItems, { product_id: "", quantity: 0, cost_per_unit: 0 }])
  }

  const removeStockItem = (index: number) => {
    if (stockItems.length > 1) {
      setStockItems(stockItems.filter((_, i) => i !== index))
    }
  }

  const updateStockItem = (index: number, field: keyof StockItem, value: string | number) => {
    const updated = [...stockItems]
    updated[index] = { ...updated[index], [field]: value }
    setStockItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get current user ID for created_by field
      const { data: currentUser, error: userError } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (userError) {
        console.error('Error fetching current user:', userError)
        toast.error('Erreur lors de la récupération des informations utilisateur')
        return
      }

      // Prepare stock items data
      const stockItemsData = stockItems
        .filter(item => item.product_id && item.quantity > 0)
        .map(item => {
          const product = products.find(p => p.id === item.product_id)
          const batchCode = generateBatchCode(stockRef, product?.sku || '')
          
          return {
            stock_id: stockId,
            product_id: item.product_id,
            quantity: item.quantity,
            batch_code: batchCode,
            cost_per_unit: item.cost_per_unit,
            total_cost: item.cost_per_unit * item.quantity,
            expiry_date: item.expiry_date || null,
            notes: item.notes || null,
            is_active: true,
            created_by: currentUser.id
          }
        })

      if (stockItemsData.length === 0) {
        toast.error('Veuillez ajouter au moins un produit avec une quantité')
        return
      }

      // Insert stock items
      const { error } = await supabase
        .from('dd-stock-items')
        .insert(stockItemsData)
        .select()

      if (error) {
        console.error('Error creating stock items:', error)
        toast.error('Erreur lors de la création des articles de stock: ' + error.message)
        return
      }

      // Update product stock quantities
      for (const item of stockItemsData) {
        // First fetch current stock quantity
        const { data: currentProduct } = await supabase
          .from('dd-products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single()

        if (currentProduct) {
          const newStockQuantity = (currentProduct.stock_quantity || 0) + item.quantity
          const { error: updateError } = await supabase
            .from('dd-products')
            .update({ 
              stock_quantity: newStockQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.product_id)

          if (updateError) {
            console.error('Error updating product stock:', updateError)
          }
        }
      }

      toast.success(`${stockItemsData.length} articles ajoutés au stock avec succès!`)
      
      // Reset form
      setStockItems([{ product_id: "", quantity: 0, cost_per_unit: 0 }])

      // Call the callback to refresh the stock items list
      if (onStockItemsAdded) {
        onStockItemsAdded()
      }
      
    } catch (error) {
      console.error("Error creating stock items:", error)
      toast.error("Erreur lors de la création des articles de stock. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const getSelectedProduct = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white">
          Ajouter des Produits au Stock
        </h1>
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Ajouter des produits existants à ce stock avec leurs quantités
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Articles du Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stockItems.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Article {index + 1}
                  </h4>
                  {stockItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStockItem(index)}
                      className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Produit *</Label>
                    <Select 
                      value={item.product_id} 
                      onValueChange={(value) => updateStockItem(index, 'product_id', value)}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              <span>{product.name}</span>
                              <span className="text-xs text-muted-foreground">({product.sku})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Quantité *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateStockItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Coût par Unité (XOF)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.cost_per_unit}
                      onChange={(e) => updateStockItem(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Date d&apos;Expiration</Label>
                    <Input
                      type="date"
                      value={item.expiry_date || ''}
                      onChange={(e) => updateStockItem(index, 'expiry_date', e.target.value)}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </div>

                {item.product_id && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-sm">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p><strong>Produit sélectionné:</strong> {getSelectedProduct(item.product_id)?.name}</p>
                      <p><strong>SKU:</strong> {getSelectedProduct(item.product_id)?.sku}</p>
                      <p><strong>Code-barres:</strong> {getSelectedProduct(item.product_id)?.barcode}</p>
                      <p><strong>Stock actuel:</strong> {getSelectedProduct(item.product_id)?.stock_quantity} unités</p>
                      <p><strong>Prix de vente:</strong> {getSelectedProduct(item.product_id)?.price} XOF</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addStockItem}
              className="w-full bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un Autre Produit
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => window.history.replaceState({}, '', '/admin/stock')}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <ButtonLoadingSpinner /> : 'Ajouter au Stock'}
          </Button>
        </div>
      </form>
    </div>
  )
}
