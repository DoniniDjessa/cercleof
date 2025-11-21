"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, User, Package, Scissors, DollarSign, Percent, Truck, Check, UserPlus, Eye, EyeOff, TrendingUp, X, Download, Printer, MessageCircle } from "lucide-react"
import html2canvas from "html2canvas"
import { supabase } from "@/lib/supabase"
import { QuickCreateClient } from "@/components/clients/quick-create-client"
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
  sku?: string
  price: number
  stock_quantity: number
  images: string[]
  category?: {
    id: string
    name: string
  }
  variants?: ProductVariant[]
}

interface Service {
  id: string
  name: string  // English DB column (primary)
  nom?: string  // French (for backward compatibility)
  price: number  // English DB column (primary)
  prix_base?: number  // French (for backward compatibility)
  duration_minutes: number  // English DB column (primary)
  duration?: number  // Alternative name
  duree?: number  // French (for backward compatibility)
  category?: {
    id: string
    name: string
  }
}

interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string | null  // Optional, can be null in base schema
  phone?: string | null  // Optional, can be null in base schema
  // Note: phones array doesn't exist in base schema, only single phone field
}

interface CartItem {
  id: string
  type: 'product' | 'service'
  productId?: string
  variantId?: string
  name: string
  price: number
  quantity: number
  total: number
  data: Product | Service
  variantData?: ProductVariant
}

interface Promotion {
  id: string
  nom: string
  code?: string
  valeur: number
  valeur_type: 'pourcentage' | 'montant'
  debut: string
  fin: string
  actif: boolean
  is_unique_usage?: boolean
  usage_count?: number
}

