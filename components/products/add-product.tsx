"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, RefreshCw, X, Image as ImageIcon, Camera, Plus, Trash2, ChevronsUpDown, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { generateSKU, generateBarcode } from "@/lib/code-generators"
import { compressImages } from "@/lib/image-utils"
import toast from "react-hot-toast"
import Cropper, { Area } from "react-easy-crop"
import { CATEGORY_CASCADE } from "@/data/category-cascade"

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Impossible de lire le fichier sélectionné"))
    reader.readAsDataURL(file)
  })
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Impossible de charger l'image"))
    image.src = url
  })
}

async function cropImageFile(file: File, previewUrl: string, cropArea: Area): Promise<File> {
  const image = await createImage(previewUrl)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Impossible de préparer le canvas pour le recadrage")
  }

  canvas.width = cropArea.width
  canvas.height = cropArea.height

  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height
  )

  const mimeType = file.type || "image/jpeg"

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Échec de la génération de l'image recadrée"))
        return
      }

      const croppedFile = new File([blob], file.name, { type: mimeType })
      resolve(croppedFile)
    }, mimeType)
  })
}

interface AddProductProps {
  onProductCreated?: () => void
}

export function AddProduct({ onProductCreated }: AddProductProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [checkingRole, setCheckingRole] = useState(true)
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
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false)
  const [barcodeManuallyEdited, setBarcodeManuallyEdited] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [variants, setVariants] = useState<Array<{ id: string; name: string; sku: string; quantity: string }>>([])
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null)
  const [currentCropPreview, setCurrentCropPreview] = useState<string>("")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const cascadeDomains = useMemo(() => Object.keys(CATEGORY_CASCADE), [])
