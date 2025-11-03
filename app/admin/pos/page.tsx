"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, User, Package, Scissors, DollarSign, Percent } from "lucide-react"
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
  nom: string
  prix_base: number
  duree: number
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
  phones: string[]
  loyalty_level: string
  points_fidelite: number
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

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'carte' | 'mobile_money'>('cash')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

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
        .eq('visible_en_pos', true)

      if (productsError) throw productsError

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:dd-categories(id, name)
        `)
        .eq('actif', true)

      if (servicesError) throw servicesError

      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, email, phones, loyalty_level, points_fidelite')
        .eq('is_active', true)
        .limit(100)

      if (clientsError) throw clientsError

      setProducts(productsData || [])
      setServices(servicesData || [])
      setClients(clientsData || [])
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
      const cartItem: CartItem = {
        id: item.id,
        type,
        name: type === 'product' ? item.name : item.nom,
        price: type === 'product' ? item.price : item.prix_base,
        quantity: 1,
        total: type === 'product' ? item.price : item.prix_base,
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

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal()
    if (discountType === 'percentage') {
      return (subtotal * discount) / 100
    }
    return Math.min(discount, subtotal)
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
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError) {
        toast.error('Erreur lors de la récupération de l\'utilisateur')
        return
      }

      const subtotal = calculateSubtotal()
      const discountAmount = calculateDiscountAmount()
      const total = calculateTotal()

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('dd-ventes')
        .insert([{
          client_id: selectedClient?.id || null,
          user_id: currentUser.id,
          type: cart.some(item => item.type === 'product') && cart.some(item => item.type === 'service') 
            ? 'mixte' 
            : cart[0].type === 'product' ? 'produit' : 'service',
          total_brut: subtotal,
          reduction: discountAmount,
          reduction_pourcentage: discountType === 'percentage' ? discount : 0,
          total_net: total,
          methode_paiement: paymentMethod,
          status: 'paye',
          source: 'sur_place',
          created_by: currentUser.id
        }])
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

      const { error: itemsError } = await supabase
        .from('dd-ventes-items')
        .insert(saleItems)

      if (itemsError) throw itemsError

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

      // Update client loyalty points if client is selected
      if (selectedClient) {
        const pointsEarned = Math.floor(total / 1000) // 1 point per 1000 XOF
        const { error: loyaltyError } = await supabase
          .from('dd-cartes-fidelite')
          .upsert([{
            client_id: selectedClient.id,
            points: selectedClient.points_fidelite + pointsEarned,
            statut: 'active'
          }])

        if (loyaltyError) {
          console.error('Error updating loyalty points:', loyaltyError)
        }
      }

      toast.success(`Vente effectuée avec succès! Total: ${total.toFixed(0)} XOF`)
      
      // Reset form
      setCart([])
      setSelectedClient(null)
      setDiscount(0)
      setPaymentMethod('cash')
      
    } catch (error) {
      console.error('Error processing sale:', error)
      toast.error('Erreur lors de la vente')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredServices = services.filter(service =>
    service.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Point de Vente</h1>
        <p className="text-muted-foreground dark:text-gray-400">Gérez vos ventes de produits et services</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products & Services Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedClient?.id || ''}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value)
                  setSelectedClient(client || null)
                }}
              >
                <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                  <SelectValue placeholder="Sélectionner un client (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name} - {client.points_fidelite} pts
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    {selectedClient.first_name} {selectedClient.last_name} - 
                    Niveau: {selectedClient.loyalty_level} - 
                    Points: {selectedClient.points_fidelite}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
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
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex gap-2">
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
            </CardHeader>
            <CardContent>
              {activeTab === 'products' ? (
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
                          <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {product.price.toFixed(0)} XOF • Stock: {product.stock_quantity}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
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
                          <p className="font-medium text-gray-900 dark:text-white">{service.nom}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {service.prix_base.toFixed(0)} XOF • {service.duree} min
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="space-y-6">
          {/* Cart */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
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
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.price.toFixed(0)} XOF × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.type, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartQuantity(item.id, item.type, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFromCart(item.id, item.type)}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3" />
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
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Discount */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Réduction</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                    <Select
                      value={discountType}
                      onValueChange={(value: 'percentage' | 'amount') => setDiscountType(value)}
                    >
                      <SelectTrigger className="w-24 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">%</SelectItem>
                        <SelectItem value="amount">XOF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300">Méthode de Paiement</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value: 'cash' | 'carte' | 'mobile_money') => setPaymentMethod(value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Espèces</SelectItem>
                      <SelectItem value="carte">Carte</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sous-total:</span>
                    <span className="text-gray-900 dark:text-white">{calculateSubtotal().toFixed(0)} XOF</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Réduction:</span>
                      <span className="text-red-600 dark:text-red-400">-{calculateDiscountAmount().toFixed(0)} XOF</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-gray-900 dark:text-white">Total:</span>
                    <span className="text-gray-900 dark:text-white">{calculateTotal().toFixed(0)} XOF</span>
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
