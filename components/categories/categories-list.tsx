"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Trash2, Tag, Package, Scissors } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"

interface Category {
  id: string
  name: string
  description?: string
  type: 'product' | 'service'
  parent_id?: string
  is_active: boolean
  created_at: string
  created_by?: string
}

interface CategoriesListProps {
  categoryType: 'product' | 'service'
}

export function CategoriesList({ categoryType }: CategoriesListProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const itemsPerPage = 20
  
  // Check if user is admin
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin'

  useEffect(() => {
    if (authUser) {
      fetchCurrentUserRole()
    }
  }, [authUser])
  
  useEffect(() => {
    fetchCategories()
  }, [categoryType, currentPage])
  
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

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      // Fetch all categories (no pagination for now to show hierarchy properly)
      const { data, error, count } = await supabase
        .from('dd-categories')
        .select('*', { count: 'exact' })
        .eq('type', categoryType)
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('name', { ascending: true })

      if (error) throw error
      
      setCategories(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching categories:', error)
      toast.error('Erreur lors de la récupération des catégories')
    } finally {
      setLoading(false)
    }
  }

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas la permission de supprimer des catégories')
      return
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}"? Cette action ne peut pas être annulée.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      
      fetchCategories()
      toast.success('Catégorie supprimée avec succès!')
    } catch (error) {
      console.error('Error deleting category:', error)
      toast.error('Erreur lors de la suppression de la catégorie')
    }
  }

  // Filter categories based on search term
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Actif' : 'Inactif'
  }

  const getTypeIcon = (type: string) => {
    return type === 'product' ? <Package className="w-4 h-4" /> : <Scissors className="w-4 h-4" />
  }

  const getTypeText = (type: string) => {
    return type === 'product' ? 'Produit' : 'Service'
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement des catégories...</p>
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
            Catégories {getTypeText(categoryType)}
          </h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Gérez les catégories de vos {categoryType === 'product' ? 'produits' : 'services'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => router.push(`/admin/categories?type=${categoryType}&action=create`)}>
            Ajouter une Catégorie
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Catégories Actives</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{categories.filter((c) => c.is_active).length}</div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Catégories Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{categories.filter((c) => !c.parent_id).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Rechercher des Catégories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Catégories ({filteredCategories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-gray-600 dark:text-gray-400">Nom</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Statut</TableHead>
                  <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => {
                  const parentCategory = category.parent_id 
                    ? categories.find(c => c.id === category.parent_id)
                    : null
                  
                  return (
                  <TableRow key={category.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Tag className={`w-4 h-4 text-muted-foreground dark:text-gray-400 ${category.parent_id ? 'ml-6' : ''}`} />
                        {category.parent_id && (
                          <span className="text-xs text-gray-400">└─</span>
                        )}
                        <span>{category.name}</span>
                        {parentCategory && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({parentCategory.name})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(category.type)}
                        <span className="text-gray-600 dark:text-gray-400">{getTypeText(category.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(category.is_active)}>
                        {getStatusText(category.is_active)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            onClick={() => {
                              router.push(`/admin/categories?type=${categoryType}&action=edit&id=${category.id}`)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => deleteCategory(category.id, category.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {!isAdmin && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">Lecture seule</span>
                      )}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            {filteredCategories.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucune catégorie trouvée</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, categories.length)} sur {categories.length} catégories
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