const SKIN_TYPES = [
  "Peau normale",
  "Peau sèche",
  "Peau grasse",
  "Peau mixte",
  "Peau sensible",
  "Peau mature",
  "Peau déshydratée",
  "Peau sujette à l'acné",
  "Peau hyperpigmentée"
]
  const [selectedDomain, setSelectedDomain] = useState<string>(() => cascadeDomains[0] ?? "")
  const [selectedTranches, setSelectedTranches] = useState<string[]>([])
  const [selectedFormes, setSelectedFormes] = useState<string[]>([])
  const [selectedBenefices, setSelectedBenefices] = useState<string[]>([])
  const [selectedSkinTypes, setSelectedSkinTypes] = useState<string[]>([])
  const [tranchePopoverOpen, setTranchePopoverOpen] = useState(false)
  const [formePopoverOpen, setFormePopoverOpen] = useState(false)
  const [beneficesPopoverOpen, setBeneficesPopoverOpen] = useState(false)
  const [skinTypePopoverOpen, setSkinTypePopoverOpen] = useState(false)
  const availableTranches = useMemo(
    () => CATEGORY_CASCADE[selectedDomain] ?? [],
    [selectedDomain]
  )
  const selectedTrancheNodes = useMemo(
    () => availableTranches.filter(item => selectedTranches.includes(item.tranche_principale)),
    [availableTranches, selectedTranches]
  )
  const availableFormes = useMemo(() => {
    if (selectedTrancheNodes.length === 0) return []
    const formes = new Set<string>()
    selectedTrancheNodes.forEach(node => {
      node.sous_tranches.formes.forEach(forme => formes.add(forme))
    })
    return Array.from(formes)
  }, [selectedTrancheNodes])
  const availableBenefices = useMemo(() => {
    if (selectedTrancheNodes.length === 0) return []
    const benefices = new Set<string>()
    selectedTrancheNodes.forEach(node => {
      node.sous_tranches.benefices.forEach(benefice => benefices.add(benefice))
    })
    return Array.from(benefices)
  }, [selectedTrancheNodes])
  const primaryTranche = selectedTranches[0] ?? ""
  const primaryForme = selectedFormes[0] ?? ""
  const primaryBenefice = selectedBenefices[0] ?? ""

  useEffect(() => {
    setSelectedFormes(prev => {
      const filtered = prev.filter(forme => availableFormes.includes(forme))
      if (filtered.length === prev.length && filtered.every((value, index) => value === prev[index])) {
        return prev
      }
      return filtered
    })
  }, [availableFormes])
  useEffect(() => {
    setSelectedBenefices(prev => {
      const filtered = prev.filter(benefice => availableBenefices.includes(benefice))
      if (filtered.length === prev.length && filtered.every((value, index) => value === prev[index])) {
        return prev
      }
      return filtered
    })
  }, [availableBenefices])
  useEffect(() => {
    setTranchePopoverOpen(false)
  }, [selectedDomain])
  useEffect(() => {
    setFormePopoverOpen(false)
  }, [selectedTranches])
  useEffect(() => {
    setBeneficesPopoverOpen(false)
  }, [selectedDomain, selectedTranches, selectedFormes])
  useEffect(() => {
    setSkinTypePopoverOpen(false)
  }, [selectedSkinTypes])

  const handleToggleTranche = useCallback((tranche: string) => {
    setSelectedTranches(prev => {
      if (prev.includes(tranche)) {
        return prev.filter(item => item !== tranche)
      }
      if (prev.length >= 2) {
        toast.error("Vous pouvez sélectionner au maximum deux tranches.")
        return prev
      }
      return [...prev, tranche]
    })
  }, [])

  const handleToggleForme = useCallback((forme: string) => {
    setSelectedFormes(prev => {
      if (prev.includes(forme)) {
        return prev.filter(item => item !== forme)
      }
      if (prev.length >= 2) {
        toast.error("Vous pouvez sélectionner au maximum deux formes.")
        return prev
      }
      return [...prev, forme]
    })
  }, [])

  const handleToggleBenefice = useCallback((benefice: string) => {
    setSelectedBenefices(prev => {
      if (prev.includes(benefice)) {
        return prev.filter(item => item !== benefice)
      }
      return [...prev, benefice]
    })
  }, [])

  const handleToggleSkinType = useCallback((skinType: string) => {
    setSelectedSkinTypes(prev => {
      if (prev.includes(skinType)) {
        return prev.filter(item => item !== skinType)
      }
      return [...prev, skinType]
    })
  }, [])
  const formattedDomain = useMemo(() => {
    if (!selectedDomain) return ""
    if (selectedDomain === selectedDomain.toUpperCase()) return selectedDomain
    return selectedDomain.charAt(0).toUpperCase() + selectedDomain.slice(1)
  }, [selectedDomain])
  const trancheSummary = useMemo(() => {
    if (selectedTranches.length === 0) return "Sélectionner des tranches"
    if (selectedTranches.length === 1) return selectedTranches[0]
    return `${selectedTranches[0]}, ${selectedTranches[1]}`
  }, [selectedTranches])

  const formeSummary = useMemo(() => {
    if (selectedFormes.length === 0) return "Sélectionner des formes"
    if (selectedFormes.length === 1) return selectedFormes[0]
    return `${selectedFormes[0]}, ${selectedFormes[1]}`
  }, [selectedFormes])

  const cascadeCategoryName = useMemo(() => {
    if (!formattedDomain && !primaryTranche && !primaryForme && !primaryBenefice) return ""
    return [formattedDomain, primaryTranche, primaryForme, primaryBenefice].filter(Boolean).join(" • ")
  }, [formattedDomain, primaryTranche, primaryForme, primaryBenefice])
  const skinTypeSummary = useMemo(() => {
    if (selectedSkinTypes.length === 0) return "Sélectionner des types de peau (optionnel)"
    if (selectedSkinTypes.length <= 2) return selectedSkinTypes.join(", ")
    return `${selectedSkinTypes[0]}, ${selectedSkinTypes[1]} +${selectedSkinTypes.length - 2}`
  }, [selectedSkinTypes])
  const matchingCategory = useMemo(() => {
    if (!cascadeCategoryName) return null
    return categories.find(cat => cat.name === cascadeCategoryName) ?? null
  }, [categories, cascadeCategoryName])

  const skuCategoryName = useMemo(() => {
    if (matchingCategory?.name) return matchingCategory.name
    if (cascadeCategoryName) return cascadeCategoryName
    if (selectedTranches.length > 0) return selectedTranches[0]
    if (selectedDomain) return selectedDomain
    return "Produit"
  }, [matchingCategory, cascadeCategoryName, selectedTranches, selectedDomain])

  const cascadeDescription = useMemo(() => {
    if (selectedTranches.length === 0) return ""
    return [
      `Domaine: ${formattedDomain || "—"}`,
      `Tranches principales: ${selectedTranches.join(", ")}`,
      `Formes: ${selectedFormes.length > 0 ? selectedFormes.join(", ") : "—"}`,
      `Bénéfices: ${selectedBenefices.length > 0 ? selectedBenefices.join(", ") : "—"}`,
      `Types de peau: ${selectedSkinTypes.length > 0 ? selectedSkinTypes.join(", ") : "—"}`
    ].join(" | ")
  }, [formattedDomain, selectedTranches, selectedFormes, selectedBenefices, selectedSkinTypes])
  const cascadeTags = useMemo(() => {
    const skinTypeTags = selectedSkinTypes.map(type => `Peau:${type}`)
    const tags = [selectedDomain, ...selectedTranches, ...selectedFormes, ...selectedBenefices, ...skinTypeTags].filter(Boolean) as string[]
    return Array.from(new Set(tags))
  }, [selectedDomain, selectedTranches, selectedFormes, selectedBenefices, selectedSkinTypes])
  const beneficeSummary = useMemo(() => {
    if (selectedBenefices.length === 0) return "Sélectionner des bénéfices"
    if (selectedBenefices.length <= 2) return selectedBenefices.join(", ")
    const [first, second] = selectedBenefices
    return `${first}, ${second} +${selectedBenefices.length - 2}`
  }, [selectedBenefices])

  const startCroppingFile = useCallback(async (file: File) => {
    try {
      const preview = await readFileAsDataURL(file)
      setCurrentCropFile(file)
      setCurrentCropPreview(preview)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setIsCropModalOpen(true)
    } catch (error) {
      console.error('Error preparing image for crop:', error)
      toast.error("Erreur lors de la préparation de l'image pour recadrage")
      setCropQueue(prev => prev.filter(item => item !== file))
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchCurrentUserRole()
  }, [])

  useEffect(() => {
    if (matchingCategory) {
      setFormData(prev => {
        if (prev.category === matchingCategory.id) {
          return prev
        }
        return { ...prev, category: matchingCategory.id }
      })
      setSelectedCategory({ id: matchingCategory.id, name: matchingCategory.name })
      setSkuManuallyEdited(false)
      setBarcodeManuallyEdited(false)
    }
  }, [matchingCategory])

  useEffect(() => {
    if (!isCropModalOpen && cropQueue.length > 0) {
      const nextFile = cropQueue[0]
      startCroppingFile(nextFile)
    }
  }, [cropQueue, isCropModalOpen, startCroppingFile])

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

  // Check if user can manage products (admin, manager, superadmin)
  const canManageProducts = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  // Auto-generate SKU and barcode when category or product name changes
  useEffect(() => {
    if (formData.name && skuCategoryName && !skuManuallyEdited) {
      const newSKU = generateSKU(skuCategoryName, formData.name)
      setFormData(prev => ({
        ...prev,
        sku: newSKU
      }))
    }
  }, [formData.name, skuCategoryName, skuManuallyEdited])

  useEffect(() => {
    if (formData.name && !barcodeManuallyEdited) {
      const newBarcode = generateBarcode()
      setFormData(prev => ({
        ...prev,
        barcode: newBarcode
      }))
    }
  }, [formData.name, barcodeManuallyEdited])

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

    if (name === "sku") {
      setSkuManuallyEdited(true)
    } else if (name === "barcode") {
      setBarcodeManuallyEdited(true)
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const addVariantRow = () => {
    setVariants(prev => ([
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        name: '',
        sku: '',
        quantity: ''
      }
    ]))
  }

  const updateVariantField = (variantId: string, field: 'name' | 'sku' | 'quantity', value: string) => {
    setVariants(prev => prev.map(variant => (
      variant.id === variantId ? { ...variant, [field]: value } : variant
    )))
  }

  const removeVariantRow = (variantId: string) => {
    setVariants(prev => prev.filter(variant => variant.id !== variantId))
  }

  const handleImageUpload = (files: FileList | null) => {
    if (!files) return
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      toast.error('Veuillez sélectionner des fichiers image valides')
      return
    }

    // Limit to 5 images maximum (including files en file d'attente)
    if (images.length + cropQueue.length + imageFiles.length > 5) {
      toast.error('Vous ne pouvez pas ajouter plus de 5 images')
      return
    }

    setCropQueue(prev => [...prev, ...imageFiles])
    toast.success(`${imageFiles.length} image(s) ajoutée(s) pour recadrage`)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e.target.files)
    // Reset input to allow selecting same file again
    e.target.value = ''
  }

  const handleCameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      handleImageUpload(target.files)
    }
    input.click()
  }

  const finishCropStep = () => {
    setCropQueue(prev => prev.slice(1))
    setIsCropModalOpen(false)
    setCurrentCropFile(null)
    setCurrentCropPreview("")
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setProcessingCrop(false)
  }

  const handleCropCancel = () => {
    finishCropStep()
  }

  const handleUseOriginalImage = async () => {
    if (!currentCropFile) return
    try {
      setProcessingCrop(true)
      const [compressedFile] = await compressImages(
        [currentCropFile],
        { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 }
      )
      setImages(prev => [...prev, compressedFile])
      toast.success('Image ajoutée sans recadrage')
      finishCropStep()
    } catch (error) {
      console.error('Error keeping original image:', error)
      toast.error('Erreur lors de l\'ajout de l\'image originale')
      setProcessingCrop(false)
    }
  }

  const handleCropConfirm = async () => {
    if (!currentCropFile || !currentCropPreview || !croppedAreaPixels) {
      toast.error('Veuillez sélectionner une zone à recadrer')
      return
    }

    try {
      setProcessingCrop(true)
      const croppedFile = await cropImageFile(currentCropFile, currentCropPreview, croppedAreaPixels)
      const [compressedFile] = await compressImages(
        [croppedFile],
        { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 }
      )
      setImages(prev => [...prev, compressedFile])
      toast.success('Image recadrée ajoutée')
      finishCropStep()
    } catch (error) {
      console.error('Error cropping image:', error)
      toast.error('Erreur lors du recadrage de l\'image')
      setProcessingCrop(false)
    }
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
      const stockNumber = parseInt(formData.stock || '0', 10)
      if (isNaN(stockNumber) || stockNumber < 0) {
        toast.error('Veuillez entrer un stock valide (0 ou plus).')
        setLoading(false)
        return
      }

      const variantValues = variants.map(variant => ({
        ...variant,
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        quantityNumber: parseInt(variant.quantity || '0', 10)
      }))

      for (const variant of variantValues) {
        if (!variant.name) {
          toast.error('Le nom de chaque variante est obligatoire.')
          setLoading(false)
          return
        }
        if (isNaN(variant.quantityNumber) || variant.quantityNumber < 0) {
          toast.error(`Quantité invalide pour la variante "${variant.name}".`)
          setLoading(false)
          return
        }
      }

      const totalVariantQuantity = variantValues.reduce((sum, variant) => sum + variant.quantityNumber, 0)
      if (totalVariantQuantity > stockNumber) {
        toast.error('La somme des quantités des variantes ne peut pas dépasser le stock total.')
        setLoading(false)
        return
      }

      if (!selectedDomain || selectedTranches.length === 0 || selectedFormes.length === 0 || selectedBenefices.length === 0) {
        toast.error('Veuillez compléter la classification (domaine, tranches, formes et bénéfices).')
        setLoading(false)
        return
      }

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

      let categoryToUse = matchingCategory

      if (!categoryToUse) {
        const { data: createdCategory, error: createCategoryError } = await supabase
          .from('dd-categories')
          .insert({
            name: cascadeCategoryName,
            type: 'product',
            is_active: true,
            created_by: currentUser.id
          })
          .select('id, name')
          .single()

        if (createCategoryError) {
          console.error('Error creating missing category:', createCategoryError)
          toast.error('Impossible de créer automatiquement la catégorie correspondante.')
          setLoading(false)
          return
        }

        if (createdCategory) {
          categoryToUse = createdCategory
          setCategories(prev => [...prev, createdCategory])
          setSelectedCategory({ id: createdCategory.id, name: createdCategory.name })
          setFormData(prev => ({ ...prev, category: createdCategory.id }))
          setSkuManuallyEdited(false)
          setBarcodeManuallyEdited(false)
        }
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
        category_id: categoryToUse?.id || formData.category || null,
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
        created_by: currentUser.id,
        tags: cascadeTags
      }

      // Insert product into dd-products table
      const { data: insertedProducts, error } = await supabase
        .from('dd-products')
        .insert([productData])
        .select()

      if (error) {
        console.error('Error creating product:', error)
        toast.error('Erreur lors de la création du produit: ' + error.message)
        return
      }

      const newProduct = insertedProducts?.[0]

      if (!newProduct) {
        toast.error('Impossible de récupérer le produit créé')
        return
      }

      if (variantValues.length > 0) {
        const variantRows = variantValues.map(variant => ({
          product_id: newProduct.id,
          name: variant.name,
          sku: variant.sku || null,
          quantity: variant.quantityNumber
        }))

        const { error: variantsError } = await supabase
          .from('dd-product-variants')
          .insert(variantRows)

        if (variantsError) {
          console.error('Error inserting variants:', variantsError)
          toast.error('Produit créé mais erreur lors de l\'ajout des variantes: ' + variantsError.message)
        }
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
      setVariants([])
      setSelectedDomain(cascadeDomains[0] ?? "")
      setSelectedCategory(null)
      setSelectedTranches([])
      setSelectedFormes([])
      setSelectedBenefices([])
      setSelectedSkinTypes([])
      setSkuManuallyEdited(false)
      setBarcodeManuallyEdited(false)

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

  // Check if user has permission
  if (checkingRole) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Vérification des permissions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!canManageProducts) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accès Interdit</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Vous n'avez pas les permissions nécessaires pour ajouter des produits.
                Seuls les administrateurs et les managers peuvent créer des produits.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
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
                <div className="space-y-4 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/60 dark:bg-gray-900/30">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Domaine *</Label>
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      <span className="font-medium">Cosmetics</span> = produits externes • <span className="font-medium">COB</span> = produits maison.
                    </p>
                    <Select
                      value={selectedDomain}
                      onValueChange={(value) => {
                        setSelectedDomain(value)
                        setSelectedTranches([])
                        setSelectedFormes([])
                        setSelectedBenefices([])
                        setSelectedSkinTypes([])
                        setSkuManuallyEdited(false)
                        setBarcodeManuallyEdited(false)
                      }}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionner un domaine" />
                      </SelectTrigger>
                      <SelectContent>
                        {cascadeDomains.map((domain) => {
                          const label =
                            domain === domain.toUpperCase()
                              ? domain
                              : domain.charAt(0).toUpperCase() + domain.slice(1)
                          return (
                            <SelectItem key={domain} value={domain}>
                              {label}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Tranche principale *</Label>
                      <Popover open={tranchePopoverOpen} onOpenChange={setTranchePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-gray-50 text-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                            disabled={availableTranches.length === 0}
                          >
                            <span className="line-clamp-2 text-left">{availableTranches.length === 0 ? "Aucune tranche disponible" : trancheSummary}</span>
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          {availableTranches.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                              Aucune tranche disponible pour ce domaine.
                            </p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto py-1">
                              {availableTranches.map((item) => {
                                const tranche = item.tranche_principale
                                const isSelected = selectedTranches.includes(tranche)
                                return (
                                  <button
                                    key={tranche}
                                    type="button"
                                    onClick={() => handleToggleTranche(tranche)}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${isSelected ? "bg-gray-100 font-semibold dark:bg-gray-700" : ""}`}
                                  >
                                    <span className="pr-2 text-left">{tranche}</span>
                                    {isSelected && <Check className="h-4 w-4 text-pink-500" />}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {selectedTranches.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTranches([])
                                  setSelectedFormes([])
                                  setSelectedBenefices([])
                                  setTranchePopoverOpen(false)
                                }}
                                className="text-pink-600 transition hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                              >
                                Tout effacer
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Forme *</Label>
                      <Popover open={formePopoverOpen} onOpenChange={setFormePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-gray-50 text-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        disabled={availableFormes.length === 0}
                      >
                            <span className="line-clamp-2 text-left">{availableFormes.length === 0 ? "Aucune forme disponible" : formeSummary}</span>
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          {availableFormes.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                              Sélectionnez d'abord une tranche principale.
                            </p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto py-1">
                              {availableFormes.map((forme) => {
                                const isSelected = selectedFormes.includes(forme)
                                return (
                                  <button
                                    key={forme}
                                    type="button"
                                    onClick={() => handleToggleForme(forme)}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${isSelected ? "bg-gray-100 font-semibold dark:bg-gray-700" : ""}`}
                                  >
                                    <span className="pr-2 text-left">{forme}</span>
                                    {isSelected && <Check className="h-4 w-4 text-pink-500" />}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {selectedFormes.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedFormes([])
                                  setSelectedBenefices([])
                                  setFormePopoverOpen(false)
                                }}
                                className="text-pink-600 transition hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                              >
                                Tout effacer
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wide">Bénéfices *</Label>
                      <Popover open={beneficesPopoverOpen} onOpenChange={setBeneficesPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-between bg-gray-50 text-xs font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        disabled={availableBenefices.length === 0}
                      >
                            <span className="line-clamp-2 text-left capitalize">
                              {availableBenefices.length === 0 ? "Aucun bénéfice disponible" : beneficeSummary}
                            </span>
                            <ChevronsUpDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0" align="start">
                          {availableBenefices.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-muted-foreground">
                              Aucun bénéfice disponible pour cette sélection.
                            </p>
                          ) : (
                            <div className="max-h-64 overflow-y-auto py-1">
                              {availableBenefices.map((benefice) => {
                                const isSelected = selectedBenefices.includes(benefice)
                                return (
                                  <button
                                    key={benefice}
                                    type="button"
                                    onClick={() => handleToggleBenefice(benefice)}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${
                                      isSelected ? "bg-gray-100 font-semibold dark:bg-gray-700" : ""
                                    }`}
                                  >
                                    <span className="pr-2 text-left">{benefice}</span>
                                    {isSelected && <Check className="h-4 w-4 text-pink-500" />}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                          {selectedBenefices.length > 0 && (
                            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900/60">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedBenefices([])
                                  setBeneficesPopoverOpen(false)
                                }}
                                className="text-pink-600 transition hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                              >
                                Tout effacer
                              </button>
                            </div>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wide">Types de peau (optionnel)</Label>
                    <Popover open={skinTypePopoverOpen} onOpenChange={setSkinTypePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between bg-gray-50 text-xs font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100"
                        >
                          <span className="line-clamp-2 text-left capitalize">{skinTypeSummary}</span>
                          <ChevronsUpDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <div className="max-h-64 overflow-y-auto py-1">
                          {SKIN_TYPES.map((skinType) => {
                            const isSelected = selectedSkinTypes.includes(skinType)
                            return (
                              <button
                                key={skinType}
                                type="button"
                                onClick={() => handleToggleSkinType(skinType)}
                                className={`flex w-full items-center justify-between px-3 py-2 text-xs text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${
                                  isSelected ? "bg-gray-100 font-semibold dark:bg-gray-700" : ""
                                }`}
                              >
                                <span className="pr-2 text-left">{skinType}</span>
                                {isSelected && <Check className="h-4 w-4 text-pink-500" />}
                              </button>
                            )
                          })}
                        </div>
                        {selectedSkinTypes.length > 0 && (
                          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs dark:border-gray-700 dark:bg-gray-900/60">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSkinTypes([])
                                setSkinTypePopoverOpen(false)
                              }}
                              className="text-pink-600 transition hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                            >
                              Tout effacer
                            </button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Catégorie</Label>
                    <Input
                      value={matchingCategory?.name || cascadeCategoryName || ""}
                      readOnly
                      placeholder="Sélectionnez la classification pour voir la catégorie correspondante"
                      className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  {cascadeDescription && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Résumé de classification</Label>
                      <Textarea
                        value={cascadeDescription}
                        readOnly
                        rows={2}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                      />
                    </div>
                  )}
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
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSkuManuallyEdited(false)
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
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBarcodeManuallyEdited(false)
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

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900 dark:text-white">Variantes</CardTitle>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                    Créez des variantes (ex: tailles, couleurs). La somme des quantités doit être inférieure ou égale au stock total.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariantRow}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {variants.length === 0 ? (
                  <p className="text-sm text-muted-foreground dark:text-gray-400">
                    Aucune variante ajoutée.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variants.map(variant => (
                      <div key={variant.id} className="grid gap-3 md:grid-cols-12 items-end border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="md:col-span-5 space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">Nom *</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariantField(variant.id, 'name', e.target.value)}
                            placeholder="Ex: Taille M, Rouge"
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                          />
                        </div>
                        <div className="md:col-span-4 space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">SKU</Label>
                          <Input
                            value={variant.sku}
                            onChange={(e) => updateVariantField(variant.id, 'sku', e.target.value)}
                            placeholder="SKU spécifique à la variante"
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <Label className="text-gray-700 dark:text-gray-300">Quantité *</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.quantity}
                            onChange={(e) => updateVariantField(variant.id, 'quantity', e.target.value)}
                            placeholder="0"
                            className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeVariantRow(variant.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {variants.length > 0 && (
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    Total des quantités variantes: {variants.reduce((sum, variant) => sum + (parseInt(variant.quantity || '0', 10) || 0), 0)} / {formData.stock || 0}
                  </div>
                )}
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
                  
                  {/* File Inputs */}
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      disabled={uploadingImages}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      {uploadingImages ? <ButtonLoadingSpinner /> : 'Galerie'}
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={handleCameraCapture}
                      disabled={uploadingImages}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Caméra
                    </Button>
                  </div>

                  {/* Image Preview */}
                  {images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-gray-300">Images sélectionnées:</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {images.map((image, index) => (
                          <div key={index} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            disabled={loading || uploadingImages}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || uploadingImages}
          >
            {loading || uploadingImages ? <ButtonLoadingSpinner /> : 'Créer le Produit'}
          </Button>
        </div>
      </form>

      {isCropModalOpen && currentCropPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <Card className="w-full max-w-3xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-gray-900 dark:text-white">Recadrer l'image</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-600 dark:text-gray-300"
                onClick={handleCropCancel}
                disabled={processingCrop}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative w-full h-[380px] bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={currentCropPreview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                  cropShape="rect"
                  objectFit="contain"
                  showGrid
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Zoom</Label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-blue-600"
                  disabled={processingCrop}
                />
              </div>
              {cropQueue.length > 1 && (
                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Images restantes à traiter : {cropQueue.length - 1}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleUseOriginalImage}
                disabled={processingCrop}
              >
                Utiliser l'originale
              </Button>
              <Button
                type="button"
                variant="outline"
                className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={handleCropCancel}
                disabled={processingCrop}
              >
                Ignorer
              </Button>
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCropConfirm}
                disabled={processingCrop}
              >
                {processingCrop ? <ButtonLoadingSpinner /> : 'Appliquer le recadrage'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
