"use client"

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Upload, RefreshCw, X, Image as ImageIcon, Camera, Plus, Trash2, ChevronsUpDown, Check, Sparkles } from "lucide-react"
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
  productId?: string // Optional: if provided, component works in edit mode
  onCancel?: () => void // Optional: callback when canceling edit mode
}

export function AddProduct({ onProductCreated, productId, onCancel }: AddProductProps) {
  const isEditMode = !!productId
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
  const [categories, setCategories] = useState<Array<{id: string, name: string, parent_id?: string | null}>>([])
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string, parent_id?: string | null} | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false)
  const [barcodeManuallyEdited, setBarcodeManuallyEdited] = useState(false)
  const [images, setImages] = useState<File[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [variants, setVariants] = useState<Array<{ id: string; name: string; sku: string; quantity: string }>>([])
  const [cropQueue, setCropQueue] = useState<File[]>([])
  const [aiCropQueue, setAiCropQueue] = useState<File[]>([]) // Queue for AI analysis images
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [isAiCrop, setIsAiCrop] = useState(false) // Track if current crop is for AI analysis
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null)
  const [currentCropPreview, setCurrentCropPreview] = useState<string>("")
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const [similarProducts, setSimilarProducts] = useState<Array<{id: string, name: string, sku?: string, brand?: string}>>([])
  const [searchingSimilar, setSearchingSimilar] = useState(false)
  const [showSimilarProducts, setShowSimilarProducts] = useState(false)
  const [structuredDescription, setStructuredDescription] = useState("")
  const [activeTab, setActiveTab] = useState("rapide")
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [aiAnalysisImage, setAiAnalysisImage] = useState<File | null>(null)
  const [aiAnalysisPreview, setAiAnalysisPreview] = useState<string>("")
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

  // Category name used for POS filters: limit to two levels (e.g. "Soin des cheveux • Shampoing")
  // This avoids creating too many very granular categories like "Cosmetics • Soin des cheveux • Shampoing • Nourrissant"
  const cascadeCategoryName = useMemo(() => {
    if (!primaryTranche && !primaryForme) return ""
    return [primaryTranche, primaryForme].filter(Boolean).join(" • ")
  }, [primaryTranche, primaryForme])
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
    // Prioritize manually selected category
    if (selectedCategory?.name) return selectedCategory.name
    if (matchingCategory?.name) return matchingCategory.name
    if (cascadeCategoryName) return cascadeCategoryName
    if (selectedTranches.length > 0) return selectedTranches[0]
    if (selectedDomain) return selectedDomain
    return "Produit"
  }, [selectedCategory, matchingCategory, cascadeCategoryName, selectedTranches, selectedDomain])

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

  const startCroppingFile = useCallback(async (file: File, isAi: boolean = false) => {
    try {
      const preview = await readFileAsDataURL(file)
      setCurrentCropFile(file)
      setCurrentCropPreview(preview)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setIsAiCrop(isAi)
      setIsCropModalOpen(true)
    } catch (error) {
      console.error('Error preparing image for crop:', error)
      toast.error("Erreur lors de la préparation de l'image pour recadrage")
      setCropQueue(prev => prev.filter(item => item !== file))

      // CROP FLOW COMMENTED - AI crop queue handling disabled
      // if (isAi) {
      //   setAiCropQueue(prev => prev.filter(item => item !== file))
      // } else {
      //   setCropQueue(prev => prev.filter(item => item !== file))
      // }
    }
  }, [])

  const fetchProductForEdit = async () => {
    if (!productId) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:"dd-categories"(id, name, parent_id),
          variants:"dd-product-variants"(id, name, sku, quantity)
        `)
        .eq('id', productId)
        .single()

      if (error) throw error
      
      if (data) {
        // Populate form with existing product data
        setFormData({
          name: data.name || '',
          description: data.description || '',
          category: data.category_id || '',
          brand: data.brand || '',
          price: data.price?.toString() || '',
          cost: data.cost?.toString() || '',
          stock: data.stock_quantity?.toString() || '',
          sku: data.sku || '',
          barcode: data.barcode || '',
          status: data.status || 'active',
          show_on_website: data.show_to_website || false
        })

        // Set category if exists
        if (data.category) {
          setSelectedCategory(data.category)
          setSelectedCategoryId(data.category.id)
        }

        // Set variants if exists
        if (data.variants && Array.isArray(data.variants)) {
          setVariants(data.variants.map((v: { id: string; name: string; sku?: string; quantity: number }) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            quantity: v.quantity?.toString() || ''
          })))
        }

        // TODO: Parse category cascade from product name/description to populate cascade fields
        // This is complex and would require reverse-engineering the category cascade
      }
    } catch (error) {
      console.error('Error fetching product for edit:', error)
      toast.error('Erreur lors du chargement du produit')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchCurrentUserRole()
    if (productId && isEditMode) {
      fetchProductForEdit()
    }
  }, [productId, isEditMode])

  useEffect(() => {
    if (matchingCategory) {
      // Only update if no manual selection has been made
      if (!selectedCategoryId) {
        setFormData(prev => {
          if (prev.category === matchingCategory.id) {
            return prev
          }
          return { ...prev, category: matchingCategory.id }
        })
        setSelectedCategory({ id: matchingCategory.id, name: matchingCategory.name, parent_id: matchingCategory.parent_id })
        setSelectedCategoryId(matchingCategory.id)
        setSkuManuallyEdited(false)
        setBarcodeManuallyEdited(false)
      }
    }
  }, [matchingCategory, selectedCategoryId, selectedFormes]) // Added selectedFormes dependency to trigger when formes are set

  useEffect(() => {
    if (!isCropModalOpen && cropQueue.length > 0) {
      const nextFile = cropQueue[0]
      startCroppingFile(nextFile, false)
    }
    // CROP FLOW COMMENTED - AI crop queue processing disabled
    // if (!isCropModalOpen) {
    //   // Prioritize normal crop queue, then AI crop queue
    //   if (cropQueue.length > 0) {
    //     const nextFile = cropQueue[0]
    //     startCroppingFile(nextFile, false)
    //   } else if (aiCropQueue.length > 0) {
    //     const nextFile = aiCropQueue[0]
    //     startCroppingFile(nextFile, true)
    //   }
    // }
  }, [cropQueue, isCropModalOpen, startCroppingFile])
  // aiCropQueue removed from dependencies

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
      // Fetch all product categories (both parent and subcategories)
      const { data, error } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', 'product')
        .eq('is_active', true)
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('name', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }
  
  // Update selectedCategory when selectedCategoryId changes (manual selection)
  useEffect(() => {
    if (selectedCategoryId) {
      const category = categories.find(c => c.id === selectedCategoryId)
      if (category) {
        setSelectedCategory(category)
        setFormData(prev => ({ ...prev, category: category.id }))
        setSkuManuallyEdited(false)
        setBarcodeManuallyEdited(false)
      }
    } else if (!selectedCategoryId && !matchingCategory) {
      // Only clear if no cascade category is matching
      setSelectedCategory(null)
      setFormData(prev => ({ ...prev, category: "" }))
    }
  }, [selectedCategoryId, categories, matchingCategory])

  // Search for similar products (after 2 words, i.e., from 3rd word)
  const searchSimilarProducts = useCallback(async (productName: string) => {
    if (!productName || productName.trim().length === 0) {
      setSimilarProducts([])
      setShowSimilarProducts(false)
      return
    }

    // Split by spaces and filter empty strings
    const words = productName.trim().split(/\s+/).filter(w => w.length > 0)
    
    // Only search if we have 3 or more words (after 2 words)
    if (words.length < 3) {
      setSimilarProducts([])
      setShowSimilarProducts(false)
      return
    }

    // Use words from the 3rd word onwards for similarity search
    const searchTerms = words.slice(2).join(' ')
    
    if (searchTerms.length < 2) {
      setSimilarProducts([])
      setShowSimilarProducts(false)
      return
    }

    try {
      setSearchingSimilar(true)
      // Search for products with similar names (case-insensitive, partial match)
      const { data, error } = await supabase
        .from('dd-products')
        .select('id, name, sku, brand')
        .ilike('name', `%${searchTerms}%`)
        .limit(5) // Limit to 5 similar products
        .order('name', { ascending: true })

      if (error) throw error

      // Filter out exact matches (to avoid showing the same product)
      const filtered = (data || []).filter(p => 
        p.name.toLowerCase() !== productName.toLowerCase()
      )

      setSimilarProducts(filtered)
      setShowSimilarProducts(filtered.length > 0)
    } catch (error) {
      console.error('Error searching similar products:', error)
      setSimilarProducts([])
      setShowSimilarProducts(false)
    } finally {
      setSearchingSimilar(false)
    }
  }, [])

  // Parse structured description and auto-fill fields
  const parseStructuredDescription = useCallback((text: string) => {
    if (!text || text.trim().length === 0) return

    // Split by newlines but keep empty lines for context (they might separate sections)
    const lines = text.split('\n').map(l => l.trim())
    
    let productName = ""
    let brand = ""
    let tranchePrincipale = ""
    let formes: string[] = []
    let benefices: string[] = []
    let skinTypes: string[] = []
    let descriptionDetaillee = ""
    let descriptionEnrichie = ""
    let price = ""
    let quantity = ""

    // Extract brand and product name from structured lines
    // Format: "marque L'Oreal   nom   L'Oréal Triple Active... Catégorie..."
    // Brand is text between "marque" and "nom"
    // Product name is text between "nom" and "Catégorie"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if line contains both "marque" and "nom"
      if (line.match(/marque\s+/i) && line.match(/nom\s+/i)) {
        // Extract brand: text between "marque" and "nom"
        const marqueMatch = line.match(/marque\s+(.*?)\s+nom\s+/i)
        if (marqueMatch && marqueMatch[1]) {
          brand = marqueMatch[1].trim()
        }
        
        // Extract product name: text between "nom" and "Catégorie"
        const nomMatch = line.match(/nom\s+(.*?)(?:\s+Catégorie|$)/i)
        if (nomMatch && nomMatch[1]) {
          let extractedName = nomMatch[1].trim()
          // Also check for "Catégorie" in case it wasn't captured by regex
          const categoryIndex = extractedName.indexOf('Catégorie')
          productName = categoryIndex > 0 ? extractedName.substring(0, categoryIndex).trim() : extractedName
        }
      } else {
        // Handle separate lines
        // Extract brand from "marque" line
        if (line.match(/^marque\s+/i)) {
          const brandMatch = line.replace(/^marque\s+/i, '').trim()
          // Check if "nom" follows on the same line
          const nomRegex = /\s+nom\s+/i
          const nomMatch = brandMatch.match(nomRegex)
          if (nomMatch) {
            const nomIndex = brandMatch.indexOf(nomMatch[0])
            brand = brandMatch.substring(0, nomIndex).trim()
          } else {
            brand = brandMatch
          }
        }
        
        // Extract product name from "nom" line
        if (line.match(/^nom\s+/i)) {
          const nameMatch = line.replace(/^nom\s+/i, '').trim()
          // Remove "Catégorie" and everything after if present
          const categoryIndex = nameMatch.indexOf('Catégorie')
          productName = categoryIndex > 0 ? nameMatch.substring(0, categoryIndex).trim() : nameMatch
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Tranche Principale - handle single space, tab, or multiple spaces
      if (line.match(/^Tranche\s+Principale/i)) {
        // Remove "Tranche Principale" and get the rest
        const match = line.match(/^Tranche\s+Principale\s+(.+)/i)
        if (match && match[1]) {
          tranchePrincipale = match[1].trim()
        } else if (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i)) {
          tranchePrincipale = lines[i + 1].trim()
        }
      }
      
      // Sous-Tranche (Formes) - handle single space, tab, or multiple spaces
      if (line.match(/Sous-Tranche\s*\(Formes\)/i)) {
        // Remove "Sous-Tranche (Formes)" and get the rest
        const match = line.match(/Sous-Tranche\s*\(Formes\)\s+(.+)/i)
        let formeValue = ""
        if (match && match[1]) {
          formeValue = match[1].trim()
        } else if (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i)) {
          formeValue = lines[i + 1].trim()
        }
        // Extract forme name (remove parenthetical info)
        if (formeValue) {
          // Remove everything after first opening parenthesis and trim
          const formeMatch = formeValue.match(/^([^(]+)/)
          if (formeMatch) {
            let formeName = formeMatch[1].trim()
            // Clean up any trailing spaces or special characters
            formeName = formeName.replace(/\s+$/, '').trim()
            if (formeName) {
              formes = [formeName]
            }
          } else {
            // If no parenthesis, use the whole value
            const trimmed = formeValue.trim()
            if (trimmed) {
              formes = [trimmed]
            }
          }
        }
      }
      
      // Sous-Tranche (Bénéfices) - handle single space, tab, or multiple spaces
      if (line.match(/Sous-Tranche\s*\(Bénéfices\)/i)) {
        // Remove "Sous-Tranche (Bénéfices)" and get the rest
        const match = line.match(/Sous-Tranche\s*\(Bénéfices\)\s+(.+)/i)
        let beneficesValue = ""
        if (match && match[1]) {
          beneficesValue = match[1].trim()
        } else if (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i)) {
          beneficesValue = lines[i + 1].trim()
        }
        // Split by comma and extract benefit names (remove parenthetical info)
        if (beneficesValue) {
          benefices = beneficesValue.split(',').map(b => {
            const trimmed = b.trim()
            if (!trimmed) return ''
            
            // Remove parenthetical info
            const match = trimmed.match(/^([^(]+)/)
            let benefit = match ? match[1].trim() : trimmed
            // Clean up any trailing spaces or special characters
            benefit = benefit.replace(/\s+$/, '').trim()
            
            if (!benefit) return ''
            
            // Map common variations to standard names
            const benefitLower = benefit.toLowerCase()
            if (benefitLower.includes('protecteur') || benefitLower.includes('protection') || benefitLower.includes('uv') || benefitLower.includes('filtre')) {
              benefit = 'Protection solaire'
            } else if (benefitLower.includes('éclat') || benefitLower.includes('eclat') || benefitLower.includes('éclaircissant') || benefitLower.includes('eclaircissant')) {
              benefit = 'Éclaircissant'
            } else if (benefitLower.includes('hydratant') || benefitLower.includes('hydratation')) {
              benefit = 'Hydratant'
            } else if (benefitLower.includes('nourrissant') || benefitLower.includes('nourriture')) {
              benefit = 'Nourrissant'
            } else if (benefitLower.includes('réparateur') || benefitLower.includes('reparateur') || benefitLower.includes('réparation') || benefitLower.includes('reparation')) {
              benefit = 'Réparateur'
            } else if (benefitLower.includes('apaisant') || benefitLower.includes('apaisement') || benefitLower.includes('soothing')) {
              benefit = 'Apaisant'
            } else if (benefitLower.includes('non gras') || benefitLower.includes('non-gras') || benefitLower.includes('non gras') || benefitLower.includes('non-greasy')) {
              benefit = 'Non gras'
            }
            return benefit
          }).filter(b => b.length > 0)
        }
      }
      
      // Type de Peau Cible - handle single space, tab, or multiple spaces
      if (line.match(/Type\s+de\s+Peau/i)) {
        // Remove "Type de Peau Cible" and get the rest
        const match = line.match(/Type\s+de\s+Peau\s+Cible\s+(.+)/i)
        let skinTypeValue = ""
        if (match && match[1]) {
          skinTypeValue = match[1].trim()
        } else if (i + 1 < lines.length && lines[i + 1] && !lines[i + 1].match(/^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i)) {
          skinTypeValue = lines[i + 1].trim()
        }
        // Extract skin type (remove parenthetical info)
        if (skinTypeValue) {
          const skinMatch = skinTypeValue.match(/^([^(]+)/)
          if (skinMatch) {
            const skinType = skinMatch[1].trim()
            // Map to available skin types
            const normalized = skinType.toLowerCase()
            if (normalized.includes('normale') && normalized.includes('mixte')) {
              skinTypes = ['Peau normale', 'Peau mixte']
            } else if (normalized.includes('normale')) {
              skinTypes = ['Peau normale']
            } else if (normalized.includes('mixte')) {
              skinTypes = ['Peau mixte']
            } else if (normalized.includes('sèche') || normalized.includes('seche')) {
              skinTypes = ['Peau sèche']
            } else if (normalized.includes('grasse')) {
              skinTypes = ['Peau grasse']
            } else if (normalized.includes('sensible')) {
              skinTypes = ['Peau sensible']
            } else if (normalized.includes('mature')) {
              skinTypes = ['Peau mature']
            } else if (normalized.includes('déshydratée') || normalized.includes('deshydratee')) {
              skinTypes = ['Peau déshydratée']
            } else if (normalized.includes('acné') || normalized.includes('acne')) {
              skinTypes = ['Peau sujette à l\'acné']
            } else if (normalized.includes('hyperpigmentée') || normalized.includes('hyperpigmentee')) {
              skinTypes = ['Peau hyperpigmentée']
            }
          }
        }
      }
      
      // Description détaillée - handle both "Description détaillée" and "Description détaillée (pour le site internet)"
      if (line.match(/Description\s+détaillée/i)) {
        // Extract text after "Description détaillée (pour le site internet)" or "Description détaillée"
        const match = line.match(/Description\s+détaillée\s*(?:\([^)]*\))?\s*(.+)/i)
        let desc = ""
        if (match && match[1]) {
          desc = match[1].trim()
        }
        // Collect following lines until next section (Description Enrichie or end)
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j]
          // Stop if we hit Description Enrichie or another major section
          if (nextLine && nextLine.match(/Description\s+Enrichie|^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i)) {
            break
          }
          // Skip empty lines only if we haven't started collecting text
          if (!nextLine || !nextLine.trim()) {
            if (!desc) continue // Skip empty lines at the start
            break // Stop at first empty line after we've started collecting
          }
          desc += (desc ? " " : "") + nextLine.trim()
        }
        // Remove price/quantity pattern at the end (e.g., "0f, 4" or "50f, 4")
        descriptionDetaillee = desc.trim().replace(/\s+\d+\s*[fF]\s*,\s*\d+\s*$/i, '').trim()
      }
      
      // Description Enrichie - handle both "Description Enrichie" and "Description Enrichie (longue)"
      if (line.match(/Description\s+Enrichie/i)) {
        // Extract text after "Description Enrichie (longue)" or "Description Enrichie"
        const match = line.match(/Description\s+Enrichie\s*(?:\([^)]*\))?\s*(.+)/i)
        let desc = ""
        if (match && match[1]) {
          desc = match[1].trim()
        }
        // Collect all following lines until end or another major section or price pattern
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j]
          // Stop if we hit another major section or price pattern
          if (!nextLine || nextLine.match(/^(Tranche|Sous-Tranche|Type|Description|marque|nom)/i) || nextLine.match(/\d+\s*[fF]\s*,/i)) {
            break
          }
          // Skip empty lines only if we haven't started collecting text
          if (!nextLine.trim()) {
            if (!desc) continue // Skip empty lines at the start
            break // Stop at first empty line after we've started collecting
          }
          desc += (desc ? " " : "") + nextLine.trim()
        }
        // Remove price/quantity pattern at the end (e.g., "0f, 4" or "50f, 4")
        descriptionEnrichie = desc.trim().replace(/\s+\d+\s*[fF]\s*,\s*\d+\s*$/i, '').trim()
      }
      
      // Extract price and quantity from format like "2000f, 4", "2000f,4", or "50f, 4"
      // Pattern: number followed by 'f' or 'F', comma, then number
      const priceQtyMatch = line.match(/(\d+(?:\s*\d+)*)\s*[fF]\s*,\s*(\d+)/i)
      if (priceQtyMatch && !price && !quantity) {
        // Extract price (remove spaces from number, e.g., "2 000" -> "2000")
        price = priceQtyMatch[1].replace(/\s+/g, '')
        quantity = priceQtyMatch[2]
      }
    }
    
    // Also check the entire text for price/quantity pattern if not found in lines
    // This handles cases where price/quantity is at the end of the text
    if (!price && !quantity) {
      const fullTextMatch = text.match(/(\d+(?:\s*\d+)*)\s*[fF]\s*,\s*(\d+)/i)
      if (fullTextMatch) {
        price = fullTextMatch[1].replace(/\s+/g, '')
        quantity = fullTextMatch[2]
      }
    }

    // Auto-fill product name
    if (productName) {
      setFormData(prev => ({ ...prev, name: productName }))
    }

    // Auto-fill brand
    if (brand) {
      setFormData(prev => ({ ...prev, brand: brand }))
    }

    // Auto-fill cascade fields - set tranche first
    if (tranchePrincipale) {
      // Search for matching tranche across ALL domains, not just selected domain
      let matchingTranche = null
      let matchingDomain = selectedDomain
      
      // Search in all domains
      for (const domain of cascadeDomains) {
        const domainTranches = CATEGORY_CASCADE[domain] ?? []
        const found = domainTranches.find(t => 
          t.tranche_principale.toLowerCase() === tranchePrincipale.toLowerCase()
        )
        if (found) {
          matchingTranche = found
          matchingDomain = domain
          break
        }
      }
      
      // If not found in all domains, try availableTranches as fallback
      if (!matchingTranche) {
        matchingTranche = availableTranches.find(t => 
          t.tranche_principale.toLowerCase() === tranchePrincipale.toLowerCase()
        )
      }
      
      if (matchingTranche) {
        // Set domain first if it changed
        if (matchingDomain !== selectedDomain) {
          setSelectedDomain(matchingDomain)
        }
        
        // Set tranche first
        setSelectedTranches([matchingTranche.tranche_principale])
        
        // Get available formes and benefices from the matching tranche
        const trancheFormes = matchingTranche.sous_tranches.formes
        const trancheBenefices = matchingTranche.sous_tranches.benefices
        
        // Auto-fill formes after a short delay to ensure state is updated
        setTimeout(() => {
          if (formes.length > 0) {
            // Try exact match first, then partial match
            const matchingFormes = formes.filter(f => {
              const fLower = f.toLowerCase().trim()
              return trancheFormes.some(tf => {
                const tfLower = tf.toLowerCase().trim()
                // Exact match
                if (tfLower === fLower) return true
                // Partial match - check if one contains the other
                if (tfLower.includes(fLower) || fLower.includes(tfLower)) return true
                // Check for common variations (e.g., "Crème" vs "Crème de jour")
                const fWords = fLower.split(/\s+/)
                const tfWords = tfLower.split(/\s+/)
                // If first word matches, consider it a match
                if (fWords[0] && tfWords[0] && fWords[0] === tfWords[0]) return true
                return false
              })
            })
            if (matchingFormes.length > 0) {
              // Map to exact case from cascade
              const exactFormes = matchingFormes.map(mf => {
                const mfLower = mf.toLowerCase().trim()
                // Try exact match first
                let found = trancheFormes.find(tf => tf.toLowerCase().trim() === mfLower)
                if (found) return found
                // Try partial match
                found = trancheFormes.find(tf => {
                  const tfLower = tf.toLowerCase().trim()
                  return tfLower.includes(mfLower) || mfLower.includes(tfLower)
                })
                if (found) return found
                // Try first word match
                const mfFirstWord = mfLower.split(/\s+/)[0]
                found = trancheFormes.find(tf => {
                  const tfLower = tf.toLowerCase().trim()
                  return tfLower.startsWith(mfFirstWord) || mfLower.startsWith(tfLower.split(/\s+/)[0])
                })
                return found || mf
              })
              setSelectedFormes(exactFormes.slice(0, 2)) // Max 2 formes
              // Category will auto-update via useEffect when selectedFormes changes
            }
          }
          
          // Auto-fill benefices
          if (benefices.length > 0) {
            // Try exact match first, then partial match
            const matchingBenefices = benefices.filter(b => {
              const bLower = b.toLowerCase().trim()
              return trancheBenefices.some(tb => {
                const tbLower = tb.toLowerCase().trim()
                // Exact match
                if (tbLower === bLower) return true
                // Partial match
                if (tbLower.includes(bLower) || bLower.includes(tbLower)) return true
                return false
              })
            })
            if (matchingBenefices.length > 0) {
              // Map to exact case from cascade
              const exactBenefices = matchingBenefices.map(mb => {
                const mbLower = mb.toLowerCase().trim()
                // Try exact match first
                let found = trancheBenefices.find(tb => tb.toLowerCase().trim() === mbLower)
                if (found) return found
                // Try partial match
                found = trancheBenefices.find(tb => {
                  const tbLower = tb.toLowerCase().trim()
                  return tbLower.includes(mbLower) || mbLower.includes(tbLower)
                })
                return found || mb
              })
              setSelectedBenefices(exactBenefices)
            }
          }
        }, 300) // Increased delay to ensure state is fully updated and category can be generated
      }
    }

    // Auto-fill skin types
    if (skinTypes.length > 0) {
      const matchingSkinTypes = skinTypes.filter(st => SKIN_TYPES.includes(st))
      if (matchingSkinTypes.length > 0) {
        setSelectedSkinTypes(matchingSkinTypes)
      }
    }

    // Auto-fill descriptions - combine both with a blank line between them
    let combinedDescription = ""
    if (descriptionDetaillee && descriptionEnrichie) {
      combinedDescription = `${descriptionDetaillee}\n\n${descriptionEnrichie}`
    } else if (descriptionDetaillee) {
      combinedDescription = descriptionDetaillee
    } else if (descriptionEnrichie) {
      combinedDescription = descriptionEnrichie
    }
    
    if (combinedDescription) {
      setFormData(prev => ({ ...prev, description: combinedDescription }))
    }

    // Auto-fill price
    if (price) {
      setFormData(prev => ({ ...prev, price: price }))
    }

    // Auto-fill quantity/stock
    if (quantity) {
      setFormData(prev => ({ ...prev, stock: quantity }))
    }

    toast.success("Informations extraites et champs remplis automatiquement!")
  }, [availableTranches, selectedTranches])

  // Debounced search for similar products
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        searchSimilarProducts(formData.name)
      } else {
        setSimilarProducts([])
        setShowSimilarProducts(false)
      }
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [formData.name, searchSimilarProducts])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === "sku") {
      setSkuManuallyEdited(true)
    } else if (name === "barcode") {
      setBarcodeManuallyEdited(true)
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Keep similar products visible when typing in name field
    if (name === "name") {
      // The useEffect will handle the search
    }
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
    setIsAiCrop(false)
    setCurrentCropFile(null)
    setCurrentCropPreview("")
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setProcessingCrop(false)

    // CROP FLOW COMMENTED - AI crop queue handling disabled
    // if (isAiCrop) {
    //   setAiCropQueue(prev => prev.slice(1))
    // } else {
    //   setCropQueue(prev => prev.slice(1))
    // }
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

      // CROP FLOW COMMENTED - AI crop logic disabled
      // if (isAiCrop) {
      //   // For AI analysis, set preview and analyze the image
      //   const preview = await readFileAsDataURL(compressedFile)
      //   setAiAnalysisPreview(preview)
      //   setAiAnalysisImage(compressedFile)
      //   await handleAIImageAnalysis(compressedFile)
      //   toast.success('Image ajoutée sans recadrage, analyse en cours...')
      // } else {
      //   // For normal images, add to images array
      //   setImages(prev => [...prev, compressedFile])
      //   toast.success('Image ajoutée sans recadrage')
      // }
      // 
      // finishCropStep()
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

      // CROP FLOW COMMENTED - AI crop logic disabled
      // if (isAiCrop) {
      //   // For AI analysis, set preview and analyze the image
      //   const preview = await readFileAsDataURL(compressedFile)
      //   setAiAnalysisPreview(preview)
      //   setAiAnalysisImage(compressedFile)
      //   await handleAIImageAnalysis(compressedFile)
      //   toast.success('Image recadrée, analyse en cours...')
      // } else {
      //   // For normal images, add to images array
      //   setImages(prev => [...prev, compressedFile])
      //   toast.success('Image recadrée ajoutée')
      // }
      // 
      // finishCropStep()
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

  // Handle AI image analysis for intelligent product addition
  // Note: file is already compressed from handleAIImageUpload or handleAICameraCapture
  const handleAIImageAnalysis = async (file: File) => {
    try {
      setAnalyzingImage(true)
      
      // Add compressed image to images array immediately so it gets saved with the product
      // Always ensure the analyzed image is in the array for intelligent mode
      setImages((prev) => {
        // Check if this exact file is already in array
        const exists = prev.some(
          img => img.name === file.name && 
          img.size === file.size && 
          img.lastModified === file.lastModified &&
          img.type === file.type
        )
        if (!exists) {
          // In intelligent mode, replace existing images with the analyzed one
          // This ensures the analyzed image is saved with the product
          return [file]
        }
        return prev
      })
      
      const imageBase64 = await readFileAsDataURL(file)

      const response = await fetch('/api/ai/product-image-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          userRole: currentUserRole,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.details || 'Erreur lors de l\'analyse de l\'image'
        console.error('API Error:', errorData)
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success && result.data) {
        const analysis = result.data

        // Fill form with AI analysis
        if (analysis.name) {
          setFormData((prev) => ({ ...prev, name: analysis.name }))
        }
        if (analysis.brand) {
          setFormData((prev) => ({ ...prev, brand: analysis.brand }))
        }
        if (analysis.description) {
          // Use description as is (already complete from Gemini)
          setFormData((prev) => ({ ...prev, description: analysis.description }))
        }
        
        // Handle tranche principale first
        let foundTranche: string | null = null
        let foundDomain: string | null = null
        if (analysis.tranchePrincipale) {
          const tranchePrincipale = analysis.tranchePrincipale.trim()
          // Find matching tranche in CATEGORY_CASCADE
          for (const domain of Object.keys(CATEGORY_CASCADE)) {
            const cascadeData = CATEGORY_CASCADE[domain as keyof typeof CATEGORY_CASCADE]
            const matchingTranche = cascadeData.find((node) => 
              node.tranche_principale.toLowerCase() === tranchePrincipale.toLowerCase() ||
              tranchePrincipale.toLowerCase().includes(node.tranche_principale.toLowerCase()) ||
              node.tranche_principale.toLowerCase().includes(tranchePrincipale.toLowerCase())
            )
            if (matchingTranche) {
              foundTranche = matchingTranche.tranche_principale
              foundDomain = domain
              // Set domain if not already set
              if (!selectedDomain || selectedDomain !== domain) {
                setSelectedDomain(domain)
              }
              // Add tranche if not already selected
              setSelectedTranches((prev) => {
                if (!prev.includes(matchingTranche.tranche_principale)) {
                  return prev.length < 2 ? [...prev, matchingTranche.tranche_principale] : [matchingTranche.tranche_principale]
                }
                return prev
              })
              break
            }
          }
        }

        // Handle forme - use found tranche or search all tranches
        if (analysis.form) {
          const formValue = analysis.form.trim()
          let matchingForme: string | null = null
          
          if (foundTranche && foundDomain) {
            // Use the found tranche
            const cascadeData = CATEGORY_CASCADE[foundDomain as keyof typeof CATEGORY_CASCADE]
            const matchingTranche = cascadeData.find(node => node.tranche_principale === foundTranche)
            if (matchingTranche) {
              const foundForme = matchingTranche.sous_tranches.formes.find((forme) =>
                forme.toLowerCase() === formValue.toLowerCase() ||
                formValue.toLowerCase().includes(forme.toLowerCase()) ||
                forme.toLowerCase().includes(formValue.toLowerCase())
              )
              if (foundForme) {
                matchingForme = foundForme
              }
            }
          } else {
            // Search all tranches if no tranche was found
            for (const domain of Object.keys(CATEGORY_CASCADE)) {
              const cascadeData = CATEGORY_CASCADE[domain as keyof typeof CATEGORY_CASCADE]
              for (const node of cascadeData) {
                const foundForme = node.sous_tranches.formes.find((forme) =>
                  forme.toLowerCase() === formValue.toLowerCase() ||
                  formValue.toLowerCase().includes(forme.toLowerCase()) ||
                  forme.toLowerCase().includes(formValue.toLowerCase())
                )
                if (foundForme) {
                  matchingForme = foundForme
                  // Also set the tranche if not already set
                  if (!foundTranche) {
                    foundTranche = node.tranche_principale
                    foundDomain = domain
                    setSelectedDomain(domain)
                    setSelectedTranches((prev) => {
                      if (!prev.includes(node.tranche_principale)) {
                        return prev.length < 2 ? [...prev, node.tranche_principale] : [node.tranche_principale]
                      }
                      return prev
                    })
                  }
                  break
                }
              }
              if (matchingForme) break
            }
          }
          
          if (matchingForme) {
            setSelectedFormes((prev) => {
              if (!prev.includes(matchingForme!)) {
                return prev.length < 2 ? [...prev, matchingForme!] : [matchingForme!]
              }
              return prev
            })
          }
        }

        // Handle benefits - use found tranche or search all tranches
        if (analysis.benefits && Array.isArray(analysis.benefits) && analysis.benefits.length > 0) {
          let allBenefices: string[] = []
          
          if (foundTranche && foundDomain) {
            // Use the found tranche
            const cascadeData = CATEGORY_CASCADE[foundDomain as keyof typeof CATEGORY_CASCADE]
            const matchingTranche = cascadeData.find(node => node.tranche_principale === foundTranche)
            if (matchingTranche) {
              allBenefices = matchingTranche.sous_tranches.benefices
            }
          } else {
            // Search all tranches if no tranche was found
            for (const domain of Object.keys(CATEGORY_CASCADE)) {
              const cascadeData = CATEGORY_CASCADE[domain as keyof typeof CATEGORY_CASCADE]
              for (const node of cascadeData) {
                allBenefices.push(...node.sous_tranches.benefices)
              }
            }
          }
          
          // Match benefits from analysis with available benefices
          const matchingBenefices: string[] = []
          for (const benefit of analysis.benefits) {
            const matching = allBenefices.find((b) =>
              b.toLowerCase() === benefit.toLowerCase() ||
              benefit.toLowerCase().includes(b.toLowerCase()) ||
              b.toLowerCase().includes(benefit.toLowerCase())
            )
            if (matching && !matchingBenefices.includes(matching)) {
              matchingBenefices.push(matching)
            }
          }
          
          if (matchingBenefices.length > 0) {
            setSelectedBenefices((prev) => {
              const newBenefices = [...prev]
              matchingBenefices.forEach((b) => {
                if (!newBenefices.includes(b)) {
                  newBenefices.push(b)
                }
              })
              return newBenefices
            })
          }
        }

        // Handle skin types - skip for shampoings (hair care products)
        const isHairProduct = analysis.tranchePrincipale?.toLowerCase().includes('cheveux') || 
                             analysis.form?.toLowerCase().includes('shampoing') ||
                             analysis.form?.toLowerCase().includes('après-shampoing') ||
                             analysis.name?.toLowerCase().includes('shampoing') ||
                             analysis.name?.toLowerCase().includes('cheveux')
        
        if (!isHairProduct && analysis.skinTypes && Array.isArray(analysis.skinTypes) && analysis.skinTypes.length > 0) {
          const matchingSkinTypes: string[] = []
          analysis.skinTypes.forEach((skinType: string) => {
            const matching = SKIN_TYPES.find((st) =>
              st.toLowerCase() === skinType.toLowerCase() ||
              skinType.toLowerCase().includes(st.toLowerCase()) ||
              st.toLowerCase().includes(skinType.toLowerCase())
            )
            if (matching && !matchingSkinTypes.includes(matching)) {
              matchingSkinTypes.push(matching)
            }
          })
          if (matchingSkinTypes.length > 0) {
            setSelectedSkinTypes((prev) => {
              const newSkinTypes = [...prev]
              matchingSkinTypes.forEach((st) => {
                if (!newSkinTypes.includes(st)) {
                  newSkinTypes.push(st)
                }
              })
              return newSkinTypes
            })
          }
        } else if (isHairProduct) {
          // Clear skin types for hair products
          setSelectedSkinTypes([])
        }

        if (analysis.category && categories.length > 0) {
          // Find matching category
          const matchingCategory = categories.find((c) =>
            c.name.toLowerCase().includes(analysis.category.toLowerCase()) ||
            analysis.category.toLowerCase().includes(c.name.toLowerCase())
          )
          if (matchingCategory) {
            setSelectedCategoryId(matchingCategory.id)
            setFormData((prev) => ({ ...prev, category: matchingCategory.id }))
          }
        }
        if (analysis.sku) {
          setFormData((prev) => ({ ...prev, sku: analysis.sku }))
          setSkuManuallyEdited(true)
        }

        // Image is already compressed and added to images array in handleAIImageAnalysis
        // No need to add it again here since it's already in the array

        toast.success('Analyse terminée! Les champs détectables ont été remplis automatiquement par le système. L\'image sera sauvegardée avec le produit.')
      } else {
        toast.error('Aucune donnée extraite de l\'image par le système')
      }
    } catch (error: any) {
      console.error('Error analyzing image:', error)
      toast.error(error.message || 'Erreur lors de l\'analyse de l\'image')
    } finally {
      setAnalyzingImage(false)
    }
  }

  // Handle image upload for AI analysis
  const handleAIImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image')
      return
    }

    // Compress image before analysis (same as ajout rapide)
    const [compressedFile] = await compressImages(
      [file],
      { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 }
    )

    // Set preview with compressed file
    const preview = await readFileAsDataURL(compressedFile)
    setAiAnalysisPreview(preview)
    setAiAnalysisImage(compressedFile)

    // Automatically analyze the compressed image (which will add it to images array)
    await handleAIImageAnalysis(compressedFile)

    // CROP FLOW COMMENTED - Previous flow restored
    // Add image to AI crop queue for cropping before analysis (same as ajout rapide)
    // setAiCropQueue(prev => [...prev, file])
    // toast.success('Image ajoutée pour recadrage avant analyse')
  }

  // Handle camera capture for AI analysis (same flow as ajout rapide)
  const handleAICameraCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera on mobile
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner une image')
        return
      }

      // Compress image before analysis (same as ajout rapide)
      const [compressedFile] = await compressImages(
        [file],
        { maxWidth: 1920, maxHeight: 1920, quality: 0.8, maxSizeMB: 2 }
      )

      // Set preview with compressed file
      const preview = await readFileAsDataURL(compressedFile)
      setAiAnalysisPreview(preview)
      setAiAnalysisImage(compressedFile)

      // Automatically analyze the compressed image (which will add it to images array)
      await handleAIImageAnalysis(compressedFile)

      // CROP FLOW COMMENTED - Previous flow restored
      // Add image to AI crop queue for cropping before analysis (same as ajout rapide)
      // setAiCropQueue(prev => [...prev, file])
      // toast.success('Image ajoutée pour recadrage avant analyse')
    }
    input.click()
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
          .select('id, name, parent_id')
          .single()

        if (createCategoryError) {
          console.error('Error creating missing category:', createCategoryError)
          toast.error('Impossible de créer automatiquement la catégorie correspondante.')
          setLoading(false)
          return
        }

        if (createdCategory) {
          categoryToUse = createdCategory
          setCategories(prev => [...prev, createdCategory as {id: string, name: string, parent_id?: string | null}])
          setSelectedCategory({ 
            id: createdCategory.id, 
            name: createdCategory.name, 
            parent_id: createdCategory.parent_id || null 
          })
          setSelectedCategoryId(createdCategory.id)
          setFormData(prev => ({ ...prev, category: createdCategory.id }))
          setSkuManuallyEdited(false)
          setBarcodeManuallyEdited(false)
        }
      }

      // Upload images first - use same flow as ajout rapide
      let imageUrls: string[] = []
      if (images.length > 0) {
        try {
          imageUrls = await uploadImages()
        } catch (error) {
          console.error('Error uploading images:', error)
          toast.error('Erreur lors du téléchargement des images')
          setLoading(false)
          return
        }
      }

      // Prepare product data for insertion or update
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
        tags: cascadeTags,
        ...(isEditMode ? {} : { is_active: true, created_by: currentUser.id })
      }

      let newProduct: any

      if (isEditMode && productId) {
        // Update existing product
        const { data: updatedProducts, error } = await supabase
          .from('dd-products')
          .update(productData)
          .eq('id', productId)
          .select()
          .single()

        if (error) {
          console.error('Error updating product:', error)
          toast.error('Erreur lors de la mise à jour du produit: ' + error.message)
          setLoading(false)
          return
        }

        newProduct = updatedProducts
      } else {
        // Insert product into dd-products table
        const { data: insertedProducts, error } = await supabase
          .from('dd-products')
          .insert([productData])
          .select()

        if (error) {
          console.error('Error creating product:', error)
          toast.error('Erreur lors de la création du produit: ' + error.message)
          setLoading(false)
          return
        }

        newProduct = insertedProducts?.[0]

        if (!newProduct) {
          toast.error('Impossible de récupérer le produit créé')
          setLoading(false)
          return
        }
      }

      // Handle variants (for both create and update)
      if (variantValues.length > 0) {
        if (isEditMode && productId) {
          // Update variants: delete existing and insert new ones
          const { error: deleteVariantsError } = await supabase
            .from('dd-product-variants')
            .delete()
            .eq('product_id', productId)

          if (deleteVariantsError) {
            console.error('Error deleting old variants:', deleteVariantsError)
          }
        }
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
          toast.error((isEditMode ? 'Produit mis à jour mais ' : 'Produit créé mais ') + 'erreur lors de l\'ajout des variantes: ' + variantsError.message)
        }
      }

      toast.success(isEditMode ? "Produit mis à jour avec succès!" : "Produit créé avec succès!")
      
      // Reset form only if not in edit mode
      if (!isEditMode) {
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
        setSelectedCategoryId("")
        setSelectedTranches([])
        setSelectedFormes([])
        setSelectedBenefices([])
        setSelectedSkinTypes([])
        setSkuManuallyEdited(false)
        setBarcodeManuallyEdited(false)
        setSimilarProducts([])
        setShowSimilarProducts(false)
        setStructuredDescription("")
      }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="rapide">Ajout Rapide</TabsTrigger>
          <TabsTrigger value="intelligent">
            <Sparkles className="w-4 h-4 mr-2" />
            Ajout Intelligent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rapide" className="mt-6">
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
                  <div className="relative">
                    <Input 
                      id="name" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onFocus={() => {
                        if (similarProducts.length > 0) {
                          setShowSimilarProducts(true)
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding to allow clicking on suggestions
                        setTimeout(() => setShowSimilarProducts(false), 200)
                      }}
                      placeholder="Entrez le nom du produit" 
                      required
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                    {showSimilarProducts && similarProducts.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Produits similaires (éviter les doublons)
                          </p>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {similarProducts.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                              onMouseDown={(e) => {
                                e.preventDefault() // Prevent input blur
                                setFormData(prev => ({ ...prev, name: product.name }))
                                setShowSimilarProducts(false)
                                toast.success(`Nom du produit mis à jour: ${product.name}`)
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {product.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {product.brand && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {product.brand}
                                      </span>
                                    )}
                                    {product.sku && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        SKU: {product.sku}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {searchingSimilar && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
                      </div>
                    )}
                  </div>
                  {formData.name && formData.name.trim().split(/\s+/).filter(w => w.length > 0).length >= 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Recherche de produits similaires activée (à partir du 3ème mot)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="structured-description" className="text-gray-700 dark:text-gray-300">
                    Description Structurée (Collez les informations du produit)
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Collez ici les informations structurées du produit (Tranche Principale, Formes, Bénéfices, etc.) pour remplir automatiquement les champs ci-dessous.
                  </p>
                  <div className="flex gap-2">
                    <Textarea 
                      id="structured-description" 
                      value={structuredDescription}
                      onChange={(e) => setStructuredDescription(e.target.value)}
                      placeholder={`Exemple:
marque L'Oreal   nom   L'Oréal Triple Active Hydraterende en Beschermende DAG Crème...
2000f, 4
Tranche Principale	Soin du visage
Sous-Tranche (Formes)	Crème (Crème de jour)
Sous-Tranche (Bénéfices)	Hydratant (24H), Protecteur (UV Filter), Nourrissant (Céramide), Éclat
Type de Peau Cible	Normale à mixte
Description détaillée (pour le site internet)	La Crème de Jour Triple Active...
Description Enrichie (longue)	Découvrez le secret...`}
                      rows={8}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      onClick={() => parseStructuredDescription(structuredDescription)}
                      disabled={!structuredDescription.trim()}
                      className="self-start"
                    >
                      Extraire
                    </Button>
                  </div>
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
                                    {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                                    {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                                    {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                    <Label className="text-gray-700 dark:text-gray-300">Catégorie (sélection manuelle)</Label>
                    <Select
                      value={selectedCategoryId || formData.category || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSelectedCategoryId("")
                          setFormData(prev => ({ ...prev, category: "" }))
                        } else {
                          setSelectedCategoryId(value)
                        }
                      }}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">Aucune catégorie</SelectItem>
                        {(() => {
                          // Group categories by parent
                          const groupedCategories = new Map<string, Array<{id: string, name: string, parent_id?: string | null}>>()
                          
                          categories.forEach(category => {
                            const key = category.parent_id || 'parent'
                            if (!groupedCategories.has(key)) {
                              groupedCategories.set(key, [])
                            }
                            groupedCategories.get(key)?.push(category)
                          })
                          
                          const items: ReactNode[] = []
                          
                          // First, show parent categories
                          categories
                            .filter(cat => !cat.parent_id)
                            .forEach(category => {
                              const categoryServices = groupedCategories.get(category.id) || []
                              
                              items.push(
                                <SelectItem key={category.id} value={category.id} className="font-semibold">
                                  {category.name}
                                </SelectItem>
                              )
                              
                              // Show subcategories if they exist
                              if (categoryServices.length > 0) {
                                categoryServices.forEach(subcategory => {
                                  items.push(
                                    <SelectItem key={subcategory.id} value={subcategory.id} className="pl-8">
                                      └─ {subcategory.name}
                                    </SelectItem>
                                  )
                                })
                              }
                            })
                          
                          return items.length > 0 ? items : (
                            <div className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                              Aucune catégorie trouvée
                            </div>
                          )
                        })()}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Ou utilisez la classification ci-dessus pour sélectionner automatiquement une catégorie
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Catégorie (classification automatique)</Label>
                    <Input
                      value={matchingCategory?.name || cascadeCategoryName || ""}
                      readOnly
                      placeholder="Sélectionnez la classification pour voir la catégorie correspondante"
                      className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                    {matchingCategory && (
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Catégorie trouvée : {matchingCategory.name}
                      </p>
                    )}
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
                    <Label htmlFor="cost" className="text-gray-700 dark:text-gray-300">Coût</Label>
                    <Input 
                      id="cost" 
                      name="cost"
                      type="number" 
                      step="0.01"
                      value={formData.cost}
                      onChange={handleChange}
                      placeholder="0.00" 
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
        </TabsContent>

        <TabsContent value="intelligent" className="mt-6">
          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* AI Image Upload Section */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                      Télécharger une Image du Produit
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Téléchargez ou capturez une photo du produit. Le système analysera l'image et remplira automatiquement les champs détectables du formulaire.
                    </p>

                    {/* Image Preview */}
                    {(aiAnalysisPreview || images.length > 0) && (
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">Image du produit (sera sauvegardée):</Label>
                        <div className="relative w-full max-w-md mx-auto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={aiAnalysisPreview || (images.length > 0 ? URL.createObjectURL(images[0]) : '')}
                            alt="Produit à analyser"
                            className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                          />
                          {analyzingImage && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                              <div className="text-center text-white">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Analyse en cours...</p>
                              </div>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800"
                            onClick={() => {
                              setAiAnalysisPreview("")
                              setAiAnalysisImage(null)
                              setImages([])
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        {images.length > 0 && (
                          <p className="text-xs text-green-600 dark:text-green-400 text-center">
                            ✓ Cette image sera sauvegardée avec le produit
                          </p>
                        )}
                      </div>
                    )}

                    {/* Upload Buttons */}
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => document.getElementById('ai-image-upload')?.click()}
                        disabled={analyzingImage}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        {analyzingImage ? <ButtonLoadingSpinner /> : 'Galerie'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={handleAICameraCapture}
                        disabled={analyzingImage}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Caméra
                      </Button>
                    </div>

                    <input
                      id="ai-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAIImageUpload}
                    />
                  </CardContent>
                </Card>

                {/* Product Info - Same as Ajout Rapide */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Informations du Produit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="intelligent-name" className="text-gray-700 dark:text-gray-300">Nom du Produit *</Label>
                      <div className="relative">
                        <Input 
                          id="intelligent-name" 
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onFocus={() => {
                            if (similarProducts.length > 0) {
                              setShowSimilarProducts(true)
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowSimilarProducts(false), 200)
                          }}
                          placeholder="Sera rempli automatiquement par le système" 
                          required
                          className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                        />
                        {showSimilarProducts && similarProducts.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {similarProducts.map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, name: product.name }))
                                  setShowSimilarProducts(false)
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                {product.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intelligent-description" className="text-gray-700 dark:text-gray-300">Description</Label>
                      <Textarea 
                        id="intelligent-description" 
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Sera rempli automatiquement par le système" 
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
                                        {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                    className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                                        {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                    className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                                        {isSelected && <Check className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
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
                                    className="text-slate-600 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
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
                        <Label className="text-gray-700 dark:text-gray-300">Catégorie (sélection manuelle)</Label>
                        <Select
                          value={selectedCategoryId || formData.category || "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setSelectedCategoryId("")
                              setFormData(prev => ({ ...prev, category: "" }))
                            } else {
                              setSelectedCategoryId(value)
                            }
                          }}
                        >
                          <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                            <SelectValue placeholder="Sélectionnez une catégorie" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="none">Aucune catégorie</SelectItem>
                            {(() => {
                              const groupedCategories = new Map<string, Array<{id: string, name: string, parent_id?: string | null}>>()
                              categories.forEach(category => {
                                const key = category.parent_id || 'parent'
                                if (!groupedCategories.has(key)) {
                                  groupedCategories.set(key, [])
                                }
                                groupedCategories.get(key)?.push(category)
                              })
                              const items: ReactNode[] = []
                              categories
                                .filter(cat => !cat.parent_id)
                                .forEach(category => {
                                  const categoryServices = groupedCategories.get(category.id) || []
                                  items.push(
                                    <SelectItem key={category.id} value={category.id} className="font-semibold">
                                      {category.name}
                                    </SelectItem>
                                  )
                                  if (categoryServices.length > 0) {
                                    categoryServices.forEach(subcategory => {
                                      items.push(
                                        <SelectItem key={subcategory.id} value={subcategory.id} className="pl-8">
                                          └─ {subcategory.name}
                                        </SelectItem>
                                      )
                                    })
                                  }
                                })
                              return items.length > 0 ? items : (
                                <div className="px-2 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                  Aucune catégorie trouvée
                                </div>
                              )
                            })()}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ou utilisez la classification ci-dessus pour sélectionner automatiquement une catégorie
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-300">Catégorie (classification automatique)</Label>
                        <Input
                          value={matchingCategory?.name || cascadeCategoryName || ""}
                          readOnly
                          placeholder="Sélectionnez la classification pour voir la catégorie correspondante"
                          className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                        />
                        {matchingCategory && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Catégorie trouvée : {matchingCategory.name}
                          </p>
                        )}
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
                      <Label htmlFor="intelligent-brand" className="text-gray-700 dark:text-gray-300">Marque</Label>
                      <Input 
                        id="intelligent-brand" 
                        name="brand"
                        value={formData.brand}
                        onChange={handleChange}
                        placeholder="Sera rempli automatiquement par le système"
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
                        <Label htmlFor="intelligent-price" className="text-gray-700 dark:text-gray-300">Prix *</Label>
                        <Input 
                          id="intelligent-price" 
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
                        <Label htmlFor="intelligent-cost" className="text-gray-700 dark:text-gray-300">Coût</Label>
                        <Input 
                          id="intelligent-cost" 
                          name="cost"
                          type="number" 
                          step="0.01"
                          value={formData.cost}
                          onChange={handleChange}
                          placeholder="0.00" 
                          className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="intelligent-stock" className="text-gray-700 dark:text-gray-300">Quantité en Stock *</Label>
                        <Input 
                          id="intelligent-stock" 
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
                        <Label htmlFor="intelligent-sku" className="text-gray-700 dark:text-gray-300">SKU</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="intelligent-sku" 
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            placeholder="Sera rempli automatiquement par le système si visible"
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
                        <Label htmlFor="intelligent-barcode" className="text-gray-700 dark:text-gray-300">Code-barres</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="intelligent-barcode" 
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
                    <CardTitle className="text-gray-900 dark:text-white">Statut et Paramètres</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="intelligent-status" className="text-gray-700 dark:text-gray-300">Statut du Produit</Label>
                      <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                        <SelectTrigger id="intelligent-status" className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
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
                          id="intelligent-show_on_website" 
                          checked={formData.show_on_website}
                          onCheckedChange={(checked) => handleCheckboxChange('show_on_website', checked as boolean)}
                          className="border-gray-300 dark:border-gray-600"
                        />
                        <Label htmlFor="intelligent-show_on_website" className="text-gray-700 dark:text-gray-300">
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
                disabled={loading || analyzingImage}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading || analyzingImage}
              >
                {loading ? <ButtonLoadingSpinner /> : 'Créer le Produit'}
              </Button>
            </div>
          </form>
        </TabsContent>
      </Tabs>

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