export default function POSPage() {
  const { user: authUser } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<Array<{id: string, name: string, parent_id?: string | null}>>([])
  const [allCategories, setAllCategories] = useState<Array<{id: string, name: string, parent_id?: string | null}>>([])
  const [allProductsForFilter, setAllProductsForFilter] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all")
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')
  
  // For receptionniste, default to services tab and don't allow products tab
  useEffect(() => {
    if (currentUserRole === 'receptionniste' && activeTab === 'products') {
      setActiveTab('services')
    }
  }, [currentUserRole, activeTab])
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'carte' | 'mobile_money'>('cash')
  const [loading, setLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showQuickCreateClient, setShowQuickCreateClient] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [checkingRole, setCheckingRole] = useState(true)
  const [variantSelection, setVariantSelection] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null })
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [variantQuantity, setVariantQuantity] = useState('1')
  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState<string>('')
  const [whatsappPhone, setWhatsappPhone] = useState<string>('')
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)

  // Product transfer (inventory movement) states
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferProduct, setTransferProduct] = useState<Product | null>(null)
  const [transferQuantity, setTransferQuantity] = useState('1')
  const [transferPerson, setTransferPerson] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferTarget, setTransferTarget] = useState<'salon' | 'owner' | 'other'>('salon')
  const [transferLoading, setTransferLoading] = useState(false)
  
  // Promotion code states
  const [promotionCode, setPromotionCode] = useState("")
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)
  const [promotionError, setPromotionError] = useState("")
  
  // Gift card states
  const [giftCardCode, setGiftCardCode] = useState("")
  const [appliedGiftCard, setAppliedGiftCard] = useState<{id: string, code: string, balance: number} | null>(null)
  const [giftCardAmount, setGiftCardAmount] = useState(0) // Amount to use from gift card
  const [giftCardError, setGiftCardError] = useState("")
  
  // Delivery states
  const [requiresDelivery, setRequiresDelivery] = useState(false)
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: "",
    city: "",
    phone: "",
    notes: ""
  })
  
  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<{
    sale: any
    items: CartItem[]
    client: Client | null
    subtotal: number
    discount: number
    giftCardAmount: number
    total: number
    paymentMethod: 'cash' | 'carte' | 'mobile_money'
    date: Date
    user: string
  } | null>(null)
  
  // Daily sales amount states
  const [showDailySalesModal, setShowDailySalesModal] = useState(false)
  const [dailySalesAmount, setDailySalesAmount] = useState(0)
  const [allUsersSales, setAllUsersSales] = useState<Array<{user_name: string, amount: number}>>([])
  const [loadingDailySales, setLoadingDailySales] = useState(false)

  useEffect(() => {
    fetchData()
    fetchCurrentUserRole()
  }, [authUser])
  
  // Refresh daily sales after successful sale
  useEffect(() => {
    if (!loading && showDailySalesModal) {
      fetchDailySales()
    }
  }, [loading, showDailySalesModal])

  // Listen for voice navigation commands on POS page
  useEffect(() => {
    const handlePOSSelectClient = async (event: Event) => {
      const customEvent = event as CustomEvent
      const clientName = customEvent.detail?.name
      if (!clientName) return

      try {
        const nameParts = clientName.trim().split(/\s+/)
        let query = supabase
          .from('dd-clients')
          .select('id, first_name, last_name, email, phone')
          .eq('is_active', true)

        if (nameParts.length === 1) {
          query = query.or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
        } else {
          query = query
            .ilike('first_name', `%${nameParts[0]}%`)
            .ilike('last_name', `%${nameParts.slice(1).join(' ')}%`)
        }

        const { data: clients, error } = await query.limit(5)

        if (error) throw error

        if (clients && clients.length > 0) {
          const client = clients[0]
          setSelectedClient({
            id: client.id,
            first_name: client.first_name,
            last_name: client.last_name,
            email: client.email || null,
            phone: client.phone || null,
          })
          setClientSearchTerm(`${client.first_name} ${client.last_name}`)
          toast.success(`Client sélectionné: ${client.first_name} ${client.last_name}`)
        } else {
          toast.error(`Aucun client trouvé pour: ${clientName}`)
        }
      } catch (error) {
        console.error('Error searching client:', error)
        toast.error('Erreur lors de la recherche du client')
      }
    }

    const handlePOSAddProduct = async (event: Event) => {
      const customEvent = event as CustomEvent
      const productName = customEvent.detail?.name
      if (!productName) return

      try {
        const { data: products, error } = await supabase
          .from('dd-products')
          .select('*, variants:"dd-product-variants"(id, product_id, name, sku, quantity)')
          .ilike('name', `%${productName}%`)
          .eq('is_active', true)
          .eq('status', 'active')
          .limit(5)

        if (error) throw error

        if (products && products.length > 0) {
          const product = products[0] as Product
          // Dispatch custom event that will be handled by the POS page's addToCart
          window.dispatchEvent(new CustomEvent('pos-voice-add-product', { detail: { product } }))
          toast.success(`Produit ajouté: ${product.name}`)
        } else {
          toast.error(`Aucun produit trouvé pour: ${productName}`)
        }
      } catch (error) {
        console.error('Error searching product:', error)
        toast.error('Erreur lors de la recherche du produit')
      }
    }

    window.addEventListener('pos-select-client', handlePOSSelectClient)
    window.addEventListener('pos-add-product', handlePOSAddProduct)

    return () => {
      window.removeEventListener('pos-select-client', handlePOSSelectClient)
      window.removeEventListener('pos-add-product', handlePOSAddProduct)
    }
  }, []) // Empty deps - handlers are stable


  const fetchCurrentUserRole = async () => {
    try {
      setCheckingRole(true)
      if (!authUser?.id) {
        setCurrentUserRole("")
        setCheckingRole(false)
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setCurrentUserRole("")
        setCheckingRole(false)
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || "")
    } catch (error) {
      console.error('Error fetching user role:', error)
      setCurrentUserRole("")
    } finally {
      setCheckingRole(false)
    }
  }

  // Check if user can manage discounts (admin, manager, superadmin)
  const canManageDiscounts = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'
  
  // Check if user can edit prices in cart (caissiere and admins only, NOT receptionniste)
  // Price edits only affect the current cart/sale, NOT the database product price
  const canEditPrices = currentUserRole === 'admin' || currentUserRole === 'caissiere' || currentUserRole === 'superadmin'
  
  // Check if user is receptionniste (has more restrictions than caissiere)
  const isReceptionniste = currentUserRole === 'receptionniste'
  // Check if user is caissiere (works in boutique, shouldn't see services)
  const isCaissiere = currentUserRole === 'caissiere'

  const fetchDailySales = async () => {
    try {
      setLoadingDailySales(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayEnd = tomorrow.toISOString()
      
      // Get current user's ID from dd-users
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      
      const { data: currentUser } = await supabase
        .from('dd-users')
        .select('id, pseudo, email')
        .eq('auth_user_id', authUser.id)
        .single()
      
      if (!currentUser) return
      
      const isAdminOrManager = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'
      
      if (isAdminOrManager) {
        // Fetch all sales with user information
        const { data: sales, error } = await supabase
          .from('dd-ventes')
        .select(`
          total_net,
          user:"dd-users"!user_id(id, pseudo, email, first_name, last_name)
        `)
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd)
          .eq('status', 'paye')
        
        if (error) throw error
        
        // Group by user
        const userSalesMap = new Map<string, { user_name: string, amount: number }>()
        let total = 0
        
        sales?.forEach((sale: any) => {
          const user = sale.user
          const userName = user?.pseudo || user?.email || user?.first_name || 'Utilisateur inconnu'
          const amount = sale.total_net || 0
          total += amount
          
          if (userSalesMap.has(userName)) {
            const existing = userSalesMap.get(userName)!
            userSalesMap.set(userName, { user_name: userName, amount: existing.amount + amount })
          } else {
            userSalesMap.set(userName, { user_name: userName, amount })
          }
        })
        
        setDailySalesAmount(total)
        setAllUsersSales(Array.from(userSalesMap.values()).sort((a, b) => b.amount - a.amount))
      } else {
        // Fetch only current user's sales
        const { data: sales, error } = await supabase
          .from('dd-ventes')
          .select('total_net')
          .gte('created_at', todayStart)
          .lt('created_at', todayEnd)
          .eq('status', 'paye')
          .eq('user_id', currentUser.id)
        
        if (error) throw error
        
        const total = sales?.reduce((sum, sale) => sum + (sale.total_net || 0), 0) || 0
        setDailySalesAmount(total)
        setAllUsersSales([])
      }
    } catch (error) {
      console.error('Error fetching daily sales:', error)
    } finally {
      setLoadingDailySales(false)
    }
  }

  const fetchClients = async () => {
    try {
      // Fetch clients (only fields that exist in base table)
      const { data: clientsData, error: clientsError } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, email, phone')
        .eq('is_active', true)
        .limit(100)

      if (clientsError) throw clientsError
      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Erreur lors du chargement des clients')
    }
  }

  const fetchData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      
      // Fetch products - limit to 30 initially for performance (when no search/filter)
      const { data: productsData, error: productsError } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:"dd-categories"(id, name),
          variants:"dd-product-variants"(
            id,
            product_id,
            name,
            sku,
            quantity
          )
        `)
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(30)
        .order('created_at', { ascending: false })

      if (productsError) throw productsError

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:"dd-categories"(id, name)
        `)
        .eq('is_active', true)

      if (servicesError) throw servicesError

      // Fetch clients
      await fetchClients()

      // Fetch categories with parent information
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('is_active', true)
        .order('name')

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      }

      console.log('POS Data fetched:', {
        productsCount: productsData?.length || 0,
        servicesCount: servicesData?.length || 0,
        clientsCount: clients.length || 0,
        categoriesCount: categoriesData?.length || 0
      })

      setProducts((productsData || []) as unknown as Product[])
      setServices((servicesData || []) as unknown as Service[])
      setCategories(categoriesData || [])
      setAllCategories(categoriesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    if (type === 'product') {
      const product = item as Product
      if (product.variants && product.variants.length > 0) {
        const firstAvailableVariant = product.variants.find(v => v.quantity > 0) || product.variants[0]
        setVariantSelection({ open: true, product })
        setSelectedVariantId(firstAvailableVariant?.id || null)
        setVariantQuantity('1')
        return
      }
    }

    const itemKey = item.id
    const existingItem = cart.find(cartItem => cartItem.id === itemKey && cartItem.type === type)
    
    if (existingItem) {
      updateCartQuantity(existingItem.id, existingItem.type, existingItem.quantity + 1)
    } else {
      const service = type === 'service' ? item as Service : null
      const product = type === 'product' ? item as Product : null
      const cartItem: CartItem = {
        id: itemKey,
        type,
        productId: type === 'product' ? product!.id : undefined,
        name: type === 'product' ? product!.name : (service!.name || service!.nom || 'Service'),
        price: type === 'product' ? product!.price : (service!.price || service!.prix_base || 0),
        quantity: 1,
        total: type === 'product' ? product!.price : (service!.price || service!.prix_base || 0),
        data: item
      }
      setCart([...cart, cartItem])
    }
  }

  const closeVariantSelection = () => {
    setVariantSelection({ open: false, product: null })
    setSelectedVariantId(null)
    setVariantQuantity('1')
  }

  const addVariantToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    if (quantity <= 0) {
      toast.error('La quantité doit être supérieure à 0')
      return
    }

    if (variant.quantity === 0) {
      toast.error('Cette variante est en rupture de stock')
      return
    }

    if (quantity > variant.quantity) {
      toast.error(`Stock insuffisant pour cette variante (max ${variant.quantity})`)
      return
    }

    const existingItem = cart.find(cartItem => cartItem.type === 'product' && cartItem.variantId === variant.id)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity
      if (newQuantity > variant.quantity) {
        toast.error(`Stock insuffisant pour cette variante (max ${variant.quantity})`)
        return
      }
      updateCartQuantity(existingItem.id, existingItem.type, newQuantity)
    } else {
      const cartItem: CartItem = {
        id: variant.id,
        type: 'product',
        productId: product.id,
        variantId: variant.id,
        name: `${product.name} • ${variant.name}`,
        price: product.price,
        quantity,
        total: product.price * quantity,
        data: product,
        variantData: variant
      }
      setCart([...cart, cartItem])
    }

    closeVariantSelection()
  }

  const updateCartQuantity = (id: string, type: 'product' | 'service', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, type)
      return
    }

    const cartItem = cart.find(item => item.id === id && item.type === type)

    if (!cartItem) {
      return
    }

    if (type === 'product') {
      const product = cartItem.data as Product

      if (cartItem.variantId) {
        const variant = product.variants?.find(v => v.id === cartItem.variantId) || cartItem.variantData
        const maxQuantity = variant?.quantity ?? 0

        if (quantity > maxQuantity) {
          toast.error(`Stock insuffisant pour cette variante (max ${maxQuantity})`)
          return
        }
      } else {
        if (quantity > product.stock_quantity) {
          toast.error(`Stock insuffisant pour ce produit (max ${product.stock_quantity})`)
          return
        }
      }
    }

    setCart(cart.map(item => 
      item.id === id && item.type === type 
        ? { ...item, quantity, total: item.price * quantity }
        : item
    ))
  }

  const removeFromCart = (id: string, type: 'product' | 'service') => {
    setCart(cart.filter(item => !(item.id === id && item.type === type)))
  }

  // Handle voice-add-product event from voice navigation
  useEffect(() => {
    const handleVoiceAddProduct = (event: CustomEvent) => {
      const product = event.detail.product as Product
      if (product) {
        addToCart(product, 'product')
      }
    }

    window.addEventListener('pos-voice-add-product', handleVoiceAddProduct as EventListener)

    return () => {
      window.removeEventListener('pos-voice-add-product', handleVoiceAddProduct as EventListener)
    }
  }, [addToCart])
  
  // Update cart item price - only affects the cart, NOT the database product price
  // This allows caissieres and admins to adjust prices for specific sales without changing the base product price
  const updateCartItemPrice = (id: string, type: 'product' | 'service', newPrice: number) => {
    setCart(cart.map(item => 
      item.id === id && item.type === type
        ? { ...item, price: newPrice, total: newPrice * item.quantity }
        : item
    ))
  }
  
  const handlePriceEdit = (item: CartItem) => {
    setEditingPriceItemId(`${item.id}-${item.type}`)
    setEditingPriceValue(item.price.toString())
  }
  
  const handlePriceSave = (item: CartItem) => {
    const newPrice = parseFloat(editingPriceValue) || 0
    if (newPrice >= 0) {
      updateCartItemPrice(item.id, item.type, newPrice)
      setEditingPriceItemId(null)
      setEditingPriceValue('')
    } else {
      toast.error('Le prix doit être positif')
    }
  }
  
  const handlePriceCancel = () => {
    setEditingPriceItemId(null)
    setEditingPriceValue('')
  }
  
  // Helper function to generate receipt HTML
  const generateReceiptHTML = (
    receiptData: {
      sale: any
      items: CartItem[]
      client: Client | null
      subtotal: number
      discount: number
      giftCardAmount: number
      total: number
      paymentMethod: 'cash' | 'carte' | 'mobile_money'
      date: Date
      user: string
    },
    escapeHtml: (text: string) => string,
    formatDate: string,
    formatTime: string,
    saleId: string,
    paymentMethodText: string
  ) => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu de Vente</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 13px;
      line-height: 1.5;
      padding: 15px 12px;
      max-width: 80mm;
      margin: 0 auto;
      color: #1a1a1a;
      background: #ffffff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 15px; 
      padding-bottom: 12px; 
      border-bottom: 2px solid #000000; 
    }
    .header h1 { 
      font-size: 20px; 
      font-weight: 700; 
      margin-bottom: 6px; 
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #000000;
      font-family: 'Arial Black', 'Arial', sans-serif;
    }
    .header .subtitle {
      font-size: 11px;
      color: #000000;
      margin-bottom: 4px;
      font-weight: 500;
    }
    .header .date-time {
      font-size: 10px;
      color: #000000;
      margin-top: 4px;
      font-weight: 500;
    }
    .section { 
      margin-bottom: 12px; 
      padding-bottom: 10px; 
      border-bottom: 1px dashed #ddd; 
    }
    .section-title {
      font-weight: 600;
      font-size: 11px;
      color: #000000;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section p {
      margin-bottom: 3px;
      font-size: 12px;
    }
    .item { 
      margin-bottom: 8px; 
      padding: 6px 0;
      border-bottom: 1px dotted #eee;
    }
    .item:last-child {
      border-bottom: none;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3px;
    }
    .item-name { 
      font-weight: 600; 
      font-size: 13px;
      margin-bottom: 3px; 
      color: #1a1a1a;
      flex: 1;
    }
    .item-details { 
      font-size: 11px; 
      color: #000000;
      margin-left: 8px;
      font-weight: 500;
    }
    .item-total {
      text-align: right;
      font-weight: 600;
      font-size: 13px;
      color: #1a1a1a;
      min-width: 60px;
    }
    .totals { 
      margin-top: 12px; 
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      font-size: 12px; 
      margin-bottom: 4px; 
      color: #000000;
      font-weight: 500;
    }
    .total-final { 
      font-weight: 700; 
      font-size: 16px; 
      margin-top: 8px; 
      padding-top: 8px; 
      border-top: 2px solid #000000; 
      color: #1a1a1a;
    }
    .footer { 
      text-align: center; 
      margin-top: 15px; 
      padding-top: 12px; 
      border-top: 1px dashed #ccc; 
      font-size: 10px; 
      color: #000000; 
      font-weight: 500;
    }
    .footer .thank-you {
      font-weight: 600;
      color: #000000;
      margin-bottom: 4px;
    }
    @media print {
      body { 
        padding: 10px; 
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>THE CERCLE OF BEAUTY</h1>
    <p class="subtitle">Institut de Beauté</p>
    <p class="date-time">${escapeHtml(formatDate)} • ${escapeHtml(formatTime)}</p>
  </div>
  <div class="section">
    <p class="section-title">Référence</p>
    <p style="font-weight: 600;">#${escapeHtml(saleId)}</p>
  </div>
  ${receiptData.client ? `
    <div class="section">
      <p class="section-title">Client</p>
      <p style="font-weight: 600;">${escapeHtml(receiptData.client.first_name)} ${escapeHtml(receiptData.client.last_name)}</p>
      ${receiptData.client.phone ? `<p style="font-size: 11px; color: #000000; font-weight: 500;">📞 ${escapeHtml(receiptData.client.phone)}</p>` : ''}
    </div>
  ` : ''}
  <div class="section">
    <p class="section-title">Articles</p>
    ${receiptData.items.map(item => `
      <div class="item">
        <div class="item-row">
          <div style="flex: 1;">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="item-details">${item.quantity} × ${item.price.toFixed(0)}f</div>
          </div>
          <div class="item-total">${item.total.toFixed(0)}f</div>
        </div>
      </div>
    `).join('')}
  </div>
  <div class="totals">
    <div class="total-row">
      <span>Sous-total</span>
      <span>${receiptData.subtotal.toFixed(0)}f</span>
    </div>
    ${receiptData.discount > 0 ? `
      <div class="total-row" style="color: #000000;">
        <span>Réduction</span>
        <span>-${receiptData.discount.toFixed(0)}f</span>
      </div>
    ` : ''}
    ${receiptData.giftCardAmount > 0 ? `
      <div class="total-row" style="color: #000000;">
        <span>Carte Cadeau</span>
        <span>-${receiptData.giftCardAmount.toFixed(0)}f</span>
      </div>
    ` : ''}
    <div class="total-row total-final">
      <span>TOTAL</span>
      <span>${receiptData.total.toFixed(0)}f</span>
    </div>
  </div>
  <div class="section">
    <p class="section-title">Paiement</p>
    <p style="font-weight: 600; margin-bottom: 4px;">${escapeHtml(paymentMethodText)}</p>
    <p style="font-size: 11px; color: #000000; font-weight: 500;">Vendu par: ${escapeHtml(receiptData.user)}</p>
  </div>
  <div class="footer">
    <p class="thank-you">Merci de votre visite!</p>
    <p style="margin-top: 6px;">THE CERCLE OF BEAUTY - Institut de Beauté</p>
  </div>
</body>
</html>`
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const applyPromotionCode = async () => {
    if (!promotionCode.trim()) {
      setPromotionError("Veuillez entrer un code promotion")
      return
    }

    try {
      const now = new Date().toISOString()
      const { data: promotion, error } = await supabase
        .from('dd-promotions')
        .select('*')
        .eq('code', promotionCode.toUpperCase().trim())
        .eq('actif', true)
        .lte('debut', now)
        .gte('fin', now)
        .single()

      if (error || !promotion) {
        setPromotionError("Code promotion invalide ou expiré")
        setAppliedPromotion(null)
        return
      }

      // Check if code is unique usage and already used by this client
      if (promotion.is_unique_usage && selectedClient) {
        const { data: existingUsage } = await supabase
          .from('dd-ventes')
          .select('id')
          .eq('client_id', selectedClient.id)
          .eq('promotion_id', promotion.id)
          .limit(1)
          .single()

        if (existingUsage) {
          setPromotionError("Ce code a déjà été utilisé par ce client")
          setAppliedPromotion(null)
          return
        }
      }

      setAppliedPromotion(promotion)
      setPromotionError("")
      setDiscount(promotion.valeur)
      setDiscountType(promotion.valeur_type === 'pourcentage' ? 'percentage' : 'amount')
      toast.success(`Promotion "${promotion.nom}" appliquée!`)
    } catch (error) {
      console.error('Error applying promotion:', error)
      setPromotionError("Erreur lors de l'application du code")
      setAppliedPromotion(null)
    }
  }

  const removePromotion = () => {
    setAppliedPromotion(null)
    setPromotionCode("")
    setPromotionError("")
    setDiscount(0)
    setDiscountType('percentage')
  }

  const applyGiftCard = async () => {
    if (!giftCardCode.trim()) {
      setGiftCardError("Veuillez entrer un code de carte cadeau")
      return
    }

    try {
      const { data: giftCard, error } = await supabase
        .from('dd-gift-cards')
        .select('id, code, current_balance, status, expiry_date')
        .eq('code', giftCardCode.toUpperCase().trim())
        .eq('status', 'active')
        .single()

      if (error || !giftCard) {
        setGiftCardError("Carte cadeau invalide ou expirée")
        setAppliedGiftCard(null)
        return
      }

      // Check expiry date
      if (giftCard.expiry_date && new Date(giftCard.expiry_date) < new Date()) {
        setGiftCardError("Cette carte cadeau a expiré")
        setAppliedGiftCard(null)
        return
      }

      if (giftCard.current_balance <= 0) {
        setGiftCardError("Cette carte cadeau n'a plus de solde")
        setAppliedGiftCard(null)
        return
      }

      setAppliedGiftCard({
        id: giftCard.id,
        code: giftCard.code,
        balance: giftCard.current_balance
      })
      setGiftCardError("")
      // Set initial amount to use (can be adjusted)
      const subtotal = calculateSubtotal()
      const discountAmount = calculateDiscountAmount()
      const totalAfterDiscount = subtotal - discountAmount
      setGiftCardAmount(Math.min(giftCard.current_balance, totalAfterDiscount))
      toast.success(`Carte cadeau "${giftCard.code}" appliquée! Solde: ${giftCard.current_balance.toFixed(0)}f`)
    } catch (error) {
      console.error('Error applying gift card:', error)
      setGiftCardError("Erreur lors de l'application de la carte cadeau")
      setAppliedGiftCard(null)
    }
  }

  const removeGiftCard = () => {
    setAppliedGiftCard(null)
    setGiftCardCode("")
    setGiftCardAmount(0)
    setGiftCardError("")
  }

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal()
    
    // If promotion is applied, use it
    if (appliedPromotion) {
      if (appliedPromotion.valeur_type === 'pourcentage') {
        return (subtotal * appliedPromotion.valeur) / 100
      } else {
        return Math.min(appliedPromotion.valeur, subtotal)
      }
    }
    
    // Otherwise use manual discount (only if user has permission)
    if (canManageDiscounts) {
      if (discountType === 'percentage') {
        return (subtotal * discount) / 100
      }
      return Math.min(discount, subtotal)
    }
    
    // No discount if user doesn't have permission
    return 0
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discountAmount = calculateDiscountAmount()
    const afterDiscount = subtotal - discountAmount
    const giftCardAmountToUse = appliedGiftCard ? Math.min(giftCardAmount, afterDiscount, appliedGiftCard.balance) : 0
    return Math.max(0, afterDiscount - giftCardAmountToUse)
  }

  const handleCreateTransfer = async () => {
    if (!transferProduct) return

    const quantity = parseInt(transferQuantity || '0', 10)
    if (!quantity || quantity <= 0) {
      toast.error('La quantité doit être supérieure à 0')
      return
    }

    if (quantity > transferProduct.stock_quantity) {
      toast.error(`Stock insuffisant. Stock disponible: ${transferProduct.stock_quantity}`)
      return
    }

    try {
      setTransferLoading(true)

      // Get current user (taken_by)
      const { data: { user: authUserData } } = await supabase.auth.getUser()
      if (!authUserData) {
        toast.error('Utilisateur non authentifié')
        return
      }

      const { data: currentUser, error: userError } = await supabase
        .from('dd-users')
        .select('id, first_name, last_name')
        .eq('auth_user_id', authUserData.id)
        .single()

      if (userError || !currentUser) {
        toast.error('Impossible de récupérer l\'utilisateur courant')
        return
      }

      const fullReason = `Pris par: ${transferPerson || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'N/A'}\nDestination: ${transferTarget}\nRaison: ${transferReason || 'N/A'}`

      // Create inventory movement (transfer out)
      const { error: movementError } = await supabase
        .from('dd-inventory_movements')
        .insert([{
          product_id: transferProduct.id,
          quantity,
          movement_type: 'out',
          reason: fullReason,
          target_location: transferTarget,
          taken_by: currentUser.id,
          reference_type: 'transfer'
        }])

      if (movementError) {
        console.error('Error creating inventory movement:', movementError)
        toast.error('Erreur lors de la création du transfert')
        return
      }

      // Update product stock
      const newStock = Math.max(0, transferProduct.stock_quantity - quantity)
      const { error: stockError } = await supabase
        .from('dd-products')
        .update({ stock_quantity: newStock })
        .eq('id', transferProduct.id)

      if (stockError) {
        console.error('Error updating product stock after transfer:', stockError)
        toast.error('Transfert créé mais erreur lors de la mise à jour du stock')
      } else {
        // Update local products state
        setProducts(prev =>
          prev.map(p => p.id === transferProduct.id ? { ...p, stock_quantity: newStock } : p)
        )
        toast.success('Transfert enregistré et stock mis à jour')
      }

      setShowTransferModal(false)
      setTransferProduct(null)
    } catch (error) {
      console.error('Error during transfer:', error)
      toast.error('Erreur lors de la création du transfert')
    } finally {
      setTransferLoading(false)
    }
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide')
      return
    }

    try {
      setLoading(true)

      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        toast.error('Utilisateur non authentifié')
        return
      }

      const { data: currentUser, error: userError } = await supabase
        .from('dd-users')
        .select('id, pseudo, email')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError) {
        toast.error('Erreur lors de la récupération de l\'utilisateur')
        return
      }

      const userDisplayName = currentUser.pseudo || currentUser.email

      const subtotal = calculateSubtotal()
      const discountAmount = calculateDiscountAmount()
      const giftCardAmountToUse = appliedGiftCard ? Math.min(giftCardAmount, subtotal - discountAmount, appliedGiftCard.balance) : 0
      const total = calculateTotal()

      // Create sale
      const saleData: any = {
        client_id: selectedClient?.id || null,
        user_id: currentUser.id,
        type: cart.some(item => item.type === 'product') && cart.some(item => item.type === 'service') 
          ? 'mixte' 
          : cart[0].type === 'product' ? 'produit' : 'service',
        total_brut: subtotal,
        reduction: discountAmount,
        reduction_pourcentage: appliedPromotion 
          ? (appliedPromotion.valeur_type === 'pourcentage' ? appliedPromotion.valeur : 0)
          : (discountType === 'percentage' ? discount : 0),
        total_net: total,
        methode_paiement: paymentMethod,
        status: 'paye',
        source: 'sur_place',
        created_by: currentUser.id
      }

      // Add promotion_id if promotion is applied (if column exists in database)
      // Note: This requires a migration to add promotion_id column to dd-ventes table
      // If the column doesn't exist, this will be ignored
      if (appliedPromotion) {
        try {
          saleData.promotion_id = appliedPromotion.id
        } catch (e) {
          // Column might not exist, ignore
          console.log('promotion_id column might not exist in dd-ventes table')
        }
      }

      const { data: sale, error: saleError } = await supabase
        .from('dd-ventes')
        .insert([saleData])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        vente_id: sale.id,
        product_id: item.type === 'product' ? (item.productId || item.id) : null,
        service_id: item.type === 'service' ? item.id : null,
        variant_id: item.type === 'product' ? item.variantId || null : null,
        quantite: item.quantity,
        prix_unitaire: item.price,
        total: item.total
      }))

      const { data: createdSaleItems, error: itemsError } = await supabase
        .from('dd-ventes-items')
        .insert(saleItems)
        .select()

      if (itemsError) throw itemsError

      // Create salon entries for services sold
      const serviceItems = cart.filter(item => item.type === 'service')
      let salonEntries: any[] = []
      if (serviceItems.length > 0 && createdSaleItems) {
        salonEntries = serviceItems.map((item, index) => {
          const serviceItem = createdSaleItems.find(si => si.service_id === item.id)
          const service = item.data as Service
          return {
            vente_id: sale.id,
            vente_item_id: serviceItem?.id || null,
            client_id: selectedClient?.id || null,
            service_id: item.id,
            service_name: item.name,
            service_price: item.price,
            statut: 'en_attente',
            created_by: currentUser.id
          }
        })

        const { data: createdSalonEntries, error: salonError } = await supabase
          .from('dd-salon')
          .insert(salonEntries)
          .select()

        if (salonError) {
          console.error('Error creating salon entries:', salonError)
          // Don't throw - salon entry failure shouldn't prevent the sale
        } else if (createdSalonEntries) {
          salonEntries = createdSalonEntries
        }
      }

      // Update product stock if needed
      for (const item of cart) {
        if (item.type === 'product') {
          const product = item.data as Product
          const productId = item.productId || product.id
          const { error: stockError } = await supabase
            .from('dd-products')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', productId)

          if (stockError) {
            console.error('Error updating product stock:', stockError)
          }

          if (item.variantId) {
            const variant = product.variants?.find(v => v.id === item.variantId) || item.variantData
            const currentVariantQuantity = variant?.quantity ?? 0
            const newVariantQuantity = Math.max(currentVariantQuantity - item.quantity, 0)

            const { error: variantError } = await supabase
              .from('dd-product-variants')
              .update({ quantity: newVariantQuantity })
              .eq('id', item.variantId)

            if (variantError) {
              console.error('Error updating variant stock:', variantError)
            }
          }
        }
      }

      // Update promotion usage count if promotion is applied
      if (appliedPromotion) {
        const newUsageCount = (appliedPromotion.usage_count || 0) + 1
        const { error: promoError } = await supabase
          .from('dd-promotions')
          .update({ usage_count: newUsageCount })
          .eq('id', appliedPromotion.id)

        if (promoError) {
          console.error('Error updating promotion usage:', promoError)
        }
      }

      // Create delivery entry if delivery is required
      if (requiresDelivery && deliveryDetails.address) {
        // Build full address with city
        const fullAddress = deliveryDetails.city 
          ? `${deliveryDetails.address}, ${deliveryDetails.city}`
          : deliveryDetails.address
        
        // Build note with any additional notes (phone is stored separately in contact_phone)
        const deliveryNote = deliveryDetails.notes || null
        
        const deliveryData: any = {
          vente_id: sale.id,
          client_id: selectedClient?.id || null,
          adresse: fullAddress,
          statut: 'en_preparation',
          mode: 'interne', // Default to internal delivery
          frais: 0, // Default to 0, can be updated later
          contact_phone: deliveryDetails.phone || null,
          note: deliveryNote,
          created_by: currentUser.id
        }
        
        const { data: createdDelivery, error: deliveryError } = await supabase
          .from('dd-livraisons')
          .insert([deliveryData])
          .select()
          .single()

        if (deliveryError) {
          console.error('Error creating delivery:', deliveryError)
          console.error('Delivery data attempted:', deliveryData)
          toast.error(`Erreur lors de la création de la livraison: ${deliveryError.message}`)
        } else {
          console.log('Delivery created successfully:', createdDelivery)
          toast.success('Livraison créée avec succès!')
        }
      }

      // Create revenue entry
      const { error: revenueError } = await supabase
        .from('dd-revenues')
        .insert([{
          type: 'vente',
          source_id: sale.id,
          montant: total,
          note: `Vente ${sale.type} - ${cart.length} article(s)`,
          enregistre_par: currentUser.id
        }])

      if (revenueError) {
        console.error('Error creating revenue:', revenueError)
      }

      // Format action description based on sale type and client
      const now = new Date()
      const saleDate = new Date(sale.date || now.toISOString())
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const saleDay = new Date(saleDate)
      saleDay.setHours(0, 0, 0, 0)

      let timePrefix = ''
      if (saleDay.getTime() === today.getTime()) {
        // Today
        timePrefix = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      } else if (saleDay.getTime() === yesterday.getTime()) {
        // Yesterday
        timePrefix = `hier:${saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
      } else {
        // Older date
        timePrefix = saleDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }

      // Get product/service names (serviceItems already defined above)
      const productItems = cart.filter(item => item.type === 'product')
      
      let productNames = productItems.map(item => item.name).join(' et ')
      let serviceNames = serviceItems.map(item => item.name).join(' et ')

      let actionDescription = ''
      let actionType = 'vente'
      
      if (serviceItems.length > 0 && serviceItems.length === cart.length) {
        // Only services - create action for service creation
        actionType = 'ajout'
        actionDescription = `Service créé par ${userDisplayName}`
        
        // Create action for service creation (pointing to salon entry)
        if (salonEntries && salonEntries.length > 0) {
          const { error: serviceActionError } = await supabase
            .from('dd-actions')
            .insert([{
              user_id: currentUser.id,
              type: 'ajout',
              cible_table: 'dd-salon',
              cible_id: salonEntries[0].id,
              description: actionDescription
            }])
          
          if (serviceActionError) {
            console.error('Error creating service action:', serviceActionError)
          }
        }
        
        // Also create a separate action for the sale
        const { error: saleActionError } = await supabase
          .from('dd-actions')
          .insert([{
            user_id: currentUser.id,
            type: 'vente',
            cible_table: 'dd-ventes',
            cible_id: sale.id,
            description: serviceItems.length === 1 
              ? `${timePrefix}: ${selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name} a acheté ${serviceNames}` : `${userDisplayName} a vendu ${serviceNames}`}, montant ${total.toFixed(0)}f vendu par ${userDisplayName}`
              : `${timePrefix}: ${selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name} a acheté ${serviceNames}` : `${userDisplayName} a vendu ${serviceNames}`}, montant ${total.toFixed(0)}f vendu par ${userDisplayName}`
          }])
        
        if (saleActionError) {
          console.error('Error creating sale action:', saleActionError)
        }
      } else if (productItems.length > 0) {
        // Products or mixed
        if (selectedClient) {
          actionDescription = `${timePrefix}: ${selectedClient.first_name} ${selectedClient.last_name} a acheté ${productNames}${serviceNames ? ' et ' + serviceNames : ''}, montant ${total.toFixed(0)}f vendu par ${userDisplayName}`
        } else {
          actionDescription = `${timePrefix}: ${userDisplayName} a vendu ${productNames}${serviceNames ? ' et ' + serviceNames : ''}, montant ${total.toFixed(0)}f`
        }
      } else {
        // Fallback
        actionDescription = `${timePrefix}: Vente effectuée: ${total.toFixed(0)}f - ${cart.length} article(s) - vendu par ${userDisplayName}`
      }

      // Create action entry (audit trail) - only if not already created for services
      if (!(serviceItems.length > 0 && serviceItems.length === cart.length)) {
        const { error: actionError } = await supabase
          .from('dd-actions')
          .insert([{
            user_id: currentUser.id,
            type: actionType,
            cible_table: serviceItems.length > 0 ? 'dd-salon' : 'dd-ventes',
            cible_id: serviceItems.length > 0 ? (salonEntries && salonEntries.length > 0 ? salonEntries[0].id : null) : sale.id,
            description: actionDescription
          }])

        if (actionError) {
          console.error('Error creating action:', actionError)
        }
      }

      // Create notification for client if client is selected (only for products, not services)
      if (selectedClient && productItems.length > 0) {
        const { error: notifError } = await supabase
          .from('dd-notifications')
          .insert([{
            type: 'vente',
            message: `${timePrefix}: ${selectedClient.first_name} ${selectedClient.last_name} a acheté ${productNames}${serviceNames ? ' et ' + serviceNames : ''}, montant ${total.toFixed(0)}f vendu par ${userDisplayName}`,
            cible_type: 'client',
            cible_id: selectedClient.id,
            created_by: currentUser.id
          }])

        if (notifError) {
          console.error('Error creating notification:', notifError)
        }
      }

      // Update gift card balance if gift card was used
      if (appliedGiftCard && giftCardAmountToUse > 0) {
        const { data: currentGiftCard } = await supabase
          .from('dd-gift-cards')
          .select('current_balance')
          .eq('id', appliedGiftCard.id)
          .single()

        if (currentGiftCard) {
          const newBalance = currentGiftCard.current_balance - giftCardAmountToUse
          const newStatus = newBalance <= 0 ? 'used' : 'active'

          // Update gift card balance
          const { error: giftCardUpdateError } = await supabase
            .from('dd-gift-cards')
            .update({
              current_balance: newBalance,
              status: newStatus
            })
            .eq('id', appliedGiftCard.id)

          if (giftCardUpdateError) {
            console.error('Error updating gift card:', giftCardUpdateError)
          } else {
            // Create gift card transaction record
            const { error: transactionError } = await supabase
              .from('dd-gift-card-transactions')
              .insert([{
                gift_card_id: appliedGiftCard.id,
                vente_id: sale.id,
                amount: -giftCardAmountToUse, // Negative for usage
                balance_before: currentGiftCard.current_balance,
                balance_after: newBalance,
                transaction_type: 'usage',
                notes: `Utilisée pour la vente ${sale.id}`,
                created_by: currentUser.id
              }])

            if (transactionError) {
              console.error('Error creating gift card transaction:', transactionError)
            }
          }
        }
      }

      // Update client loyalty points and last visit if client is selected
      if (selectedClient) {
        const pointsEarned = Math.floor(total / 1000) // 1 point per 1000f
        
        // Update loyalty card
        // Fetch existing loyalty points from dd-cartes-fidelite table
        const { data: existingLoyalty } = await supabase
          .from('dd-cartes-fidelite')
          .select('points')
          .eq('client_id', selectedClient.id)
          .single()
        
        const currentPoints = existingLoyalty?.points || 0
        
        const { error: loyaltyError } = await supabase
          .from('dd-cartes-fidelite')
          .upsert([{
            client_id: selectedClient.id,
            points: currentPoints + pointsEarned,
            statut: 'active'
          }], {
            onConflict: 'client_id'
          })

        if (loyaltyError) {
          console.error('Error updating loyalty points:', loyaltyError)
        }

        // Update client last visit and total spent
        const { data: clientData } = await supabase
          .from('dd-clients')
          .select('total_spent')
          .eq('id', selectedClient.id)
          .single()

        const newTotalSpent = (clientData?.total_spent || 0) + total

        const { error: clientUpdateError } = await supabase
          .from('dd-clients')
          .update({
            last_visit_date: new Date().toISOString(),
            total_spent: newTotalSpent
          })
          .eq('id', selectedClient.id)

        if (clientUpdateError) {
          console.error('Error updating client:', clientUpdateError)
        }
      }

      // Store receipt data before resetting
      setReceiptData({
        sale,
        items: [...cart],
        client: selectedClient,
        subtotal,
        discount: discountAmount,
        giftCardAmount: giftCardAmountToUse,
        total,
        paymentMethod,
        date: new Date(),
        user: userDisplayName
      })
      
      // Set WhatsApp phone from client if available
      if (selectedClient?.phone) {
        const phone = selectedClient.phone.startsWith('+') ? selectedClient.phone : `+225${selectedClient.phone.replace(/^\+?225/, '')}`
        setWhatsappPhone(phone)
      } else {
        setWhatsappPhone('+225')
      }
      
      // Show receipt
      setShowReceipt(true)
      
      toast.success(`Vente effectuée avec succès! Total: ${total.toFixed(0)}f`)
      
      // Refresh daily sales if modal is open
      if (showDailySalesModal) {
        await fetchDailySales()
      }
      
      // Refresh products/services data silently to reflect stock updates
      await fetchData(true)
      
      // Reset form
      setCart([])
      setSelectedClient(null)
      setDiscount(0)
      setPaymentMethod('cash')
      setPromotionCode("")
      setAppliedPromotion(null)
      setPromotionError("")
      setGiftCardCode("")
      setAppliedGiftCard(null)
      setGiftCardAmount(0)
      setGiftCardError("")
      setRequiresDelivery(false)
      setDeliveryDetails({
        address: "",
        city: "",
        phone: "",
        notes: ""
      })
      
    } catch (error) {
      console.error('Error processing sale:', error)
      toast.error('Erreur lors de la vente')
    } finally {
      setLoading(false)
    }
  }

  // Filter clients based on search term
  // Handle null values safely and only search fields that exist in base schema
  const filteredClients = clients.filter(client => {
    if (!clientSearchTerm) return true
    
    const searchLower = clientSearchTerm.toLowerCase()
    
    // Check first_name (required field, should always exist)
    const matchesFirstName = client.first_name?.toLowerCase().includes(searchLower) || false
    
    // Check last_name (required field, should always exist)
    const matchesLastName = client.last_name?.toLowerCase().includes(searchLower) || false
    
    // Check email (optional, can be null)
    const matchesEmail = client.email?.toLowerCase().includes(searchLower) || false
    
    // Check phone (optional, can be null)
    const matchesPhone = client.phone?.toLowerCase().includes(searchLower) || false
    
    // Check full name combination
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.toLowerCase().trim()
    const matchesFullName = fullName.includes(searchLower)
    
    return matchesFirstName || matchesLastName || matchesEmail || matchesPhone || matchesFullName
  })

  // Fetch all products when there's a search or category filter
  useEffect(() => {
    const fetchAllProductsForFilter = async () => {
      if (searchTerm || selectedProductCategory !== 'all') {
        const { data, error } = await supabase
          .from('dd-products')
          .select(`
            *,
            category:"dd-categories"(id, name),
            variants:"dd-product-variants"(
              id,
              product_id,
              name,
              sku,
              quantity
            )
          `)
          .eq('is_active', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          setAllProductsForFilter(data as unknown as Product[])
        }
      } else {
        setAllProductsForFilter([])
      }
    }
    
    fetchAllProductsForFilter()
  }, [searchTerm, selectedProductCategory])

  // Filter products with category filter
  const productsToFilter = (searchTerm || selectedProductCategory !== 'all') && allProductsForFilter.length > 0
    ? allProductsForFilter
    : products
    
  const filteredProducts = productsToFilter.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedProductCategory === 'all' || product.category?.id === selectedProductCategory
    
    return matchesSearch && matchesCategory
  }).slice(0, 30) // Limit to 30 products for display

  // Filter services with category filter
  const filteredServices = services.filter(service => {
    const serviceName = service.name || service.nom || ''
    const matchesSearch = serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedServiceCategory === 'all' || service.category?.id === selectedServiceCategory
    
    return matchesSearch && matchesCategory
  })

  // Build category path: skip root "Cosmetics" and show next 2 levels
  const getCategoryDisplayName = (categoryId: string): string => {
    if (!categoryId) {
      return ''
    }
    
    // Use allCategories if available, otherwise fall back to categories
    const categoriesToUse = allCategories.length > 0 ? allCategories : categories
    if (categoriesToUse.length === 0) {
      return ''
    }
    
    const category = categoriesToUse.find(c => c.id === categoryId)
    if (!category) {
      return ''
    }
    
    const path: string[] = []
    let currentCategory: {id: string, name: string, parent_id?: string | null} | undefined = category
    const visited = new Set<string>() // Prevent infinite loops
    
    // Build full path by traversing up to root
    while (currentCategory && !visited.has(currentCategory.id)) {
      visited.add(currentCategory.id)
      path.unshift(currentCategory.name)
      
      if (currentCategory.parent_id) {
        currentCategory = categoriesToUse.find(c => c.id === currentCategory!.parent_id)
      } else {
        break
      }
    }
    
    // If path is empty, return empty
    if (path.length === 0) {
      return ''
    }
    
    // If path has only 1 level, return it
    if (path.length === 1) {
      return path[0]
    }
    
    // Skip root level if it's "Cosmetics" (case-insensitive)
    const rootName = path[0]?.toLowerCase().trim()
    const skipRoot = rootName === 'cosmetics' || rootName === 'cosmetic'
    const startIndex = skipRoot ? 1 : 0
    
    // Get the next 2 levels after skipping root
    const remainingPath = path.slice(startIndex)
    
    // If we have 2 or fewer levels after skipping, return all of them
    if (remainingPath.length <= 2) {
      return remainingPath.join(' • ')
    }
    
    // If we have more than 2 levels after skipping, take the first 2 (not last 2)
    // Example: "Cosmetics • Hygiène • Gel • Nettoyant" -> skip Cosmetics -> take first 2: "Hygiène • Gel"
    return remainingPath.slice(0, 2).join(' • ')
  }

  const handleConfirmVariant = () => {
    const product = variantSelection.product
    if (!product) {
      return
    }

    const variant = product.variants?.find(v => v.id === selectedVariantId)

    if (!variant) {
      toast.error('Veuillez sélectionner une variante')
      return
    }

    const quantity = parseInt(variantQuantity, 10)

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Veuillez entrer une quantité valide')
      return
    }

    addVariantToCart(product, variant, quantity)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Point de Vente</h1>
        <p className="text-muted-foreground dark:text-gray-400">Gérez vos ventes de produits et services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Products & Services Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client Selection - Combobox */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickCreateClient(true)}
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Créer
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher ou sélectionner un client..."
                  value={selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value)
                    setShowClientDropdown(true)
                    if (!e.target.value) {
                      setSelectedClient(null)
                    }
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
                {showClientDropdown && filteredClients.length > 0 && clientSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm max-h-60 overflow-y-auto">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client)
                          setClientSearchTerm('')
                          setShowClientDropdown(false)
                        }}
                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {client.email || client.phone || ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedClient && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                        {selectedClient.first_name} {selectedClient.last_name}
                      </p>
                      {/* Loyalty information removed - not in base schema */}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClient(null)
                        setClientSearchTerm('')
                      }}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher des produits ou services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex gap-2 mb-4">
                {!isReceptionniste && (
                  <Button
                    variant={activeTab === 'products' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('products')}
                    className="flex items-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Produits
                  </Button>
                )}
                {!isCaissiere && (
                  <Button
                    variant={activeTab === 'services' ? 'default' : 'outline'}
                    onClick={() => setActiveTab('services')}
                    className="flex items-center gap-2"
                  >
                    <Scissors className="w-4 h-4" />
                    Services
                  </Button>
                )}
              </div>
              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={activeTab === 'products' ? (selectedProductCategory === 'all' ? 'default' : 'outline') : 'outline'}
                  size="sm"
                  onClick={() => setSelectedProductCategory('all')}
                  className="text-xs"
                >
                  Tous
                </Button>
                {categories
                  .filter(cat => activeTab === 'products' 
                    ? products.some(p => p.category?.id === cat.id)
                    : services.some(s => s.category?.id === cat.id))
                  .map((category) => (
                    <Button
                      key={category.id}
                      variant={activeTab === 'products' 
                        ? (selectedProductCategory === category.id ? 'default' : 'outline')
                        : (selectedServiceCategory === category.id ? 'default' : 'outline')
                      }
                      size="sm"
                      onClick={() => {
                        if (activeTab === 'products') {
                          setSelectedProductCategory(category.id)
                        } else {
                          setSelectedServiceCategory(category.id)
                        }
                      }}
                      className="text-xs"
                    >
                      {getCategoryDisplayName(category.id)}
                    </Button>
                  ))}
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'products' ? (
                filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || selectedProductCategory !== 'all' 
                        ? 'Aucun produit trouvé avec ces filtres' 
                        : 'Aucun produit disponible'}
                    </p>
                    {products.length > 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Total produits: {products.length} • Filtrés: {filteredProducts.length}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                        onClick={() => addToCart(product, 'product')}
                      >
                        <div className="flex items-center gap-3">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white text-xs">{product.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                              {product.price.toFixed(0)}f • Stock: {product.stock_quantity}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product, 'product')
                            }}
                          >
                            Ajouter au panier
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] text-purple-600 border-purple-200 dark:text-purple-400 dark:border-purple-800"
                            onClick={(e) => {
                              e.stopPropagation()
                              setTransferProduct(product)
                              setTransferQuantity('1')
                              setTransferPerson('')
                              setTransferReason('')
                              setTransferTarget('salon')
                              setShowTransferModal(true)
                            }}
                          >
                            Transfert
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                filteredServices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || selectedServiceCategory !== 'all' 
                        ? 'Aucun service trouvé avec ces filtres' 
                        : 'Aucun service disponible'}
                    </p>
                    {services.length > 0 && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                        Total services: {services.length} • Filtrés: {filteredServices.length}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map((service) => (
                    <div
                      key={service.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => addToCart(service, 'service')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Scissors className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-xs">{service.name || service.nom}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {(service.price || service.prix_base || 0).toFixed(0)}f • {service.duration_minutes || service.duration || service.duree || 0} min
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-4">
          {/* Cart */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2 text-xs">
                <ShoppingCart className="w-3 h-3" />
                Panier ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  Le panier est vide
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const product = item.type === 'product' ? item.data as Product : null
                    const variant = item.type === 'product' && item.variantId
                      ? product?.variants?.find(v => v.id === item.variantId) || item.variantData
                      : null
                    const variantRemaining = variant ? Math.max((variant.quantity ?? 0) - item.quantity, 0) : null
                    const maxQuantity = item.type === 'product'
                      ? (variant ? variant?.quantity ?? 0 : product?.stock_quantity ?? 0)
                      : Infinity
                    const disableIncrement = item.type === 'product' && item.quantity >= maxQuantity

                    const isEditingPrice = editingPriceItemId === `${item.id}-${item.type}`
                    
                    return (
                      <div key={`${item.id}-${item.type}`} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-[10px]">{item.name}</p>
                          {isEditingPrice ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value)}
                                className="h-6 w-20 text-[9px] bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handlePriceSave(item)
                                  } else if (e.key === 'Escape') {
                                    handlePriceCancel()
                                  }
                                }}
                              />
                              <span className="text-[9px] text-gray-500">f</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePriceSave(item)}
                                className="h-6 w-6 p-0 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                              >
                                <Check className="w-2 h-2" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePriceCancel}
                                className="h-6 w-6 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                              >
                                <X className="w-2 h-2" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[9px] text-gray-500 dark:text-gray-400">
                                {item.price.toFixed(0)}f × {item.quantity} = {item.total.toFixed(0)}f
                              </p>
                              {canEditPrices && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePriceEdit(item)}
                                  className="h-4 w-4 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Modifier le prix"
                                >
                                  <DollarSign className="w-2 h-2" />
                                </Button>
                              )}
                            </div>
                          )}
                          {variant && (
                            <p className="text-[9px] text-gray-400 dark:text-gray-500">
                              Stock variante restant: {variantRemaining} / {variant.quantity}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.type, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                            disabled={isEditingPrice}
                            title="Diminuer la quantité"
                          >
                            <Minus className="w-2 h-2" />
                          </Button>
                          <span className="w-6 text-center text-[10px] font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.id, item.type, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                            disabled={disableIncrement || isEditingPrice}
                            title="Augmenter la quantité"
                          >
                            <Plus className="w-2 h-2" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFromCart(item.id, item.type)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 h-6 w-6 p-0"
                            disabled={isEditingPrice}
                            title="Retirer du panier"
                          >
                            <Trash2 className="w-2 h-2" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checkout */}
          {cart.length > 0 && (
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2 text-xs">
                  <CreditCard className="w-3 h-3" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Promotion Code */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 dark:text-gray-300 text-xs">Code Promotion</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Entrez le code promotion"
                      value={promotionCode}
                      onChange={(e) => {
                        setPromotionCode(e.target.value.toUpperCase())
                        setPromotionError("")
                      }}
                      disabled={!!appliedPromotion}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                    />
                    {appliedPromotion ? (
                      <Button
                        variant="outline"
                        onClick={removePromotion}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 h-8 px-2"
                        size="sm"
                      >
                        Retirer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={applyPromotionCode}
                        disabled={!promotionCode.trim()}
                        className="h-8 w-8 p-0"
                        size="sm"
                      >
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </Button>
                    )}
                  </div>
                  {appliedPromotion && (
                    <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-sm">
                      <p className="text-[10px] text-green-800 dark:text-green-400">
                        ✓ Promotion "{appliedPromotion.nom}" appliquée ({appliedPromotion.valeur}{appliedPromotion.valeur_type === 'pourcentage' ? '%' : 'f'})
                      </p>
                    </div>
                  )}
                  {promotionError && (
                    <p className="text-[10px] text-red-600 dark:text-red-400">{promotionError}</p>
                  )}
                </div>

                {/* Gift Card */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 dark:text-gray-300 text-xs">Carte Cadeau</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Entrez le code de la carte cadeau"
                      value={giftCardCode}
                      onChange={(e) => {
                        setGiftCardCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))
                        setGiftCardError("")
                      }}
                      disabled={!!appliedGiftCard}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs font-mono"
                    />
                    {appliedGiftCard ? (
                      <Button
                        variant="outline"
                        onClick={removeGiftCard}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 h-8 px-2"
                        size="sm"
                      >
                        Retirer
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={applyGiftCard}
                        disabled={!giftCardCode.trim()}
                        className="h-8 w-8 p-0"
                        size="sm"
                      >
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </Button>
                    )}
                  </div>
                  {appliedGiftCard && (
                    <div className="space-y-1.5 p-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-sm">
                      <p className="text-[10px] text-purple-800 dark:text-purple-400">
                        ✓ Carte cadeau "{appliedGiftCard.code}" appliquée (Solde: {appliedGiftCard.balance.toFixed(0)}f)
                      </p>
                      <div className="flex items-center gap-2">
                        <Label className="text-gray-700 dark:text-gray-300 text-[10px]">Montant à utiliser:</Label>
                        <Input
                          type="number"
                          min="0"
                          max={Math.min(appliedGiftCard.balance, calculateSubtotal() - calculateDiscountAmount())}
                          step="0.01"
                          value={giftCardAmount || ''}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0
                            const maxAmount = Math.min(appliedGiftCard.balance, calculateSubtotal() - calculateDiscountAmount())
                            setGiftCardAmount(Math.min(amount, maxAmount))
                          }}
                          className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-6 text-xs w-24"
                        />
                        <span className="text-[10px] text-gray-500">f</span>
                      </div>
                    </div>
                  )}
                  {giftCardError && (
                    <p className="text-[10px] text-red-600 dark:text-red-400">{giftCardError}</p>
                  )}
                </div>

                {/* Manual Discount (only if no promotion applied and user is admin/manager) */}
                {!checkingRole && !appliedPromotion && canManageDiscounts && (
                  <div className="space-y-1.5">
                    <Label className="text-gray-700 dark:text-gray-300 text-xs">Réduction Manuelle</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                      />
                      <Select
                        value={discountType}
                        onValueChange={(value: 'percentage' | 'amount') => setDiscountType(value)}
                      >
                        <SelectTrigger className="w-24 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="amount">f</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label className="text-gray-700 dark:text-gray-300 text-xs">Méthode de Paiement</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: 'cash' | 'carte' | 'mobile_money') => setPaymentMethod(value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="carte">Carte</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Delivery Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requiresDelivery"
                      checked={requiresDelivery}
                      onChange={(e) => setRequiresDelivery(e.target.checked)}
                      className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Label htmlFor="requiresDelivery" className="text-gray-700 dark:text-gray-300 cursor-pointer text-xs">
                      Requiert une livraison
                    </Label>
                  </div>
                </div>

                {/* Delivery Details */}
                {requiresDelivery && (
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-sm border border-gray-200 dark:border-gray-700">
                    <Label className="text-gray-700 dark:text-gray-300 text-xs">Détails de Livraison</Label>
                    <div className="space-y-1.5">
                      <Input
                        placeholder="Adresse complète"
                        value={deliveryDetails.address}
                        onChange={(e) => setDeliveryDetails({...deliveryDetails, address: e.target.value})}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Ville"
                          value={deliveryDetails.city}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, city: e.target.value})}
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                        />
                        <Input
                          placeholder="Téléphone"
                          value={deliveryDetails.phone}
                          onChange={(e) => setDeliveryDetails({...deliveryDetails, phone: e.target.value})}
                          className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                        />
                      </div>
                      <Input
                        placeholder="Notes (optionnel)"
                        value={deliveryDetails.notes}
                        onChange={(e) => setDeliveryDetails({...deliveryDetails, notes: e.target.value})}
                        className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 text-xs">Sous-total:</span>
                    <span className="text-gray-900 dark:text-white text-xs">{calculateSubtotal().toFixed(0)}f</span>
                  </div>
                  {appliedGiftCard && giftCardAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Carte cadeau:</span>
                      <span className="text-purple-600 dark:text-purple-400 text-xs">-{giftCardAmount.toFixed(0)}f</span>
                    </div>
                  )}
                  {(appliedPromotion || (discount > 0 && canManageDiscounts)) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Réduction:</span>
                      <span className="text-red-600 dark:text-red-400 text-xs">-{calculateDiscountAmount().toFixed(0)}f</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold">
                    <span className="text-gray-900 dark:text-white text-xs">Total:</span>
                    <span className="text-gray-900 dark:text-white text-xs">{calculateTotal().toFixed(0)}f</span>
                  </div>
                </div>

                <Button
                  onClick={processSale}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
                >
                  {loading ? 'Traitement...' : 'Finaliser la Vente'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Product Transfer Modal */}
      {showTransferModal && transferProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Transfert de produit
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enregistrer un produit pris pour le salon ou par le propriétaire. Le stock sera mis à jour automatiquement.
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Produit</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {transferProduct.name}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Stock actuel: {transferProduct.stock_quantity}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-700 dark:text-gray-300">Quantité</Label>
                  <Input
                    type="number"
                    min={1}
                    max={transferProduct.stock_quantity}
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700 dark:text-gray-300">Destination</Label>
                  <select
                    value={transferTarget}
                    onChange={(e) => setTransferTarget(e.target.value as 'salon' | 'owner' | 'other')}
                    className="mt-1 h-8 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white px-2"
                  >
                    <option value="salon">Salon</option>
                    <option value="owner">Propriétaire</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Personne qui prend le produit</Label>
                <Input
                  placeholder="Nom de la personne (employé, propriétaire, etc.)"
                  value={transferPerson}
                  onChange={(e) => setTransferPerson(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-700 dark:text-gray-300">Raison</Label>
                <Input
                  placeholder="Ex: Utilisation au salon, test, perte, etc."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (transferLoading) return
                  setShowTransferModal(false)
                  setTransferProduct(null)
                }}
                className="text-xs"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleCreateTransfer}
                disabled={transferLoading}
                className="text-xs"
              >
                {transferLoading ? 'Enregistrement...' : 'Enregistrer le transfert'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Client Modal */}
      <QuickCreateClient
        isOpen={showQuickCreateClient}
        onClose={() => setShowQuickCreateClient(false)}
        onClientCreated={(newClient) => {
          // Add new client to the list
          setClients([...clients, newClient])
          // Auto-select the newly created client
          setSelectedClient(newClient)
          setClientSearchTerm('')
          toast.success(`Client ${newClient.first_name} ${newClient.last_name} créé et sélectionné!`)
        }}
      />
      
      {/* Floating Daily Sales Button */}
      <Button
        onClick={() => {
          setShowDailySalesModal(true)
          fetchDailySales()
        }}
        className="fixed top-20 right-4 z-50 h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
        size="icon"
      >
        <TrendingUp className="h-5 w-5" />
      </Button>
      
      {/* Daily Sales Modal */}
      {showDailySalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDailySalesModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Ventes du Jour</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDailySalesModal(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {loadingDailySales ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chargement...</p>
                </div>
              ) : (
                <>
                  {/* Total Sales */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">
                      {currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin' 
                        ? 'Total Ventes (Tous les utilisateurs)' 
                        : 'Mes Ventes'}
                    </p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {dailySalesAmount.toFixed(0)}f
                    </p>
                  </div>
                  
                  {/* User Breakdown (only for admins/managers) */}
                  {(currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin') && allUsersSales.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Détail par Utilisateur</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {allUsersSales.map((userSale, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{userSale.user_name}</span>
                            </div>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">{userSale.amount.toFixed(0)}f</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Reçu de Vente</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReceipt(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4">
              {/* Receipt Content */}
              <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded p-4 font-mono text-xs">
                {/* Header */}
                <div className="text-center mb-4 border-b border-dashed border-gray-400 dark:border-gray-500 pb-3">
                  <p className="font-bold text-sm mb-1">THE CERCLE OF BEAUTY</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400">Institut de Beauté</p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                    {receiptData.date.toLocaleDateString('fr-FR', { 
                      day: '2-digit', 
                      month: '2-digit', 
                      year: 'numeric' 
                    })} {receiptData.date.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>

                {/* Sale ID */}
                <div className="mb-3 text-[10px] text-gray-600 dark:text-gray-400">
                  <p>Vente: #{receiptData.sale.id.slice(-8).toUpperCase()}</p>
                </div>

                {/* Client Info */}
                {receiptData.client && (
                  <div className="mb-3 text-[10px] text-gray-600 dark:text-gray-400 border-b border-dashed border-gray-400 dark:border-gray-500 pb-2">
                    <p>Client: {receiptData.client.first_name} {receiptData.client.last_name}</p>
                    {receiptData.client.phone && (
                      <p>Tel: {receiptData.client.phone}</p>
                    )}
                  </div>
                )}

                {/* Items */}
                <div className="mb-3 border-b border-dashed border-gray-400 dark:border-gray-500 pb-2">
                  {receiptData.items.map((item, index) => (
                    <div key={index} className="mb-2">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400">
                            {item.quantity} x {item.price.toFixed(0)}f
                          </p>
                        </div>
                        <p className="font-semibold ml-2">{item.total.toFixed(0)}f</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-[10px]">
                    <span>Sous-total:</span>
                    <span>{receiptData.subtotal.toFixed(0)}f</span>
                  </div>
                  {receiptData.discount > 0 && (
                    <div className="flex justify-between text-[10px] text-red-600 dark:text-red-400">
                      <span>Réduction:</span>
                      <span>-{receiptData.discount.toFixed(0)}f</span>
                    </div>
                  )}
                  {receiptData.giftCardAmount > 0 && (
                    <div className="flex justify-between text-[10px] text-blue-600 dark:text-blue-400">
                      <span>Carte Cadeau:</span>
                      <span>-{receiptData.giftCardAmount.toFixed(0)}f</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-dashed border-gray-400 dark:border-gray-500 pt-2 mt-2">
                    <span>TOTAL:</span>
                    <span>{receiptData.total.toFixed(0)}f</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-3 text-[10px] border-b border-dashed border-gray-400 dark:border-gray-500 pb-2">
                  <p>
                    Paiement: {
                      receiptData.paymentMethod === 'cash' ? 'Espèces' :
                      receiptData.paymentMethod === 'carte' ? 'Carte' :
                      receiptData.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                      receiptData.paymentMethod
                    }
                  </p>
                </div>

                {/* Footer */}
                <div className="text-center text-[10px] text-gray-600 dark:text-gray-400 mt-4 pt-3 border-t border-dashed border-gray-400 dark:border-gray-500">
                  <p>Merci de votre visite!</p>
                  <p className="mt-1">Vendu par: {receiptData.user}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-3 gap-2">
                  {/* Download Button */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!receiptData) return
                      
                      try {
                        toast.loading('Génération de l\'image...', { id: 'download-receipt' })
                        
                        const escapeHtml = (text: string) => {
                          const div = document.createElement('div')
                          div.textContent = text
                          return div.innerHTML
                        }
                        
                        const formatDate = receiptData.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        const formatTime = receiptData.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        const saleId = receiptData.sale.id.slice(-8).toUpperCase()
                        const paymentMethodText = receiptData.paymentMethod === 'cash' ? 'Espèces' :
                          receiptData.paymentMethod === 'carte' ? 'Carte' :
                          receiptData.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                          receiptData.paymentMethod
                        
                        const receiptHTML = generateReceiptHTML(receiptData, escapeHtml, formatDate, formatTime, saleId, paymentMethodText)
                        
                        // Extract body content from HTML string
                        const parser = new DOMParser()
                        const doc = parser.parseFromString(receiptHTML, 'text/html')
                        const bodyContent = doc.body.innerHTML
                        
                        // Create a temporary container for the receipt
                        const tempDiv = document.createElement('div')
                        tempDiv.innerHTML = bodyContent
                        tempDiv.style.position = 'fixed'
                        tempDiv.style.top = '-9999px'
                        tempDiv.style.left = '-9999px'
                        tempDiv.style.width = '300px'
                        tempDiv.style.backgroundColor = '#ffffff'
                        tempDiv.style.padding = '10px'
                        tempDiv.style.fontFamily = "'Courier New', 'Courier', monospace"
                        tempDiv.style.fontSize = '12px'
                        tempDiv.style.color = '#000000'
                        document.body.appendChild(tempDiv)
                        
                        // Wait a bit for rendering
                        await new Promise(resolve => setTimeout(resolve, 100))
                        
                        // Convert to canvas and then to PNG
                        const canvas = await html2canvas(tempDiv, {
                          backgroundColor: '#ffffff',
                          scale: 2,
                          width: 300,
                          height: tempDiv.scrollHeight,
                          logging: false,
                          useCORS: true,
                          allowTaint: false,
                          removeContainer: false
                        })
                        
                        // Remove temporary element
                        document.body.removeChild(tempDiv)
                        
                        // Convert canvas to data URL and download
                        try {
                          const dataURL = canvas.toDataURL('image/png', 1.0)
                          
                          // Create download link
                          const a = document.createElement('a')
                          a.href = dataURL
                          a.download = `receipt-${saleId}-${formatDate.replace(/\//g, '-')}.png`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          
                          toast.success('Reçu téléchargé avec succès', { id: 'download-receipt' })
                        } catch (error) {
                          console.error('Error converting canvas to data URL:', error)
                          toast.error('Erreur lors de la conversion de l\'image', { id: 'download-receipt' })
                        }
                      } catch (error) {
                        console.error('Error generating receipt image:', error)
                        toast.error('Erreur lors de la génération de l\'image', { id: 'download-receipt' })
                      }
                    }}
                    className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger</span>
                  </Button>
                  
                  {/* Print Button */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!receiptData) return
                      
                      const escapeHtml = (text: string) => {
                        const div = document.createElement('div')
                        div.textContent = text
                        return div.innerHTML
                      }
                      
                      const formatDate = receiptData.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      const formatTime = receiptData.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      const saleId = receiptData.sale.id.slice(-8).toUpperCase()
                      const paymentMethodText = receiptData.paymentMethod === 'cash' ? 'Espèces' :
                        receiptData.paymentMethod === 'carte' ? 'Carte' :
                        receiptData.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                        receiptData.paymentMethod
                      
                      const receiptHTML = generateReceiptHTML(receiptData, escapeHtml, formatDate, formatTime, saleId, paymentMethodText)
                      
                      const printWindow = window.open('', '_blank', 'width=300,height=600')
                      if (printWindow) {
                        printWindow.document.open()
                        printWindow.document.write(receiptHTML)
                        printWindow.document.close()
                        
                        printWindow.onload = () => {
                          setTimeout(() => {
                            printWindow.focus()
                            printWindow.print()
                          }, 100)
                        }
                        
                        setTimeout(() => {
                          if (printWindow.document.readyState === 'complete') {
                            printWindow.focus()
                            printWindow.print()
                          }
                        }, 500)
                      }
                    }}
                    className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer</span>
                  </Button>
                  
                  {/* WhatsApp Button */}
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!receiptData) return
                      setSendingWhatsapp(true)
                      
                      try {
                        toast.loading('Génération de l\'image...', { id: 'whatsapp-receipt' })
                        
                        const escapeHtml = (text: string) => {
                          const div = document.createElement('div')
                          div.textContent = text
                          return div.innerHTML
                        }
                        
                        const formatDate = receiptData.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        const formatTime = receiptData.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        const saleId = receiptData.sale.id.slice(-8).toUpperCase()
                        const paymentMethodText = receiptData.paymentMethod === 'cash' ? 'Espèces' :
                          receiptData.paymentMethod === 'carte' ? 'Carte' :
                          receiptData.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                          receiptData.paymentMethod
                        
                        const receiptHTML = generateReceiptHTML(receiptData, escapeHtml, formatDate, formatTime, saleId, paymentMethodText)
                        
                        // Extract body content from HTML string
                        const parser = new DOMParser()
                        const doc = parser.parseFromString(receiptHTML, 'text/html')
                        const bodyContent = doc.body.innerHTML
                        
                        // Create a temporary container for the receipt
                        const tempDiv = document.createElement('div')
                        tempDiv.innerHTML = bodyContent
                        tempDiv.style.position = 'fixed'
                        tempDiv.style.top = '-9999px'
                        tempDiv.style.left = '-9999px'
                        tempDiv.style.width = '300px'
                        tempDiv.style.backgroundColor = '#ffffff'
                        tempDiv.style.padding = '10px'
                        tempDiv.style.fontFamily = "'Courier New', 'Courier', monospace"
                        tempDiv.style.fontSize = '12px'
                        tempDiv.style.color = '#000000'
                        document.body.appendChild(tempDiv)
                        
                        // Wait a bit for rendering
                        await new Promise(resolve => setTimeout(resolve, 100))
                        
                        // Convert to canvas and then to PNG
                        const canvas = await html2canvas(tempDiv, {
                          backgroundColor: '#ffffff',
                          scale: 2,
                          width: 300,
                          height: tempDiv.scrollHeight,
                          logging: false,
                          useCORS: true,
                          allowTaint: false,
                          removeContainer: false
                        })
                        
                        // Remove temporary element
                        document.body.removeChild(tempDiv)
                        
                        // Convert canvas to blob
                        const blob = await new Promise<Blob | null>((resolve) => {
                          canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0)
                        })
                        
                        if (!blob) {
                          toast.error('Erreur lors de la génération de l\'image', { id: 'whatsapp-receipt' })
                          setSendingWhatsapp(false)
                          return
                        }
                        
                        // Upload image to Supabase storage
                        toast.loading('Upload de l\'image...', { id: 'whatsapp-receipt' })
                        
                        const fileExt = 'png'
                        const fileName = `receipt-${saleId}-${Date.now()}.${fileExt}`
                        const filePath = `receipts/${fileName}`
                        
                        const { error: uploadError } = await supabase.storage
                          .from('cb-bucket')
                          .upload(filePath, blob, {
                            contentType: 'image/png',
                            upsert: false
                          })
                        
                        if (uploadError) {
                          console.error('Error uploading receipt image:', uploadError)
                          toast.error('Erreur lors de l\'upload de l\'image', { id: 'whatsapp-receipt' })
                          setSendingWhatsapp(false)
                          return
                        }
                        
                        // Get public URL
                        const { data: urlData } = supabase.storage
                          .from('cb-bucket')
                          .getPublicUrl(filePath)
                        
                        const imageUrl = urlData.publicUrl
                        
                        // Format phone number
                        let phoneNumber = whatsappPhone.trim()
                        if (!phoneNumber.startsWith('+')) {
                          phoneNumber = phoneNumber.startsWith('225') ? `+${phoneNumber}` : `+225${phoneNumber.replace(/^225/, '')}`
                        }
                        
                        // Remove any non-digit characters except +
                        phoneNumber = phoneNumber.replace(/[^\d+]/g, '')
                        
                        if (!phoneNumber || phoneNumber.length < 10) {
                          toast.error('Veuillez entrer un numéro de téléphone valide', { id: 'whatsapp-receipt' })
                          setSendingWhatsapp(false)
                          return
                        }
                        
                        // Create message with image link
                        const message = `*THE CERCLE OF BEAUTY - Reçu de Vente*\n\nVente: #${saleId}\nDate: ${formatDate} ${formatTime}\n\nVoir le reçu: ${imageUrl}\n\nMerci de votre visite!`
                        
                        // Open WhatsApp Web with pre-filled message containing image link
                        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/^\+/, '')}?text=${encodeURIComponent(message)}`
                        window.open(whatsappUrl, '_blank')
                        
                        toast.success('WhatsApp ouvert avec le reçu', { id: 'whatsapp-receipt' })
                        setSendingWhatsapp(false)
                      } catch (error) {
                        console.error('Error sending receipt via WhatsApp:', error)
                        toast.error('Erreur lors de l\'envoi du reçu', { id: 'whatsapp-receipt' })
                        setSendingWhatsapp(false)
                      }
                    }}
                    disabled={sendingWhatsapp}
                    className="flex flex-col items-center gap-1 h-auto py-2 text-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{sendingWhatsapp ? 'Envoi...' : 'WhatsApp'}</span>
                  </Button>
                </div>
                
                {/* WhatsApp Phone Input */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-700 dark:text-gray-300">Numéro WhatsApp</Label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="+225XXXXXXXXX"
                      value={whatsappPhone}
                      onChange={(e) => {
                        let value = e.target.value
                        // Auto-add +225 if no indicatif
                        if (!value.startsWith('+') && value.length > 0) {
                          if (!value.startsWith('225')) {
                            value = `+225${value}`
                          } else {
                            value = `+${value}`
                          }
                        }
                        setWhatsappPhone(value)
                      }}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 h-8 text-xs"
                    />
                  </div>
                </div>
                
                {/* Close Button */}
                <Button
                  variant="outline"
                  onClick={() => setShowReceipt(false)}
                  className="w-full text-xs"
                >
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}