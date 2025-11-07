'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TableLoadingState } from '@/components/ui/table-loading-state'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, Trash2, Package, Scissors, DollarSign, User, Calendar, CreditCard, ShoppingCart } from 'lucide-react'

interface Sale {
  id: string
  client_id?: string
  user_id: string
  date: string
  type: string
  total_brut: number
  reduction: number
  total_net: number
  methode_paiement: string
  reference?: string
  status: string
  source: string
  note?: string
  created_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    phone?: string
    email?: string
  }
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    pseudo: string
  }
  items?: SaleItem[]
}

interface SaleItem {
  id: string
  product_id?: string
  service_id?: string
  quantite: number
  prix_unitaire: number
  total: number
  product?: {
    id: string
    name: string
    sku?: string
  }
  service?: {
    id: string
    name: string
  }
}

export default function SaleDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [sale, setSale] = useState<Sale | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    if (params.id) {
      fetchSale()
      fetchCurrentUserRole()
    }
  }, [params.id])

  const fetchCurrentUserRole = async () => {
    try {
      if (!authUser?.id) {
        setCurrentUserRole('')
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
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

  const canDeleteSales = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchSale = async () => {
    try {
      setLoading(true)
      const saleId = params.id as string

      // Fetch sale data
      const { data: saleData, error: saleError } = await supabase
        .from('dd-ventes')
        .select('*')
        .eq('id', saleId)
        .single()

      if (saleError) {
        console.error('Error fetching sale:', saleError)
        toast.error('Vente introuvable')
        router.push('/admin/sales')
        return
      }

      if (!saleData) {
        toast.error('Vente introuvable')
        router.push('/admin/sales')
        return
      }

      // Fetch related data
      const clientId = saleData.client_id
      const userId = saleData.user_id

      // Fetch client
      let client = null
      if (clientId) {
        const { data: clientData } = await supabase
          .from('dd-clients')
          .select('id, first_name, last_name, phone, email')
          .eq('id', clientId)
          .single()
        client = clientData
      }

      // Fetch user
      let user = null
      if (userId) {
        const { data: userData } = await supabase
          .from('dd-users')
          .select('id, first_name, last_name, email, pseudo')
          .eq('id', userId)
          .single()
        user = userData
      }

      // Fetch sale items
      const { data: saleItemsData } = await supabase
        .from('dd-ventes-items')
        .select('*')
        .eq('vente_id', saleId)

      // Fetch products for sale items
      const productIds = saleItemsData
        ?.map(item => item.product_id)
        .filter((id): id is string => !!id) || []

      const productsMap = new Map<string, { id: string; name: string; sku: string }>()
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('dd-products')
          .select('id, name, sku')
          .in('id', productIds)
        
        products?.forEach(product => {
          productsMap.set(product.id, {
            id: product.id,
            name: product.name,
            sku: product.sku || ''
          })
        })
      }

      // Fetch services for sale items
      const serviceIds = saleItemsData
        ?.map(item => item.service_id)
        .filter((id): id is string => !!id) || []

      const servicesMap = new Map<string, { id: string; name: string }>()
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('dd-services')
          .select('id, name')
          .in('id', serviceIds)
        
        services?.forEach(service => {
          servicesMap.set(service.id, {
            id: service.id,
            name: service.name || ''
          })
        })
      }

      // Map items with products/services
      const items: SaleItem[] = (saleItemsData || []).map(item => ({
        ...item,
        product: item.product_id 
          ? (productsMap.get(item.product_id) || { id: item.product_id, name: 'inconnu', sku: '' })
          : undefined,
        service: item.service_id ? servicesMap.get(item.service_id) : undefined
      }))

      setSale({
        ...saleData,
        client: client || undefined,
        user: user || undefined,
        items
      } as Sale)
    } catch (error) {
      console.error('Error fetching sale:', error)
      toast.error('Erreur lors du chargement de la vente')
    } finally {
      setLoading(false)
    }
  }

  const deleteSale = async () => {
    if (!canDeleteSales) {
      toast.error('Vous n\'avez pas la permission de supprimer des ventes')
      return
    }

    if (!sale) return

    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      // First, delete the sale items
      const { error: itemsError } = await supabase
        .from('dd-ventes-items')
        .delete()
        .eq('vente_id', sale.id)

      if (itemsError && itemsError.code !== 'PGRST116') {
        console.warn('Error deleting sale items:', itemsError)
      }

      // Then delete the sale
      const { error: deleteError } = await supabase
        .from('dd-ventes')
        .delete()
        .eq('id', sale.id)

      if (deleteError) {
        console.error('Error deleting sale:', deleteError)
        toast.error(`Erreur lors de la suppression: ${deleteError.message}`)
        return
      }

      toast.success('Vente supprimée avec succès!')
      router.push('/admin/sales')
    } catch (error: any) {
      console.error('Error deleting sale:', error)
      toast.error(`Erreur lors de la suppression: ${error?.message || 'Erreur inconnue'}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paye':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'annule':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'rembourse':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paye': return 'Payé'
      case 'annule': return 'Annulé'
      case 'en_attente': return 'En Attente'
      case 'rembourse': return 'Remboursé'
      default: return status
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'produit': return 'Produit'
      case 'service': return 'Service'
      case 'mixte': return 'Mixte'
      default: return type
    }
  }

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Espèces'
      case 'carte': return 'Carte'
      case 'mobile_money': return 'Mobile Money'
      case 'cheque': return 'Chèque'
      default: return method
    }
  }

  if (loading) {
    return <TableLoadingState />
  }

  if (!sale) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Vente introuvable</p>
            <Button onClick={() => router.push('/admin/sales')} className="mt-4">
              Retour aux ventes
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/sales')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground dark:text-white">Détails de la Vente</h1>
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Référence: {sale.reference || `#${sale.id.slice(-8).toUpperCase()}`}
            </p>
          </div>
        </div>
        {canDeleteSales && (
          <Button
            variant="outline"
            size="sm"
            onClick={deleteSale}
            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sale Info */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-900 dark:text-white">Informations de la Vente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(sale.date).toLocaleDateString('fr-FR', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Type:</span>
              <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {getTypeText(sale.type)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Statut:</span>
              <Badge className={`text-xs ${getStatusColor(sale.status)}`}>
                {getStatusText(sale.status)}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Paiement:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {getPaymentMethodText(sale.methode_paiement)}
              </span>
            </div>
            {sale.note && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Note:</span>
                <p className="text-sm text-gray-900 dark:text-white mt-1">{sale.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-sm text-gray-900 dark:text-white">Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.client ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Nom:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {sale.client.first_name} {sale.client.last_name}
                  </span>
                </div>
                {sale.client.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Téléphone:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{sale.client.phone}</span>
                  </div>
                )}
                {sale.client.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{sale.client.email}</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Client anonyme</p>
            )}
            {sale.user && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Vendu par:</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {sale.user.first_name} {sale.user.last_name} ({sale.user.pseudo || sale.user.email})
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm text-gray-900 dark:text-white">Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {sale.items && sale.items.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-xs text-gray-700 dark:text-gray-300">Type</TableHead>
                  <TableHead className="text-xs text-gray-700 dark:text-gray-300">Nom</TableHead>
                  <TableHead className="text-xs text-gray-700 dark:text-gray-300">Quantité</TableHead>
                  <TableHead className="text-xs text-gray-700 dark:text-gray-300">Prix unitaire</TableHead>
                  <TableHead className="text-xs text-gray-700 dark:text-gray-300 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id} className="border-gray-200 dark:border-gray-700">
                    <TableCell>
                      {item.product ? (
                        <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          <Package className="w-3 h-3 mr-1 inline" />
                          Produit
                        </Badge>
                      ) : item.service ? (
                        <Badge className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                          <Scissors className="w-3 h-3 mr-1 inline" />
                          Service
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                          N/A
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 dark:text-white">
                      {item.product?.name || item.service?.name || 'inconnu'}
                    </TableCell>
                    <TableCell className="text-sm text-gray-900 dark:text-white">{item.quantite}</TableCell>
                    <TableCell className="text-sm text-gray-900 dark:text-white">{item.prix_unitaire.toFixed(0)}f</TableCell>
                    <TableCell className="text-sm font-medium text-gray-900 dark:text-white text-right">
                      {item.total.toFixed(0)}f
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Aucun article</p>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-sm text-gray-900 dark:text-white">Totaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sous-total:</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{sale.total_brut.toFixed(0)}f</span>
          </div>
          {sale.reduction > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600 dark:text-red-400">Réduction:</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">-{sale.reduction.toFixed(0)}f</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-base font-bold text-gray-900 dark:text-white">TOTAL:</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">{sale.total_net.toFixed(0)}f</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

