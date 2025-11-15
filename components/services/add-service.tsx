"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AnimatedCard } from "@/components/ui/animated-card"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { X, Image as ImageIcon, Plus, Trash2, Camera } from "lucide-react"
import { compressImage } from "@/lib/image-utils"
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
  price: number
  sku?: string
  barcode?: string
  variants?: ProductVariant[]
}

interface ServiceProduct {
  product_id: string
  quantity: number
}

interface AddServiceProps {
  onServiceCreated?: () => void
}

export function AddService({ onServiceCreated }: AddServiceProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [serviceImage, setServiceImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<ServiceProduct[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [checkingRole, setCheckingRole] = useState(true)
  
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
    category_id: "",
    prix_base: 0,
    duree: 60,
    employe_type: "",
    commission_employe: 0,
    actif: true,
    tags: [] as string[],
    tagInput: "",
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchCurrentUserRole()
  }, [])

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

  // Check if user can manage services (admin, manager, superadmin)
  const canManageServices = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchCategories = async () => {
    try {
      // Fetch all service categories (both parent and subcategories)
      const { data, error } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', 'service')
        .eq('is_active', true)
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }
  
  // Helper function to format category name for display
  const getCategoryDisplayName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId)
    if (!category) return ''
    
    if (category.parent_id) {
      const parent = categories.find(c => c.id === category.parent_id)
      return parent ? `${parent.name} > ${category.name}` : category.name
    }
    return category.name
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-products')
        .select('id, name, sku, price, stock_quantity')
        .eq('is_active', true)
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleImageUpload = async (file: File | null, compress: boolean = true) => {
    if (!file) return
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide')
      return
    }
    
    try {
      // Compress image before setting it
      const processedFile = compress 
        ? await compressImage(file, { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 })
        : file
      
      setServiceImage(processedFile)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(processedFile)
      
      toast.success(`Image ajoutée${compress ? ' (compressée)' : ''}`)
    } catch (error) {
      console.error('Error processing image:', error)
      toast.error('Erreur lors du traitement de l\'image')
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    await handleImageUpload(file, true)
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
      await handleImageUpload(target.files?.[0] || null, true)
    }
    input.click()
  }

  const removeImage = () => {
    setServiceImage(null)
    setImagePreview(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!serviceImage) return null

    try {
      setUploadingImage(true)
      
      const fileExt = serviceImage.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `services/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('cb-bucket')
        .upload(filePath, serviceImage)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        toast.error('Erreur lors du téléchargement de l\'image')
        return null
      }

      const { data } = supabase.storage
        .from('cb-bucket')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Erreur lors du téléchargement de l\'image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const addTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ""
      }))
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addProduct = () => {
    setSelectedProducts(prev => [...prev, { product_id: "", quantity: 1 }])
  }

  const removeProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index))
  }

  const updateProduct = (index: number, field: keyof ServiceProduct, value: string | number) => {
    setSelectedProducts(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
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

      let serviceImageUrl = null
      if (serviceImage) {
        serviceImageUrl = await uploadImage()
        if (!serviceImageUrl) {
          toast.error('Erreur lors du téléchargement de l\'image')
          return
        }
      }

      // Use English column names as per actual database schema (dd-categories-unified.sql)
      const serviceData: Record<string, unknown> = {
        name: formData.nom,  // nom -> name
        description: formData.description || null,
        category_id: formData.category_id || null,
        price: parseFloat(formData.prix_base.toString()),  // prix_base -> price
        duration_minutes: parseInt(formData.duree.toString()),  // duree -> duration_minutes
        // employe_type column doesn't exist in actual database - removed
        // commission_employe column doesn't exist in actual database - removed
        active: formData.actif,
        // popularite column doesn't exist - removed
        tags: formData.tags || [],
        // photo column doesn't exist, use images JSONB instead if needed
        images: serviceImageUrl ? [serviceImageUrl] : [],
        created_by: currentUser.id
      }
      
      // Remove null values for optional fields to avoid insertion issues
      Object.keys(serviceData).forEach(key => {
        if (serviceData[key] === null) {
          delete serviceData[key]
        }
      })

      const { data: service, error: serviceError } = await supabase
        .from('dd-services')
        .insert([serviceData])
        .select()
        .single()

      if (serviceError) {
        console.error('Error creating service:', serviceError)
        toast.error('Erreur lors de la création du service: ' + serviceError.message)
        return
      }

      // Add service products if any
      if (selectedProducts.length > 0) {
        const serviceProducts = selectedProducts
          .filter(sp => sp.product_id && sp.quantity > 0)
          .map(sp => ({
            service_id: service.id,
            product_id: sp.product_id,
            quantite: parseFloat(sp.quantity.toString())
          }))

        if (serviceProducts.length > 0) {
          const { error: productsError } = await supabase
            .from('dd-services-produits')
            .insert(serviceProducts)

          if (productsError) {
            console.error('Error adding service products:', productsError)
            if (productsError.code === '42501') {
              toast.error('Service créé mais erreur RLS lors de l\'ajout des produits. Vérifiez les politiques RLS pour dd-services-produits.', { duration: 5000 })
            } else {
              toast.error('Service créé mais erreur lors de l\'ajout des produits: ' + productsError.message)
            }
          }
        }
      }

      toast.success("Service créé avec succès!")
      
      // Reset form
      setFormData({
        nom: "",
        description: "",
        category_id: "",
        prix_base: 0,
        duree: 60,
        employe_type: "",
        commission_employe: 0,
        actif: true,
        tags: [],
        tagInput: "",
      })
      
      setSelectedProducts([])
      setServiceImage(null)
      setImagePreview(null)

      if (onServiceCreated) {
        onServiceCreated()
      }
      
    } catch (error) {
      console.error("Error creating service:", error)
      toast.error("Erreur lors de la création du service. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    window.history.replaceState({}, '', '/admin/services')
    window.location.reload()
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

  if (!canManageServices) {
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
                Vous n&apos;avez pas les permissions nécessaires pour ajouter des services.
                Seuls les administrateurs et les managers peuvent créer des services.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Ajouter un Service</h1>
        <p className="text-muted-foreground dark:text-gray-400">Créer un nouveau service avec tous les détails nécessaires.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Image */}
          <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Image du Service</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-sm border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="serviceImage"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('serviceImage')?.click()}
                      className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                      disabled={uploadingImage}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingImage ? <ButtonLoadingSpinner /> : serviceImage ? 'Changer' : 'Galerie'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCameraCapture}
                      className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                      disabled={uploadingImage}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Caméra
                    </Button>
                    {serviceImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeImage}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formats acceptés: JPG, PNG, WebP (compressé automatiquement)
                  </p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Service Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Informations du Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-gray-700 dark:text-gray-300">Nom du Service *</Label>
                <Input
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Entrez le nom du service"
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
                  placeholder="Décrivez le service..."
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id" className="text-gray-700 dark:text-gray-300">Catégorie</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => handleSelectChange('category_id', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => {
                        const displayName = category.parent_id
                          ? `${categories.find(c => c.id === category.parent_id)?.name || ''} > ${category.name}`
                          : category.name
                        return (
                          <SelectItem key={category.id} value={category.id}>
                            {displayName}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employe_type" className="text-gray-700 dark:text-gray-300">Type d&apos;Employé</Label>
                  <Select
                    value={formData.employe_type}
                    onValueChange={(value) => handleSelectChange('employe_type', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="esthéticienne">Esthéticienne</SelectItem>
                      <SelectItem value="coiffeuse">Coiffeuse</SelectItem>
                      <SelectItem value="manucure">Manucure</SelectItem>
                      <SelectItem value="massage">Massage</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Pricing & Duration */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Tarification et Durée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prix_base" className="text-gray-700 dark:text-gray-300">Prix de Base (f) *</Label>
                  <Input
                    id="prix_base"
                    name="prix_base"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.prix_base}
                    onChange={handleChange}
                    placeholder="0.00"
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duree" className="text-gray-700 dark:text-gray-300">Durée (minutes) *</Label>
                  <Input
                    id="duree"
                    name="duree"
                    type="number"
                    min="1"
                    value={formData.duree}
                    onChange={handleChange}
                    placeholder="60"
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_employe" className="text-gray-700 dark:text-gray-300">Commission Employé (%)</Label>
                  <Input
                    id="commission_employe"
                    name="commission_employe"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.commission_employe}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Tags */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={formData.tagInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                  placeholder="Ajouter un tag..."
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </AnimatedCard>

          {/* Products Used */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.5}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Produits Utilisés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button type="button" onClick={addProduct} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un Produit
              </Button>
              
              {selectedProducts.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-gray-700 dark:text-gray-300">Produit</Label>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => updateProduct(index, 'product_id', value)}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionnez un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {product.price}f
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24">
                    <Label className="text-gray-700 dark:text-gray-300">Quantité</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateProduct(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeProduct(index)}
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </AnimatedCard>

          {/* Status */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.6}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="actif"
                  checked={formData.actif}
                  onCheckedChange={(checked) => handleCheckboxChange('actif', checked as boolean)}
                />
                <Label htmlFor="actif" className="text-gray-700 dark:text-gray-300">
                  Service actif
                </Label>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.7}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé du Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Nom</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.nom || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Prix</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.prix_base}f</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Durée</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.duree} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Commission</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.commission_employe}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Produits</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedProducts.length} produit(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Tags</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.tags.length} tag(s)</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Statut</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.actif ? 'Actif' : 'Inactif'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || uploadingImage}
                >
                  {loading || uploadingImage ? <ButtonLoadingSpinner /> : "Créer le Service"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </form>
    </div>
  )
}
