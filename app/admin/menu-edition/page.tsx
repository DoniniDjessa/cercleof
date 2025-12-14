'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AnimatedButton } from '@/components/ui/animated-button'
import { TableLoadingState, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { 
  Menu, 
  Plus, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  Video, 
  Image as ImageIcon,
  X,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Camera
} from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { MultipleFileUpload } from '@/components/ui/multiple-file-upload'
import { MixedFileUpload } from '@/components/ui/mixed-file-upload'
import { compressImage } from '@/lib/image-utils'

// Type definitions matching todo.md
interface MediaItem {
  type: "image" | "video"
  src: string
  label?: string
}

interface GalleryMediaItem {
  type: "image" | "video"
  src: string
}

interface Service {
  title: string
  description: string
  image?: string
  heroMedia?: MediaItem
  fallbackVideo?: string
  price?: string
  duration?: string
  tags?: string[]
  media?: MediaItem[]
  galleryMedia?: GalleryMediaItem[]
}

interface SubCategory {
  title: string
  subtitle?: string
  description?: string
  video?: string
  image?: string
  services: Service[]
}

interface MenuCategory {
  title: string
  subtitle: string
  video: string
  subCategories?: SubCategory[]
  services?: Service[]
}

type MenuData = MenuCategory[]

export default function MenuEditionPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [menuData, setMenuData] = useState<MenuData>([])
  const [loading, setLoading] = useState(true)
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null)
  const [editingSubCategoryIndex, setEditingSubCategoryIndex] = useState<{ categoryIndex: number; subCategoryIndex: number } | null>(null)
  const [editingServiceIndex, setEditingServiceIndex] = useState<{ categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set())
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    fetchMenuData()
    fetchCurrentUserRole()
  }, [])

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

  // Only superAdmin and admin can access menu edition
  const canManageMenu = currentUserRole === 'admin' || currentUserRole === 'superadmin'
  const isSuperAdmin = currentUserRole === 'superadmin'

  const fetchMenuData = async () => {
    try {
      setLoading(true)
      // Use singleton ID pattern - fixed ID for menu data
      const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
      
      const { data, error } = await supabase
        .from('dd-menu')
        .select('*')
        .eq('id', MENU_DATA_ID)
        .single()

      if (error && error.code === 'PGRST116') {
        // Record doesn't exist - create it with empty data
        const { data: newData, error: insertError } = await supabase
          .from('dd-menu')
          .insert({
            id: MENU_DATA_ID,
            data: []
          })
          .select()
          .single()

        if (insertError) {
          // Table might not exist - fallback to localStorage
          const localData = localStorage.getItem('menu_data')
          if (localData) {
            setMenuData(JSON.parse(localData) as MenuData)
          } else {
            setMenuData([])
          }
          return
        }

        setMenuData([])
        return
      }

      if (error) {
        console.error('Error fetching menu data:', error)
        // Fallback to localStorage
        const localData = localStorage.getItem('menu_data')
        if (localData) {
          setMenuData(JSON.parse(localData) as MenuData)
        } else {
          setMenuData([])
        }
        return
      }

      if (data && data.data) {
        setMenuData(data.data as MenuData)
      } else {
        setMenuData([])
      }
    } catch (error) {
      console.error('Error fetching menu data:', error)
      // Fallback to localStorage
      const localData = localStorage.getItem('menu_data')
      if (localData) {
        setMenuData(JSON.parse(localData) as MenuData)
      } else {
        setMenuData([])
      }
    } finally {
      setLoading(false)
    }
  }

  const saveMenuData = async (data: MenuData) => {
    try {
      const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
      
      // Get current user ID for updated_by
      const { data: userData } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', authUser?.id)
        .single()

      // Update or insert menu data using singleton pattern
      const { error } = await supabase
        .from('dd-menu')
        .upsert({
          id: MENU_DATA_ID,
          data: data,
          updated_by: userData?.id || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })

      if (error) throw error
      
      // Also save to localStorage as backup
      localStorage.setItem('menu_data', JSON.stringify(data))
      toast.success('Menu data saved successfully!')
    } catch (error: any) {
      console.error('Error saving menu data:', error)
      // Fallback to localStorage
      localStorage.setItem('menu_data', JSON.stringify(data))
      if (error.code === '42P01') {
        toast.error('Menu data table not found. Please run the SQL migration: database/create-menu-data-table.sql')
      } else {
        toast.success('Menu data saved locally (database error occurred)')
      }
    }
  }

  const toggleCategoryExpanded = (index: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleSubCategoryExpanded = (categoryIndex: number, subCategoryIndex: number) => {
    const key = `${categoryIndex}-${subCategoryIndex}`
    const newExpanded = new Set(expandedSubCategories)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedSubCategories(newExpanded)
  }

  const addCategory = () => {
    const newCategory: MenuCategory = {
      title: '',
      subtitle: '',
      video: '',
      services: []
    }
    setMenuData([...menuData, newCategory])
    setEditingCategoryIndex(menuData.length)
  }

  const deleteCategory = (index: number) => {
    if (!confirm('Are you sure you want to delete this category? This will delete all subcategories and services within it.')) {
      return
    }
    const newData = [...menuData]
    newData.splice(index, 1)
    setMenuData(newData)
    saveMenuData(newData)
  }

  const addSubCategory = (categoryIndex: number) => {
    const newData = [...menuData]
    if (!newData[categoryIndex].subCategories) {
      newData[categoryIndex].subCategories = []
    }
    newData[categoryIndex].subCategories!.push({
      title: '',
      subtitle: '',
      video: '',
      image: '',
      services: []
    })
    setMenuData(newData)
    setEditingSubCategoryIndex({ categoryIndex, subCategoryIndex: newData[categoryIndex].subCategories!.length - 1 })
  }

  const deleteSubCategory = (categoryIndex: number, subCategoryIndex: number) => {
    if (!confirm('Are you sure you want to delete this subcategory? This will delete all services within it.')) {
      return
    }
    const newData = [...menuData]
    if (newData[categoryIndex].subCategories) {
      newData[categoryIndex].subCategories!.splice(subCategoryIndex, 1)
      setMenuData(newData)
      saveMenuData(newData)
    }
  }

  const addService = (categoryIndex: number, subCategoryIndex?: number) => {
    const newData = [...menuData]
    const newService: Service = {
      title: '',
      description: '',
      tags: [],
      media: [],
      galleryMedia: []
    }

    if (subCategoryIndex !== undefined) {
      // Add to subcategory
      if (!newData[categoryIndex].subCategories) {
        newData[categoryIndex].subCategories = []
      }
      newData[categoryIndex].subCategories![subCategoryIndex].services.push(newService)
      setEditingServiceIndex({ categoryIndex, subCategoryIndex, serviceIndex: newData[categoryIndex].subCategories![subCategoryIndex].services.length - 1 })
    } else {
      // Add to category directly
      if (!newData[categoryIndex].services) {
        newData[categoryIndex].services = []
      }
      newData[categoryIndex].services!.push(newService)
      setEditingServiceIndex({ categoryIndex, serviceIndex: newData[categoryIndex].services!.length - 1 })
    }
    setMenuData(newData)
  }

  const deleteService = (categoryIndex: number, subCategoryIndex: number | undefined, serviceIndex: number) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return
    }
    const newData = [...menuData]
    if (subCategoryIndex !== undefined) {
      if (newData[categoryIndex].subCategories) {
        newData[categoryIndex].subCategories![subCategoryIndex].services.splice(serviceIndex, 1)
      }
    } else {
      if (newData[categoryIndex].services) {
        newData[categoryIndex].services!.splice(serviceIndex, 1)
      }
    }
    setMenuData(newData)
    saveMenuData(newData)
  }

  if (loading) {
    return (
      <div className="p-6">
        <TableLoadingState />
      </div>
    )
  }

  // Check access: Only superAdmin and admin can access this page
  if (!canManageMenu) {
    return (
      <div className="p-6">
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have permission to access the Menu Edition page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Only Administrators and Super Administrators can access this page.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">Menu Data Edition</h1>
          <p className="text-muted-foreground dark:text-gray-400">Manage menu categories, subcategories, and services</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          {canManageMenu && (
            <>
              <AnimatedButton
                onClick={addCategory}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </AnimatedButton>
              <Button
                onClick={() => saveMenuData(menuData)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Menu Data List */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Menu Categories ({menuData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {menuData.length === 0 ? (
            <div className="text-center py-12">
              <Menu className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No categories yet. Add your first category to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {menuData.map((category, categoryIndex) => (
                <CategoryItem
                  key={categoryIndex}
                  category={category}
                  categoryIndex={categoryIndex}
                  isExpanded={expandedCategories.has(categoryIndex)}
                  onToggleExpanded={() => toggleCategoryExpanded(categoryIndex)}
                  onEdit={() => setEditingCategoryIndex(categoryIndex)}
                  onDelete={() => deleteCategory(categoryIndex)}
                  onAddSubCategory={() => addSubCategory(categoryIndex)}
                  onAddService={() => addService(categoryIndex)}
                  menuData={menuData}
                  setMenuData={setMenuData}
                  editingCategoryIndex={editingCategoryIndex}
                  editingSubCategoryIndex={editingSubCategoryIndex}
                  editingServiceIndex={editingServiceIndex}
                  onCategoryUpdate={(updatedCategory) => {
                    const newData = [...menuData]
                    newData[categoryIndex] = updatedCategory
                    setMenuData(newData)
                    saveMenuData(newData)
                  }}
                  onSubCategoryUpdate={(subCategoryIndex, updatedSubCategory) => {
                    const newData = [...menuData]
                    if (!newData[categoryIndex].subCategories) {
                      newData[categoryIndex].subCategories = []
                    }
                    newData[categoryIndex].subCategories![subCategoryIndex] = updatedSubCategory
                    setMenuData(newData)
                    saveMenuData(newData)
                  }}
                  onServiceUpdate={(subCategoryIndex, serviceIndex, updatedService) => {
                    const newData = [...menuData]
                    if (subCategoryIndex !== undefined) {
                      if (newData[categoryIndex].subCategories) {
                        newData[categoryIndex].subCategories![subCategoryIndex].services[serviceIndex] = updatedService
                      }
                    } else {
                      if (newData[categoryIndex].services) {
                        newData[categoryIndex].services![serviceIndex] = updatedService
                      }
                    }
                    setMenuData(newData)
                    saveMenuData(newData)
                  }}
                  onDeleteSubCategory={deleteSubCategory}
                  onDeleteService={deleteService}
                  expandedSubCategories={expandedSubCategories}
                  onToggleSubCategoryExpanded={toggleSubCategoryExpanded}
                  onSetEditingCategoryIndex={setEditingCategoryIndex}
                  onSetEditingSubCategoryIndex={setEditingSubCategoryIndex}
                  onSetEditingServiceIndex={setEditingServiceIndex}
                  canManage={canManageMenu}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Category Item Component
interface CategoryItemProps {
  category: MenuCategory
  categoryIndex: number
  isExpanded: boolean
  onToggleExpanded: () => void
  onEdit: () => void
  onDelete: () => void
  onAddSubCategory: () => void
  onAddService: () => void
  editingCategoryIndex: number | null
  editingSubCategoryIndex: { categoryIndex: number; subCategoryIndex: number } | null
  editingServiceIndex: { categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null
  onCategoryUpdate: (category: MenuCategory) => void
  onSubCategoryUpdate: (subCategoryIndex: number, subCategory: SubCategory) => void
  onServiceUpdate: (subCategoryIndex: number | undefined, serviceIndex: number, service: Service) => void
  onDeleteSubCategory: (categoryIndex: number, subCategoryIndex: number) => void
  onDeleteService: (categoryIndex: number, subCategoryIndex: number | undefined, serviceIndex: number) => void
  expandedSubCategories: Set<string>
  onToggleSubCategoryExpanded: (categoryIndex: number, subCategoryIndex: number) => void
  onSetEditingCategoryIndex: (index: number | null) => void
  onSetEditingSubCategoryIndex: (index: { categoryIndex: number; subCategoryIndex: number } | null) => void
  onSetEditingServiceIndex: (index: { categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null) => void
  menuData: MenuData
  setMenuData: (data: MenuData) => void
  canManage: boolean
  isSuperAdmin: boolean
}

function CategoryItem({
  category,
  categoryIndex,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onAddSubCategory,
  onAddService,
  editingCategoryIndex,
  editingSubCategoryIndex,
  editingServiceIndex,
  onCategoryUpdate,
  onSubCategoryUpdate,
  onServiceUpdate,
  onDeleteSubCategory,
  onDeleteService,
  expandedSubCategories,
  onToggleSubCategoryExpanded,
  onSetEditingCategoryIndex,
  onSetEditingSubCategoryIndex,
  onSetEditingServiceIndex,
  menuData,
  setMenuData,
  canManage,
  isSuperAdmin
}: CategoryItemProps) {
  const isEditing = editingCategoryIndex === categoryIndex
  const hasSubCategories = category.subCategories && category.subCategories.length > 0
  const hasDirectServices = category.services && category.services.length > 0

  if (isEditing) {
    return (
      <CategoryForm
        category={category}
        onSave={(updated) => {
          onCategoryUpdate(updated)
          onSetEditingCategoryIndex(null)
        }}
        onCancel={() => onSetEditingCategoryIndex(null)}
        isSuperAdmin={isSuperAdmin}
      />
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleExpanded}
            className="h-8 w-8"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{category.title || 'Untitled Category'}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{category.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasSubCategories && (
              <Badge variant="outline">{category.subCategories!.length} subcategories</Badge>
            )}
            {hasDirectServices && (
              <Badge variant="outline">{category.services!.length} services</Badge>
            )}
            {!hasSubCategories && !hasDirectServices && (
              <Badge variant="outline" className="text-gray-400">Empty</Badge>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4 text-red-600" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
          {/* Category Actions */}
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onAddSubCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Add SubCategory
              </Button>
              <Button size="sm" variant="outline" onClick={onAddService}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>
          )}

          {/* SubCategories */}
          {hasSubCategories && (
            <div className="space-y-2">
              {category.subCategories!.map((subCategory, subCategoryIndex) => (
                <SubCategoryItem
                  key={subCategoryIndex}
                  subCategory={subCategory}
                  categoryIndex={categoryIndex}
                  subCategoryIndex={subCategoryIndex}
                  isExpanded={expandedSubCategories.has(`${categoryIndex}-${subCategoryIndex}`)}
                  onToggleExpanded={() => onToggleSubCategoryExpanded(categoryIndex, subCategoryIndex)}
                  onEdit={() => onSetEditingSubCategoryIndex({ categoryIndex, subCategoryIndex })}
                  onDelete={() => onDeleteSubCategory(categoryIndex, subCategoryIndex)}
                  onAddService={() => {
                    const newData = [...menuData]
                    if (!newData[categoryIndex].subCategories) {
                      newData[categoryIndex].subCategories = []
                    }
                    const newService: Service = {
                      title: '',
                      description: '',
                      tags: [],
                      media: [],
                      galleryMedia: []
                    }
                    newData[categoryIndex].subCategories![subCategoryIndex].services.push(newService)
                    setMenuData(newData)
                    onSetEditingServiceIndex({ categoryIndex, subCategoryIndex, serviceIndex: newData[categoryIndex].subCategories![subCategoryIndex].services.length - 1 })
                  }}
                  editingSubCategoryIndex={editingSubCategoryIndex}
                  editingServiceIndex={editingServiceIndex}
                  onSubCategoryUpdate={(updated) => {
                    onSubCategoryUpdate(subCategoryIndex, updated)
                    onSetEditingSubCategoryIndex(null)
                  }}
                  onServiceUpdate={(serviceIndex, updated) => {
                    onServiceUpdate(subCategoryIndex, serviceIndex, updated)
                    onSetEditingServiceIndex(null)
                  }}
                  onDeleteService={(serviceIndex) => onDeleteService(categoryIndex, subCategoryIndex, serviceIndex)}
                  onSetEditingSubCategoryIndex={onSetEditingSubCategoryIndex}
                  onSetEditingServiceIndex={onSetEditingServiceIndex}
                  canManage={canManage}
                  isSuperAdmin={isSuperAdmin}
                />
              ))}
            </div>
          )}

          {/* Direct Services */}
          {hasDirectServices && (
            <div className="space-y-2">
              {category.services!.map((service, serviceIndex) => (
                <ServiceItem
                  key={serviceIndex}
                  service={service}
                  serviceIndex={serviceIndex}
                  subCategoryIndex={undefined}
                  categoryIndex={categoryIndex}
                  isEditing={editingServiceIndex?.categoryIndex === categoryIndex && 
                             editingServiceIndex?.subCategoryIndex === undefined && 
                             editingServiceIndex?.serviceIndex === serviceIndex}
              onEdit={() => onSetEditingServiceIndex({ categoryIndex, serviceIndex })}
              onDelete={() => onDeleteService(categoryIndex, undefined, serviceIndex)}
              onUpdate={(updated) => {
                onServiceUpdate(undefined, serviceIndex, updated)
                onSetEditingServiceIndex(null)
              }}
              onSetEditingServiceIndex={onSetEditingServiceIndex}
              canManage={canManage}
              isSuperAdmin={isSuperAdmin}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// SubCategory Item Component
interface SubCategoryItemProps {
  subCategory: SubCategory
  categoryIndex: number
  subCategoryIndex: number
  isExpanded: boolean
  onToggleExpanded: () => void
  onEdit: () => void
  onDelete: () => void
  onAddService: () => void
  editingSubCategoryIndex: { categoryIndex: number; subCategoryIndex: number } | null
  editingServiceIndex: { categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null
  onSubCategoryUpdate: (subCategory: SubCategory) => void
  onServiceUpdate: (serviceIndex: number, service: Service) => void
  onDeleteService: (serviceIndex: number) => void
  onSetEditingSubCategoryIndex: (index: { categoryIndex: number; subCategoryIndex: number } | null) => void
  onSetEditingServiceIndex: (index: { categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null) => void
  canManage: boolean
  isSuperAdmin: boolean
}

function SubCategoryItem({
  subCategory,
  categoryIndex,
  subCategoryIndex,
  isExpanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onAddService,
  editingSubCategoryIndex,
  editingServiceIndex,
  onSubCategoryUpdate,
  onServiceUpdate,
  onDeleteService,
  onSetEditingSubCategoryIndex,
  onSetEditingServiceIndex,
  canManage,
  isSuperAdmin
}: SubCategoryItemProps) {
  const isEditing = editingSubCategoryIndex?.categoryIndex === categoryIndex && 
                    editingSubCategoryIndex?.subCategoryIndex === subCategoryIndex

  if (isEditing) {
    return (
      <SubCategoryForm
        subCategory={subCategory}
        onSave={(updated) => {
          onSubCategoryUpdate(updated)
          onSetEditingSubCategoryIndex(null)
        }}
        onCancel={() => onSetEditingSubCategoryIndex(null)}
        isSuperAdmin={isSuperAdmin}
      />
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg ml-4">
      <div className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
        <div className="flex items-center gap-2 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleExpanded}
            className="h-6 w-6"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{subCategory.title || 'Untitled SubCategory'}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subCategory.subtitle}</p>
          </div>
          <Badge variant="outline" className="text-xs">{subCategory.services.length} services</Badge>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0">
              <Edit className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0">
              <Trash2 className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2">
          {canManage && (
            <Button size="sm" variant="outline" onClick={onAddService} className="text-xs">
              <Plus className="w-3 h-3 mr-1" />
              Add Service
            </Button>
          )}
          {subCategory.services.map((service, serviceIndex) => (
            <ServiceItem
              key={serviceIndex}
              service={service}
              serviceIndex={serviceIndex}
              subCategoryIndex={subCategoryIndex}
              categoryIndex={categoryIndex}
              isEditing={editingServiceIndex?.categoryIndex === categoryIndex && 
                         editingServiceIndex?.subCategoryIndex === subCategoryIndex && 
                         editingServiceIndex?.serviceIndex === serviceIndex}
              onEdit={() => onSetEditingServiceIndex({ categoryIndex, subCategoryIndex, serviceIndex })}
              onDelete={() => onDeleteService(serviceIndex)}
              onUpdate={(updated) => {
                onServiceUpdate(serviceIndex, updated)
                onSetEditingServiceIndex(null)
              }}
              onSetEditingServiceIndex={onSetEditingServiceIndex}
              canManage={canManage}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Service Item Component
interface ServiceItemProps {
  service: Service
  serviceIndex: number
  subCategoryIndex: number | undefined
  categoryIndex: number
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onUpdate: (service: Service) => void
  onSetEditingServiceIndex: (index: { categoryIndex: number; subCategoryIndex?: number; serviceIndex: number } | null) => void
  canManage: boolean
  isSuperAdmin: boolean
}

function ServiceItem({
  service,
  serviceIndex,
  subCategoryIndex,
  categoryIndex,
  isEditing,
  onEdit,
  onDelete,
  onUpdate,
  onSetEditingServiceIndex,
  canManage,
  isSuperAdmin
}: ServiceItemProps) {
  if (isEditing) {
    return (
      <ServiceForm
        service={service}
        onSave={onUpdate}
        onCancel={() => {}}
        isSuperAdmin={isSuperAdmin}
      />
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-2 ml-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 dark:text-white text-xs">{service.title || 'Untitled Service'}</h5>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{service.description}</p>
          <div className="flex items-center gap-2 mt-1">
            {service.price && (
              <Badge variant="outline" className="text-xs">{service.price}</Badge>
            )}
            {service.duration && (
              <Badge variant="outline" className="text-xs">{service.duration}</Badge>
            )}
            {service.tags && service.tags.length > 0 && (
              <Badge variant="outline" className="text-xs">{service.tags.length} tags</Badge>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-6 w-6 p-0">
              <Edit className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0">
              <Trash2 className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// Category Form Component
interface CategoryFormProps {
  category: MenuCategory
  onSave: (category: MenuCategory) => void
  onCancel: () => void
  isSuperAdmin: boolean
}

function CategoryForm({ category, onSave, onCancel, isSuperAdmin }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    title: category.title,
    subtitle: category.subtitle,
    video: category.video
  })

  const handleSave = () => {
    if (!formData.title || !formData.subtitle) {
      toast.error('Please fill in all required fields')
      return
    }

    // Video is required only for superAdmin, for admin preserve existing value
    if (isSuperAdmin && !formData.video) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate that either services OR subCategories exist, not both
    const hasServices = category.services && category.services.length > 0
    const hasSubCategories = category.subCategories && category.subCategories.length > 0

    if (hasServices && hasSubCategories) {
      toast.error('A category cannot have both services and subcategories. Please remove one.')
      return
    }

    // For non-superAdmin, preserve existing video value
    const savedCategory: MenuCategory = {
      ...category,
      title: formData.title,
      subtitle: formData.subtitle,
      video: isSuperAdmin ? formData.video : category.video
    }

    onSave(savedCategory)
    toast.success('Category saved successfully!')
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Edit Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Category title"
          />
        </div>
        <div>
          <Label>Subtitle *</Label>
          <Input
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="Category subtitle"
          />
        </div>
        {/* Video URL - Only visible to superAdmin */}
        {isSuperAdmin && (
          <div className="space-y-2">
            <Label>Video (YouTube ou Cloudinary) *</Label>
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="text-xs">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Lien
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">
                  <Video className="w-3 h-3 mr-1" />
                  Upload
                </TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="mt-2">
                <div className="flex gap-2">
                  <Input
                    value={formData.video}
                    onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                    placeholder="https://youtube.com/shorts/VIDEO_ID ou https://res.cloudinary.com/..."
                  />
                  {formData.video && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFormData({ ...formData, video: '' })}
                      title="Supprimer le lien"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <FileUpload
                  type="video"
                  onUploadComplete={(url) => setFormData({ ...formData, video: url })}
                  currentUrl={formData.video}
                  folder="menu/categories/videos"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// SubCategory Form Component
interface SubCategoryFormProps {
  subCategory: SubCategory
  onSave: (subCategory: SubCategory) => void
  onCancel: () => void
  isSuperAdmin: boolean
}

function SubCategoryForm({ subCategory, onSave, onCancel, isSuperAdmin }: SubCategoryFormProps) {
  const [formData, setFormData] = useState({
    title: subCategory.title,
    subtitle: subCategory.subtitle,
    description: subCategory.description || '',
    video: subCategory.video,
    image: subCategory.image || ''
  })
  const [subCategoryImage, setSubCategoryImage] = useState<File | null>(null)
  const [subCategoryVideo, setSubCategoryVideo] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(subCategory.image || subCategory.video || null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(subCategory.image ? 'image' : subCategory.video ? 'video' : null)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const handleMediaUpload = async (file: File | null, type: 'image' | 'video', compress: boolean = true) => {
    if (!file) return
    
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide')
      return
    }
    
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner un fichier vidéo valide')
      return
    }

    // Validate file size
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024 // 10MB for images, 100MB for videos
    if (file.size > maxSize) {
      toast.error(`La taille du fichier ne doit pas dépasser ${maxSize / 1024 / 1024}MB`)
      return
    }
    
    try {
      let processedFile = file
      
      // Compress image before setting it (videos are not compressed)
      if (type === 'image' && compress) {
        processedFile = await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 })
      }
      
      if (type === 'image') {
        setSubCategoryImage(processedFile)
        setSubCategoryVideo(null)
      } else {
        setSubCategoryVideo(processedFile)
        setSubCategoryImage(null)
      }
      
      setMediaType(type)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string)
      }
      reader.readAsDataURL(processedFile)
      
      toast.success(`${type === 'image' ? 'Image' : 'Vidéo'} ajoutée${type === 'image' && compress ? ' (compressée)' : ''}`)
    } catch (error) {
      console.error(`Error processing ${type}:`, error)
      toast.error(`Erreur lors du traitement de ${type === 'image' ? 'l\'image' : 'la vidéo'}`)
    }
  }

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    await handleMediaUpload(file, 'image', true)
    e.target.value = ''
  }

  const handleVideoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    await handleMediaUpload(file, 'video', false)
    e.target.value = ''
  }

  const handleCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      await handleMediaUpload(target.files?.[0] || null, 'image', true)
    }
    input.click()
  }

  const removeMedia = () => {
    setSubCategoryImage(null)
    setSubCategoryVideo(null)
    setMediaPreview(null)
    setMediaType(null)
    setFormData({ ...formData, image: '', video: '' })
  }

  const uploadMedia = async (): Promise<{ imageUrl: string | null, videoUrl: string | null }> => {
    let imageUrl: string | null = null
    let videoUrl: string | null = null

    try {
      setUploadingMedia(true)
      
      if (subCategoryImage) {
        const formData = new FormData()
        formData.append('file', subCategoryImage)
        formData.append('type', 'image')
        formData.append('folder', 'categories')

        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erreur lors de l\'upload de l\'image')
        }

        const data = await response.json()
        imageUrl = data.url
      }

      if (subCategoryVideo) {
        const formData = new FormData()
        formData.append('file', subCategoryVideo)
        formData.append('type', 'video')
        formData.append('folder', 'categories')

        const response = await fetch('/api/upload/cloudinary', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erreur lors de l\'upload de la vidéo')
        }

        const data = await response.json()
        videoUrl = data.url
      }

      return { imageUrl, videoUrl }
    } catch (error: any) {
      console.error('Error uploading media:', error)
      toast.error(error.message || 'Erreur lors du téléchargement du média')
      return { imageUrl: null, videoUrl: null }
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Please fill in the title')
      return
    }

    // Upload media if new ones were selected
    let imageUrl: string | null = null
    let videoUrl: string | null = null
    
    if (subCategoryImage || subCategoryVideo) {
      const { imageUrl: uploadedImageUrl, videoUrl: uploadedVideoUrl } = await uploadMedia()
      if (subCategoryImage && !uploadedImageUrl) {
        toast.error('Erreur lors du téléchargement de l\'image')
        return
      }
      if (subCategoryVideo && !uploadedVideoUrl) {
        toast.error('Erreur lors du téléchargement de la vidéo')
        return
      }
      imageUrl = uploadedImageUrl
      videoUrl = uploadedVideoUrl
    } else if (mediaPreview) {
      // Keep existing media if no new media uploaded
      if (mediaType === 'image') {
        imageUrl = mediaPreview
      } else if (mediaType === 'video') {
        videoUrl = mediaPreview
      }
    }

    // Use uploaded media or form data URL
    const finalVideo = videoUrl || formData.video
    const finalImage = imageUrl || formData.image

    // For non-superAdmin, preserve existing video value
    const savedSubCategory: SubCategory = {
      ...subCategory,
      title: formData.title,
      subtitle: formData.subtitle || undefined,
      description: formData.description || undefined,
      video: finalVideo || subCategory.video || '',
      image: finalImage || undefined
    }

    onSave(savedSubCategory)
    toast.success('SubCategory saved successfully!')
  }

  return (
    <Card className="mb-2 ml-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Edit SubCategory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-sm">Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="SubCategory title"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-sm">Subtitle</Label>
          <Input
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            placeholder="SubCategory subtitle (optional)"
            className="text-sm"
          />
        </div>
        <div>
          <Label className="text-sm">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="SubCategory description (optional)"
            className="text-sm"
            rows={2}
          />
        </div>
        <div>
          <Label className="text-sm">Média de la Sous-Catégorie (Image ou Vidéo)</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-sm border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {mediaPreview ? (
                  mediaType === 'video' ? (
                    <video
                      src={mediaPreview}
                      className="w-full h-full object-cover"
                      controls
                      muted
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="file"
                    id="subCategoryImage"
                    accept="image/*"
                    onChange={handleImageInputChange}
                    className="hidden"
                  />
                  <input
                    type="file"
                    id="subCategoryVideo"
                    accept="video/*"
                    onChange={handleVideoInputChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('subCategoryImage')?.click()}
                    disabled={uploadingMedia}
                    className="text-xs"
                  >
                    <ImageIcon className="w-3 h-3 mr-1" />
                    {uploadingMedia ? 'Upload...' : 'Image'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCameraCapture}
                    disabled={uploadingMedia}
                    className="text-xs"
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    Caméra
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('subCategoryVideo')?.click()}
                    disabled={uploadingMedia}
                    className="text-xs"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    {uploadingMedia ? 'Upload...' : 'Vidéo'}
                  </Button>
                  {mediaPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeMedia}
                      disabled={uploadingMedia}
                      className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Images: JPG, PNG, WebP (max 10MB) | Vidéos: MP4, MOV, AVI (max 100MB)
                </p>
              </div>
            </div>
            <div>
              <Label className="text-sm">Ou Video URL (YouTube ou Cloudinary)</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.video}
                  onChange={(e) => setFormData({ ...formData, video: e.target.value })}
                  placeholder="https://youtube.com/shorts/VIDEO_ID ou https://res.cloudinary.com/..."
                  className="text-sm"
                />
                {formData.video && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, video: '' })}
                    title="Supprimer le lien"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={uploadingMedia}>
            {uploadingMedia ? (
              <>
                <ButtonLoadingSpinner />
                Uploading...
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-2" />
                Save
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} disabled={uploadingMedia}>
            <X className="w-3 h-3 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Service Form Component
interface ServiceFormProps {
  service: Service
  onSave: (service: Service) => void
  onCancel: () => void
  isSuperAdmin: boolean
}

function ServiceForm({ service, onSave, onCancel, isSuperAdmin }: ServiceFormProps) {
  const [formData, setFormData] = useState({
    title: service.title,
    description: service.description,
    image: service.image || '',
    fallbackVideo: service.fallbackVideo || '',
    price: service.price || '',
    duration: service.duration || '',
    tags: service.tags || [] as string[],
    tagInput: ''
  })

  const [heroMedia, setHeroMedia] = useState<MediaItem | undefined>(service.heroMedia)
  const [media, setMedia] = useState<MediaItem[]>(service.media || [])
  const [galleryMedia, setGalleryMedia] = useState<GalleryMediaItem[]>(service.galleryMedia || [])

  const addTag = () => {
    if (formData.tagInput.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()],
        tagInput: ''
      })
    }
  }

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    })
  }

  const addMediaItem = () => {
    setMedia([...media, { type: 'image', src: '', label: '' }])
  }

  const updateMediaItem = (index: number, field: keyof MediaItem, value: string) => {
    const newMedia = [...media]
    newMedia[index] = { ...newMedia[index], [field]: value }
    setMedia(newMedia)
  }

  const removeMediaItem = (index: number) => {
    setMedia(media.filter((_, i) => i !== index))
  }

  const addGalleryMediaItem = () => {
    setGalleryMedia([...galleryMedia, { type: 'image', src: '' }])
  }

  const updateGalleryMediaItem = (index: number, field: keyof GalleryMediaItem, value: string) => {
    const newGalleryMedia = [...galleryMedia]
    newGalleryMedia[index] = { ...newGalleryMedia[index], [field]: value as "image" | "video" }
    setGalleryMedia(newGalleryMedia)
  }

  const removeGalleryMediaItem = (index: number) => {
    setGalleryMedia(galleryMedia.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!formData.title || !formData.description) {
      toast.error('Please fill in title and description')
      return
    }

    const savedService: Service = {
      title: formData.title,
      description: formData.description,
      // Only superAdmin can modify image, fallbackVideo, and galleryMedia
      // For non-superAdmin, preserve existing values
      image: isSuperAdmin ? (formData.image || undefined) : service.image,
      fallbackVideo: isSuperAdmin ? (formData.fallbackVideo || undefined) : service.fallbackVideo,
      price: formData.price || undefined,
      duration: formData.duration || undefined,
      tags: formData.tags.length > 0 ? formData.tags : undefined,
      // Hero Media and Media array - Only superAdmin can modify
      heroMedia: isSuperAdmin ? (heroMedia?.src ? heroMedia : undefined) : service.heroMedia,
      media: isSuperAdmin 
        ? (media.filter(m => m.src).length > 0 ? media.filter(m => m.src) : undefined)
        : service.media,
      galleryMedia: isSuperAdmin 
        ? (galleryMedia.filter(m => m.src).length > 0 ? galleryMedia.filter(m => m.src) : undefined)
        : service.galleryMedia
    }

    onSave(savedService)
    toast.success('Service saved successfully!')
  }

  return (
    <Card className="mb-2 ml-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Edit Service</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label className="text-xs">Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Service title"
            className="text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Description *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Service description"
            className="text-xs"
            rows={2}
          />
        </div>
        {/* Image URL and Fallback Video - Only visible to superAdmin */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label className="text-xs">Image (Pinterest ou Cloudinary)</Label>
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="link" className="text-xs">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Lien
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs">
                    <ImageIcon className="w-3 h-3 mr-1" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      placeholder="https://pinterest.com/... ou https://res.cloudinary.com/..."
                      className="text-xs"
                    />
                    {formData.image && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        title="Supprimer le lien"
                        className="h-8"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-2">
                  <FileUpload
                    type="image"
                    onUploadComplete={(url) => setFormData({ ...formData, image: url })}
                    currentUrl={formData.image}
                    folder="menu/services/images"
                  />
                </TabsContent>
              </Tabs>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Fallback Video (YouTube ou Cloudinary)</Label>
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="link" className="text-xs">
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Lien
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="text-xs">
                    <Video className="w-3 h-3 mr-1" />
                    Upload
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="mt-2">
                  <div className="flex gap-2">
                    <Input
                      value={formData.fallbackVideo}
                      onChange={(e) => setFormData({ ...formData, fallbackVideo: e.target.value })}
                      placeholder="https://youtube.com/... ou https://res.cloudinary.com/..."
                      className="text-xs"
                    />
                    {formData.fallbackVideo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ ...formData, fallbackVideo: '' })}
                        title="Supprimer le lien"
                        className="h-8"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="upload" className="mt-2">
                  <FileUpload
                    type="video"
                    onUploadComplete={(url) => setFormData({ ...formData, fallbackVideo: url })}
                    currentUrl={formData.fallbackVideo}
                    folder="menu/services/videos"
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Price</Label>
            <Input
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g., 5 000 FCFA"
              className="text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Duration</Label>
            <Input
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="e.g., 40 minutes"
              className="text-xs"
            />
          </div>
        </div>

        {/* Hero Media - Only visible to superAdmin */}
        {isSuperAdmin && (
          <div>
            <Label className="text-xs">Hero Media (Optional)</Label>
            <div className="flex gap-2">
              <Select
                value={heroMedia?.type || 'image'}
                onValueChange={(value) => setHeroMedia({ type: value as "image" | "video", src: heroMedia?.src || '', label: heroMedia?.label || '' })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-1">
                <Input
                  value={heroMedia?.src || ''}
                  onChange={(e) => setHeroMedia({ ...heroMedia!, src: e.target.value, type: heroMedia?.type || 'image' })}
                  placeholder={heroMedia?.type === 'video' ? 'YouTube ou Cloudinary URL' : 'Pinterest ou Cloudinary URL'}
                  className="text-xs flex-1"
                />
                {heroMedia?.src && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHeroMedia({ ...heroMedia!, src: '', type: heroMedia?.type || 'image' })}
                    title="Supprimer le lien"
                    className="h-8"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <Input
                value={heroMedia?.label || ''}
                onChange={(e) => setHeroMedia({ ...heroMedia!, label: e.target.value })}
                placeholder="Label (optional)"
                className="text-xs flex-1"
              />
              <Button size="sm" variant="outline" onClick={() => setHeroMedia(undefined)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <Label className="text-xs">Tags</Label>
          <div className="flex gap-2 mb-2">
            <Input
              value={formData.tagInput}
              onChange={(e) => setFormData({ ...formData, tagInput: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag"
              className="text-xs"
            />
            <Button size="sm" onClick={addTag}>
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {formData.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
                <button onClick={() => removeTag(index)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Media Array - Only visible to superAdmin */}
        {isSuperAdmin && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Media Items</Label>
              <Button size="sm" variant="outline" onClick={addMediaItem}>
                <Plus className="w-3 h-3 mr-1" />
                Add
              </Button>
            </div>
            {media.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Select
                  value={item.type}
                  onValueChange={(value) => updateMediaItem(index, 'type', value)}
                >
                  <SelectTrigger className="text-xs w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2 flex-1">
                  <Input
                    value={item.src}
                    onChange={(e) => updateMediaItem(index, 'src', e.target.value)}
                    placeholder={item.type === 'video' ? 'YouTube ou Cloudinary URL' : 'Pinterest ou Cloudinary URL'}
                    className="text-xs flex-1"
                  />
                  {item.src && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateMediaItem(index, 'src', '')}
                      title="Supprimer le lien"
                      className="h-8"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Input
                  value={item.label || ''}
                  onChange={(e) => updateMediaItem(index, 'label', e.target.value)}
                  placeholder="Label (optional)"
                  className="text-xs flex-1"
                />
                <Button size="sm" variant="outline" onClick={() => removeMediaItem(index)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Gallery Media Array - Only visible to superAdmin */}
        {isSuperAdmin && (
          <div className="space-y-3">
            <Label className="text-xs">Gallery Media (Images et Vidéos)</Label>
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="link" className="text-xs">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  Liens
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Upload Multiple
                </TabsTrigger>
              </TabsList>
              <TabsContent value="link" className="mt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Ajouter un média</Label>
                    <Button size="sm" variant="outline" onClick={addGalleryMediaItem}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  {galleryMedia.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Select
                        value={item.type}
                        onValueChange={(value) => updateGalleryMediaItem(index, 'type', value)}
                      >
                        <SelectTrigger className="text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2 flex-1">
                        <Input
                          value={item.src}
                          onChange={(e) => updateGalleryMediaItem(index, 'src', e.target.value)}
                          placeholder={item.type === 'video' ? 'YouTube ou Cloudinary URL' : 'Pinterest ou Cloudinary URL'}
                          className="text-xs flex-1"
                        />
                        {item.src && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateGalleryMediaItem(index, 'src', '')}
                            title="Supprimer le lien"
                            className="h-8"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeGalleryMediaItem(index)}
                        title="Supprimer l'élément"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="upload" className="mt-2">
                <MixedFileUpload
                  onUploadComplete={(items: Array<{ type: 'image' | 'video', src: string }>) => {
                    setGalleryMedia(items)
                  }}
                  currentItems={galleryMedia}
                  folder="menu/services/gallery"
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3 h-3 mr-2" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            <X className="w-3 h-3 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

