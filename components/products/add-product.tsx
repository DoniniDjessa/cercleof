"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, RefreshCw, X, Image as ImageIcon } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { generateSKU, generateBarcode } from "@/lib/code-generators"
import toast from "react-hot-toast"

interface AddProductProps {
  onProductCreated?: () => void
}

export function AddProduct({ onProductCreated }: AddProductProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    brand: "",
    price: "",
    cost: "",
    stock: "",
    sku: "",
    barcode: "",
    status: "active",
    show_on_website: false
  })
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null)
  const [images, setImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  // Auto-generate SKU and barcode when category or product name changes
  useEffect(() => {
    if (formData.name && selectedCategory) {
      const newSKU = generateSKU(selectedCategory.name, formData.name)
      const newBarcode = generateBarcode()
      
      setFormData(prev => ({
        ...prev,
        sku: newSKU,
        barcode: newBarcode
      }))
    }
  }, [formData.name, selectedCategory])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-categories')
        .select('id, name')
        .eq('type', 'product')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Update selected category when category changes
    if (name === 'category') {
      const category = categories.find(cat => cat.id === value)
      setSelectedCategory(category || null)
    }
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast.error('Veuillez sélectionner des fichiers image valides')
      return
    }

    // Limit to 5 images maximum
    if (images.length + imageFiles.length > 5) {
      toast.error('Vous ne pouvez pas ajouter plus de 5 images')
      return
    }

    setImages(prev => [...prev, ...imageFiles])
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls: string[] = []

    try {
      for (let i = 0; i < images.length; i++) {
        const file = images[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `products/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('cb-bucket')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('cb-bucket')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      throw error
    } finally {
      setUploadingImages(false)
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
        toast.error('Error fetching user information')
        return
      }

      // Upload images first
      let imageUrls: string[] = []
      if (images.length > 0) {
        try {
          imageUrls = await uploadImages()
        } catch (error) {
          console.error('Error uploading images:', error)
          toast.error('Erreur lors du téléchargement des images')
          return
        }
      }

      // Prepare product data for insertion
      const productData = {
        name: formData.name,
        description: formData.description || null,
        category_id: formData.category || null,
        brand: formData.brand || null,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        stock_quantity: parseInt(formData.stock) || 0,
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        status: formData.status,
        show_to_website: formData.show_on_website,
        images: imageUrls,
        is_active: true,
        created_by: currentUser.id
      }

      // Insert product into dd-products table
      const { data, error } = await supabase
        .from('dd-products')
        .insert([productData])
        .select()

      if (error) {
        console.error('Error creating product:', error)
        toast.error('Erreur lors de la création du produit: ' + error.message)
        return
      }

      toast.success("Produit créé avec succès!")
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "",
        brand: "",
        price: "",
        cost: "",
        stock: "",
        sku: "",
        barcode: "",
        status: "active",
        show_on_website: false
      })
      setImages([])

      // Call the callback to refresh the products list
      if (onProductCreated) {
        onProductCreated()
      }
      
    } catch (error) {
      console.error("Error creating product:", error)
      toast.error("Erreur lors de la création du produit. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white">Ajouter un Produit</h1>
        <p className="text-sm text-muted-foreground dark:text-gray-400">Créer un nouveau produit dans votre inventaire</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Informations du Produit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nom du Produit *</Label>
                  <Input 
                    id="name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Entrez le nom du produit" 
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
                    placeholder="Entrez la description du produit" 
                    rows={4}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">Catégorie</Label>
                    <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                      <SelectTrigger id="category" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-gray-700 dark:text-gray-300">Marque</Label>
                    <Input 
                      id="brand" 
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      placeholder="Entrez le nom de la marque"
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Prix et Inventaire</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-gray-700 dark:text-gray-300">Prix *</Label>
                    <Input 
                      id="price" 
                      name="price"
                      type="number" 
                      step="0.01"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00" 
                      required
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-gray-700 dark:text-gray-300">Coût *</Label>
                    <Input 
                      id="cost" 
                      name="cost"
                      type="number" 
                      step="0.01"
                      value={formData.cost}
                      onChange={handleChange}
                      placeholder="0.00" 
                      required
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-gray-700 dark:text-gray-300">Quantité en Stock *</Label>
                    <Input 
                      id="stock" 
                      name="stock"
                      type="number" 
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder="0" 
                      required
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sku" className="text-gray-700 dark:text-gray-300">SKU</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="sku" 
                        name="sku"
                        value={formData.sku}
                        onChange={handleChange}
                        placeholder="SKU généré automatiquement"
                        className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedCategory) {
                            const newSKU = generateSKU(selectedCategory.name, formData.name)
                            setFormData(prev => ({ ...prev, sku: newSKU }))
                          }
                        }}
                        className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode" className="text-gray-700 dark:text-gray-300">Code-barres</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="barcode" 
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        placeholder="Code-barres généré automatiquement"
                        className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newBarcode = generateBarcode()
                          setFormData(prev => ({ ...prev, barcode: newBarcode }))
                        }}
                        className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Images du Produit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Image Upload Area */}
                  <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground dark:text-gray-400" />
                      <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
                        {images.length > 0 ? `${images.length} image(s) sélectionnée(s)` : 'Télécharger les images du produit'}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        Maximum 5 images (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                  
                  {/* File Input */}
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? <ButtonLoadingSpinner /> : 'Choisir des Fichiers'}
                  </Button>

                  {/* Image Preview */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Images sélectionnées:</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeImage(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {image.name.length > 15 ? `${image.name.substring(0, 15)}...` : image.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Statut et Paramètres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-gray-700 dark:text-gray-300">Statut du Produit</Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                    <SelectTrigger id="status" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="show_on_website" 
                      checked={formData.show_on_website}
                      onCheckedChange={(checked) => handleCheckboxChange('show_on_website', checked as boolean)}
                      className="border-gray-300 dark:border-gray-600"
                    />
                    <Label htmlFor="show_on_website" className="text-gray-700 dark:text-gray-300">
                      Afficher sur le site web
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    Cochez cette case pour afficher ce produit sur votre site web public
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            onClick={() => window.history.replaceState({}, '', '/admin/products')}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={loading || uploadingImages}>
            {loading || uploadingImages ? <ButtonLoadingSpinner /> : 'Créer le Produit'}
          </Button>
        </div>
      </form>
    </div>
  )
}
