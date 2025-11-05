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
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, User, Package, Scissors, DollarSign, Percent, Truck, Check } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

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
  email: string
  phone?: string  // Single phone number
  phones?: string[]  // Multiple phone numbers (if exists)
  loyalty_level?: string  // Optional - may not exist in database
  points_fidelite?: number  // Optional - may not exist in database
}

interface CartItem {
  id: string
  type: 'product' | 'service'
  name: string
  price: number
  quantity: number
  total: number
  data: Product | Service
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
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all")
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'carte' | 'mobile_money'>('cash')
  const [loading, setLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [checkingRole, setCheckingRole] = useState(true)
  
  // Promotion code states
  const [promotionCode, setPromotionCode] = useState("")
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null)
  const [promotionError, setPromotionError] = useState("")
  
  // Delivery states
  const [requiresDelivery, setRequiresDelivery] = useState(false)
  const [deliveryDetails, setDeliveryDetails] = useState({
    address: "",
    city: "",
    phone: "",
    notes: ""
  })

  useEffect(() => {
    fetchData()
    fetchCurrentUserRole()
  }, [authUser])

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

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:dd-categories(id, name)
        `)
        .eq('is_active', true)
        .eq('status', 'active')

      if (productsError) throw productsError

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:dd-categories(id, name)
        `)
        .eq('is_active', true)

      if (servicesError) throw servicesError

      // Fetch clients (only fields that exist in base table)
      const { data: clientsData, error: clientsError } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, email, phone')
        .eq('is_active', true)
        .limit(100)

      if (clientsError) throw clientsError

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('dd-categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      }

      console.log('POS Data fetched:', {
        productsCount: productsData?.length || 0,
        servicesCount: servicesData?.length || 0,
        clientsCount: clientsData?.length || 0,
        categoriesCount: categoriesData?.length || 0
      })

      setProducts((productsData || []) as unknown as Product[])
      setServices((servicesData || []) as unknown as Service[])
      setClients(clientsData || [])
      setCategories(categoriesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item: Product | Service, type: 'product' | 'service') => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id && cartItem.type === type)
    
    if (existingItem) {
      updateCartQuantity(existingItem.id, existingItem.type, existingItem.quantity + 1)
    } else {
      const service = type === 'service' ? item as Service : null
      const product = type === 'product' ? item as Product : null
      const cartItem: CartItem = {
        id: item.id,
        type,
        name: type === 'product' ? product!.name : (service!.name || service!.nom || 'Service'),
        price: type === 'product' ? product!.price : (service!.price || service!.prix_base || 0),
        quantity: 1,
        total: type === 'product' ? product!.price : (service!.price || service!.prix_base || 0),
        data: item
      }
      setCart([...cart, cartItem])
    }
  }

  const updateCartQuantity = (id: string, type: 'product' | 'service', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id, type)
      return
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
    return calculateSubtotal() - calculateDiscountAmount()
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
        product_id: item.type === 'product' ? item.id : null,
        service_id: item.type === 'service' ? item.id : null,
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
          const { error: stockError } = await supabase
            .from('dd-products')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.id)

          if (stockError) {
            console.error('Error updating stock:', stockError)
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
        const { error: deliveryError } = await supabase
          .from('dd-livraisons')
          .insert([{
            vente_id: sale.id,
            client_id: selectedClient?.id || null,
            adresse: deliveryDetails.address,
            statut: 'en_preparation',
            note: deliveryDetails.notes || null,
            created_by: currentUser.id
          }])

        if (deliveryError) {
          console.error('Error creating delivery:', deliveryError)
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

      // Update client loyalty points and last visit if client is selected
      if (selectedClient) {
        const pointsEarned = Math.floor(total / 1000) // 1 point per 1000f
        
        // Update loyalty card
        const { error: loyaltyError } = await supabase
          .from('dd-cartes-fidelite')
          .upsert([{
            client_id: selectedClient.id,
            points: (selectedClient.points_fidelite || 0) + pointsEarned,
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

      toast.success(`Vente effectuée avec succès! Total: ${total.toFixed(0)}f`)
      
      // Reset form
      setCart([])
      setSelectedClient(null)
      setDiscount(0)
      setPaymentMethod('cash')
      setPromotionCode("")
      setAppliedPromotion(null)
      setPromotionError("")
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
  const filteredClients = clients.filter(client =>
    client.first_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.last_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.phone?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.phones?.some(phone => phone.toLowerCase().includes(clientSearchTerm.toLowerCase()))
  )

  // Filter products with category filter
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedProductCategory === 'all' || product.category?.id === selectedProductCategory
    
    return matchesSearch && matchesCategory
  })

  // Filter services with category filter
  const filteredServices = services.filter(service => {
    const serviceName = service.name || service.nom || ''
    const matchesSearch = serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedServiceCategory === 'all' || service.category?.id === selectedServiceCategory
    
    return matchesSearch && matchesCategory
  })

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
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Client
              </CardTitle>
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
                          {client.email} {client.points_fidelite ? `• ${client.points_fidelite} pts` : ''}
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
                      {selectedClient.loyalty_level || selectedClient.points_fidelite ? (
                        <p className="text-xs text-blue-600 dark:text-blue-300">
                          {selectedClient.loyalty_level ? `Niveau: ${selectedClient.loyalty_level}` : ''}
                          {selectedClient.loyalty_level && selectedClient.points_fidelite ? ' • ' : ''}
                          {selectedClient.points_fidelite ? `Points: ${selectedClient.points_fidelite}` : ''}
                        </p>
                      ) : null}
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
                <Button
                  variant={activeTab === 'products' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('products')}
                  className="flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Produits
                </Button>
                <Button
                  variant={activeTab === 'services' ? 'default' : 'outline'}
                  onClick={() => setActiveTab('services')}
                  className="flex items-center gap-2"
                >
                  <Scissors className="w-4 h-4" />
                  Services
                </Button>
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
                      {category.name}
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
                  {cart.map((item, index) => (
                    <div key={`${item.id}-${item.type}`} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-[10px]">{item.name}</p>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400">
                          {item.price.toFixed(0)}f × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.type, item.quantity - 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="w-2 h-2" />
                        </Button>
                        <span className="w-6 text-center text-[10px] font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.type, item.quantity + 1)}
                          className="h-6 w-6 p-0"
                        >
                          <Plus className="w-2 h-2" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.id, item.type)}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 h-6 w-6 p-0"
                        >
                          <Trash2 className="w-2 h-2" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
    </div>
  )
}