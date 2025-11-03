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
import toast from "react-hot-toast"

interface AddCategoryProps {
  onCategoryCreated?: () => void
  categoryType: 'product' | 'service'
}

export function AddCategory({ onCategoryCreated, categoryType }: AddCategoryProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: categoryType,
    parent_id: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
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

      // Prepare category data for insertion
      const categoryData = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        parent_id: formData.parent_id || null,
        is_active: true,
        created_by: currentUser.id
      }

      // Insert category into dd-categories table
      const { data, error } = await supabase
        .from('dd-categories')
        .insert([categoryData])
        .select()

      if (error) {
        console.error('Error creating category:', error)
        toast.error('Erreur lors de la création de la catégorie: ' + error.message)
        return
      }

      toast.success("Catégorie créée avec succès!")
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        type: categoryType,
        parent_id: ""
      })

      // Call the callback to refresh the categories list
      if (onCategoryCreated) {
        onCategoryCreated()
      }
      
    } catch (error) {
      console.error("Error creating category:", error)
      toast.error("Erreur lors de la création de la catégorie. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white">
          Ajouter une Catégorie {categoryType === 'product' ? 'Produit' : 'Service'}
        </h1>
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Créer une nouvelle catégorie pour vos {categoryType === 'product' ? 'produits' : 'services'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations de la Catégorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nom de la Catégorie *</Label>
              <Input 
                id="name" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Entrez le nom de la catégorie" 
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
                placeholder="Entrez une description de la catégorie" 
                rows={3}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-700 dark:text-gray-300">Type de Catégorie</Label>
              <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
                <SelectTrigger id="type" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Produit</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
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
            onClick={() => window.history.replaceState({}, '', `/admin/categories?type=${categoryType}`)}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <ButtonLoadingSpinner /> : 'Créer la Catégorie'}
          </Button>
        </div>
      </form>
    </div>
  )
}
