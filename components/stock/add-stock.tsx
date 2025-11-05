"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { generateStockRef } from "@/lib/code-generators"
import toast from "react-hot-toast"

interface AddStockProps {
  onStockCreated?: () => void
}

export function AddStock({ onStockCreated }: AddStockProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    stock_ref: generateStockRef(),
    status: "active"
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const regenerateStockRef = () => {
    setFormData((prev) => ({ ...prev, stock_ref: generateStockRef() }))
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

      // Prepare stock data for insertion
      const stockData = {
        name: formData.name,
        description: formData.description || null,
        stock_ref: formData.stock_ref,
        status: formData.status,
        is_active: true,
        created_by: currentUser.id
      }

      // Insert stock into dd-stocks table
      const { error } = await supabase
        .from('dd-stocks')
        .insert([stockData])
        .select()

      if (error) {
        console.error('Error creating stock:', error)
        toast.error('Erreur lors de la création du stock: ' + error.message)
        return
      }

      toast.success("Stock créé avec succès!")
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        stock_ref: generateStockRef(),
        status: "active"
      })

      // Call the callback to refresh the stocks list
      if (onStockCreated) {
        onStockCreated()
      }
      
    } catch (error) {
      console.error("Error creating stock:", error)
      toast.error("Erreur lors de la création du stock. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white">
          Créer un Nouveau Stock
        </h1>
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Créer un nouveau lot de stock pour organiser vos produits
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white dark:bg-gray-800 ">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations du Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nom du Stock *</Label>
              <Input 
                id="name" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Stock Octobre 2025" 
                required
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-700 dark:text-gray-300">Description</Label>
              <Textarea 
                id="description" 
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description du stock (optionnel)" 
                rows={3}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock_ref" className="text-gray-700 dark:text-gray-300">Référence du Stock</Label>
              <div className="flex gap-2">
                <Input 
                  id="stock_ref" 
                  name="stock_ref"
                  value={formData.stock_ref}
                  onChange={handleChange}
                  placeholder="STK-20251020-04F" 
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={regenerateStockRef}
                  className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Régénérer
                </Button>
              </div>
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Référence unique générée automatiquement pour ce stock
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-700 dark:text-gray-300">Statut</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger id="status" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {loading ? <ButtonLoadingSpinner /> : 'Créer le Stock'}
          </Button>
        </div>
      </form>
    </div>
  )
}
