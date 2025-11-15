"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { X } from "lucide-react"
import toast from "react-hot-toast"

interface AddCategoryProps {
  onCategoryCreated?: () => void
  categoryType: 'product' | 'service'
  categoryId?: string | null
}

export function AddCategory({ onCategoryCreated, categoryType, categoryId }: AddCategoryProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [categories, setCategories] = useState<Array<{id: string, name: string, parent_id?: string}>>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: categoryType,
    parent_id: ""
  })
  const isEditMode = !!categoryId
  
  // Check if user is admin
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    // Convert special values to empty string for database
    const normalizedValue = value === "none" ? "" : value
    setFormData((prev) => ({ ...prev, [name]: normalizedValue }))
  }

  useEffect(() => {
    if (authUser) {
      fetchCurrentUserRole()
    }
  }, [authUser])
  
  useEffect(() => {
    if (isAdmin) {
      fetchParentCategories()
      if (categoryId) {
        fetchCategoryData()
      }
    }
  }, [categoryType, categoryId, isAdmin])
  
  const fetchCurrentUserRole = async () => {
    try {
      setCheckingRole(true)
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setCurrentUserRole('')
        setCheckingRole(false)
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error fetching user role:', error)
      setCurrentUserRole('')
    } finally {
      setCheckingRole(false)
    }
  }
  
  const fetchCategoryData = async () => {
    if (!categoryId) return
    
    try {
      setFetching(true)
      const { data, error } = await supabase
        .from('dd-categories')
        .select('*')
        .eq('id', categoryId)
        .single()

      if (error) throw error

      if (data) {
        setFormData({
          name: data.name || "",
          description: data.description || "",
          type: data.type || categoryType,
          parent_id: data.parent_id || ""
        })
      }
    } catch (error) {
      console.error('Error fetching category:', error)
      toast.error('Erreur lors du chargement de la catégorie')
    } finally {
      setFetching(false)
    }
  }

  const fetchParentCategories = async () => {
    try {
      // Fetch only parent categories (categories without parent_id) for the same type
      // Exclude the current category if editing to prevent circular references
      let query = supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', categoryType)
        .eq('is_active', true)
        .is('parent_id', null) // Only get parent categories
        .order('name')

      // Exclude current category from parent options when editing
      if (isEditMode && categoryId) {
        query = query.neq('id', categoryId)
      }

      const { data, error } = await query

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching parent categories:', error)
    }
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

      // Prepare category data
      const categoryData: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        parent_id: formData.parent_id || null,
      }

      let data, error

      if (isEditMode && categoryId) {
        // Update existing category
        const updateData = { ...categoryData }
        // Don't update created_by when editing
        const { data: updateResult, error: updateError } = await supabase
          .from('dd-categories')
          .update(updateData)
          .eq('id', categoryId)
          .select()

        data = updateResult
        error = updateError

        if (error) {
          console.error('Error updating category:', error)
          toast.error('Erreur lors de la mise à jour de la catégorie: ' + error.message)
          return
        }

        toast.success("Catégorie mise à jour avec succès!")
      } else {
        // Insert new category
        const insertData = {
          ...categoryData,
          is_active: true,
          created_by: currentUser.id
        }

        const { data: insertResult, error: insertError } = await supabase
          .from('dd-categories')
          .insert([insertData])
          .select()

        data = insertResult
        error = insertError

        if (error) {
          console.error('Error creating category:', error)
          toast.error('Erreur lors de la création de la catégorie: ' + error.message)
          return
        }

        toast.success("Catégorie créée avec succès!")
      }
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        type: categoryType,
        parent_id: ""
      })
      
      // Refresh parent categories list
      fetchParentCategories()

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

  // Check if user has permission
  if (checkingRole) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Vérification des permissions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accès Interdit</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Vous n&apos;avez pas les permissions nécessaires pour {isEditMode ? 'modifier' : 'créer'} des catégories.
                Seuls les administrateurs peuvent gérer les catégories.
              </p>
            </div>
            <Button 
              onClick={() => router.push(`/admin/categories?type=${categoryType}`)}
              variant="outline"
            >
              Retour à la liste
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white">
          {isEditMode ? 'Modifier' : 'Ajouter'} une Catégorie {categoryType === 'product' ? 'Produit' : 'Service'}
        </h1>
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          {isEditMode 
            ? `Modifier la catégorie pour vos ${categoryType === 'product' ? 'produits' : 'services'}`
            : `Créer une nouvelle catégorie pour vos ${categoryType === 'product' ? 'produits' : 'services'}`
          }
        </p>
      </div>
      
      {fetching && (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Chargement de la catégorie...</p>
          </div>
        </div>
      )}

      {!fetching && (
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
            {categoryType === 'service' && (
              <div className="space-y-2">
                <Label htmlFor="parent_id" className="text-gray-700 dark:text-gray-300">
                  Catégorie Parente (optionnel)
                </Label>
                <Select 
                  value={formData.parent_id || "none"} 
                  onValueChange={(value) => handleSelectChange('parent_id', value)}
                >
                  <SelectTrigger id="parent_id" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Aucune (catégorie principale)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune (catégorie principale)</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Laissez vide pour créer une catégorie principale, ou sélectionnez une catégorie existante pour créer une sous-catégorie
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => router.push(`/admin/categories?type=${categoryType}`)}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading || fetching}>
            {loading ? <ButtonLoadingSpinner /> : isEditMode ? 'Mettre à jour la Catégorie' : 'Créer la Catégorie'}
          </Button>
        </div>
      </form>
      )}
    </div>
  )
}
