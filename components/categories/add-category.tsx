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
import { X, Image as ImageIcon, Camera, Video } from "lucide-react"
import toast from "react-hot-toast"
import { compressImage } from "@/lib/image-utils"

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
  const [categoryImage, setCategoryImage] = useState<File | null>(null)
  const [categoryVideo, setCategoryVideo] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null) // Track if current media is image or video
  const [uploadingMedia, setUploadingMedia] = useState(false)
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
        setCategoryImage(processedFile)
        setCategoryVideo(null)
      } else {
        setCategoryVideo(processedFile)
        setCategoryImage(null)
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
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const handleVideoInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    await handleMediaUpload(file, 'video', false)
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const handleCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      await handleMediaUpload(target.files?.[0] || null, 'image', true)
    }
    input.click()
  }

  const removeMedia = () => {
    setCategoryImage(null)
    setCategoryVideo(null)
    setMediaPreview(null)
    setMediaType(null)
  }

  const uploadMedia = async (): Promise<{ imageUrl: string | null, videoUrl: string | null }> => {
    let imageUrl: string | null = null
    let videoUrl: string | null = null

    try {
      setUploadingMedia(true)
      
      if (categoryImage) {
        const formData = new FormData()
        formData.append('file', categoryImage)
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

      if (categoryVideo) {
        const formData = new FormData()
        formData.append('file', categoryVideo)
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
        // Load existing image or video if available
        if (data.image) {
          setMediaPreview(data.image)
          setMediaType('image')
        } else if (data.video) {
          setMediaPreview(data.video)
          setMediaType('video')
        }
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

      // Upload media if new ones were selected
      let categoryImageUrl = null
      let categoryVideoUrl = null
      
      if (categoryImage || categoryVideo) {
        const { imageUrl, videoUrl } = await uploadMedia()
        if (categoryImage && !imageUrl) {
          toast.error('Erreur lors du téléchargement de l\'image')
          setLoading(false)
          return
        }
        if (categoryVideo && !videoUrl) {
          toast.error('Erreur lors du téléchargement de la vidéo')
          setLoading(false)
          return
        }
        categoryImageUrl = imageUrl
        categoryVideoUrl = videoUrl
      } else if (isEditMode && mediaPreview) {
        // Keep existing media if no new media uploaded
        if (mediaType === 'image') {
          categoryImageUrl = mediaPreview
        } else if (mediaType === 'video') {
          categoryVideoUrl = mediaPreview
        }
      }

      // Prepare category data
      const categoryData: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type,
        parent_id: formData.parent_id || null,
        image: categoryImageUrl || null,
        video: categoryVideoUrl || null,
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
      setCategoryImage(null)
      setCategoryVideo(null)
      setMediaPreview(null)
      setMediaType(null)
      
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
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Média de la Catégorie (Image ou Vidéo)</Label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-sm border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
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
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="file"
                      id="categoryImage"
                      accept="image/*"
                      onChange={handleImageInputChange}
                      className="hidden"
                    />
                    <input
                      type="file"
                      id="categoryVideo"
                      accept="video/*"
                      onChange={handleVideoInputChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('categoryImage')?.click()}
                      disabled={uploadingMedia}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingMedia ? 'Upload...' : 'Choisir une image'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCameraCapture}
                      disabled={uploadingMedia}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Caméra
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('categoryVideo')?.click()}
                      disabled={uploadingMedia}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      {uploadingMedia ? 'Upload...' : 'Choisir une vidéo'}
                    </Button>
                    {mediaPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeMedia}
                        disabled={uploadingMedia}
                        className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Images: JPG, PNG, WebP (max 10MB) | Vidéos: MP4, MOV, AVI (max 100MB)
                  </p>
                </div>
              </div>
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
          <Button type="submit" disabled={loading || fetching || uploadingMedia}>
            {loading || uploadingMedia ? <ButtonLoadingSpinner /> : isEditMode ? 'Mettre à jour la Catégorie' : 'Créer la Catégorie'}
          </Button>
        </div>
      </form>
      )}
    </div>
  )
}
