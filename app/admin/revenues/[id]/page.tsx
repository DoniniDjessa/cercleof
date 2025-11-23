'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableLoadingState } from '@/components/ui/table-loading-state'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ArrowLeft, DollarSign, Package, Scissors, Calendar, User, FileText, Tag } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Revenue {
  id: string
  type: string
  montant: number
  date: string
  note?: string
  description?: string
  source_id?: string
  revenue_source?: 'manual' | 'pos_product' | 'pos_service'
  created_at: string
  enregistre_par?: string
  user?: {
    id: string
    pseudo?: string
    first_name?: string
    last_name?: string
  }
  sale?: {
    id: string
    date: string
    total_brut: number
    reduction: number
    total_net: number
    methode_paiement: string
    status: string
    client?: {
      id: string
      first_name: string
      last_name: string
      phone?: string
      email?: string
    }
    items?: Array<{
      id: string
      product_id?: string
      service_id?: string
      quantite: number
      prix_unitaire: number
      total: number
      product?: {
        name: string
        sku?: string
      }
      service?: {
        name: string
      }
    }>
  }
}

export default function RevenueDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)

  const id = params?.id as string

  useEffect(() => {
    if (id) {
      fetchRevenueDetails()
    }
  }, [id])

  const fetchRevenueDetails = async () => {
    try {
      setLoading(true)

      // First, try to fetch from dd-revenues (manual revenue)
      const { data: manualRevenue, error: manualError } = await supabase
        .from('dd-revenues')
        .select('*')
        .eq('id', id)
        .single()

      if (manualRevenue && !manualError) {
        // Fetch user data separately if enregistre_par exists
        let userData: { id: string; pseudo?: string; first_name?: string; last_name?: string } | undefined = undefined
        if (manualRevenue.enregistre_par) {
          const { data: user } = await supabase
            .from('dd-users')
            .select('id, pseudo, first_name, last_name')
            .eq('id', manualRevenue.enregistre_par)
            .single()
          if (user) {
            userData = {
              id: user.id,
              pseudo: user.pseudo,
              first_name: user.first_name,
              last_name: user.last_name
            }
          }
        }
        
        // This is a manual revenue
        setRevenue({
          id: manualRevenue.id,
          type: manualRevenue.type,
          montant: manualRevenue.montant || 0,
          date: manualRevenue.date,
          note: manualRevenue.note,
          description: manualRevenue.description,
          source_id: manualRevenue.source_id,
          revenue_source: 'manual',
          created_at: manualRevenue.created_at,
          enregistre_par: manualRevenue.enregistre_par,
          user: userData
        })
        setLoading(false)
        return
      }

      // If not found in dd-revenues, try dd-ventes (POS sale)
      const { data: sale, error: saleError } = await supabase
        .from('dd-ventes')
        .select('*')
        .eq('id', id)
        .single()

      if (sale && !saleError) {
        // Fetch client data separately if client_id exists
        let clientData: { id: string; first_name: string; last_name: string; phone?: string; email?: string } | undefined = undefined
        if (sale.client_id) {
          const { data: client } = await supabase
            .from('dd-clients')
            .select('id, first_name, last_name, phone, email')
            .eq('id', sale.client_id)
            .single()
          if (client) {
            clientData = {
              id: client.id,
              first_name: client.first_name || '',
              last_name: client.last_name || '',
              phone: client.phone,
              email: client.email
            }
          }
        }
        // Fetch sale items with products/services
        const { data: saleItems, error: itemsError } = await supabase
          .from('dd-ventes-items')
          .select(`
            *,
            product:dd-products(name, sku),
            service:dd-services(name)
          `)
          .eq('vente_id', sale.id)

        // Determine revenue source type
        const items = saleItems || []
        const hasProducts = items.some((item: any) => item.product_id && !item.service_id)
        const hasServices = items.some((item: any) => item.service_id && !item.product_id)
        let revenueSource: 'pos_product' | 'pos_service' = 'pos_product'
        if (hasServices && !hasProducts) {
          revenueSource = 'pos_service'
        }

        setRevenue({
          id: sale.id,
          type: revenueSource === 'pos_product' ? 'Vente Produit (POS)' : 'Vente Service (POS)',
          montant: sale.total_net || 0,
          date: sale.date,
          source_id: sale.id,
          revenue_source: revenueSource,
          created_at: sale.created_at || sale.date,
          sale: {
            id: sale.id,
            date: sale.date,
            total_brut: sale.total_brut || 0,
            reduction: sale.reduction || 0,
            total_net: sale.total_net || 0,
            methode_paiement: sale.methode_paiement || '',
            status: sale.status || '',
            client: clientData,
            items: items.map((item: any) => ({
              id: item.id,
              product_id: item.product_id,
              service_id: item.service_id,
              quantite: item.quantite || 0,
              prix_unitaire: item.prix_unitaire || 0,
              total: item.total || 0,
              product: item.product,
              service: item.service
            }))
          }
        })
        setLoading(false)
        return
      }

      // If not found in either table
      toast.error('Revenu non trouvé')
      router.push('/admin/revenues')
    } catch (error: any) {
      console.error('Error fetching revenue details:', error)
      toast.error('Erreur lors du chargement du revenu')
      setLoading(false)
    }
  }

  const getTypeColor = (type: string, revenueSource?: string) => {
    if (revenueSource === 'pos_product') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    }
    if (revenueSource === 'pos_service') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    }
    switch (type) {
      case 'vente':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'service':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'abonnement':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'partenariat':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(0)}f`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <TableLoadingState />
      </div>
    )
  }

  if (!revenue) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => router.push('/admin/revenues')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 dark:text-gray-400">Revenu non trouvé</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/admin/revenues')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Détails du Revenu</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {revenue.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Revenue Overview */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Informations Générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
              <Badge className={getTypeColor(revenue.type, revenue.revenue_source)}>
                {revenue.type}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Montant</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(revenue.montant)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(revenue.date).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Manual Revenue Details */}
          {revenue.revenue_source === 'manual' && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              {revenue.description && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Description</p>
                  <p className="text-sm text-gray-900 dark:text-white">{revenue.description}</p>
                </div>
              )}
              {revenue.note && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Note</p>
                  <p className="text-sm text-gray-900 dark:text-white">{revenue.note}</p>
                </div>
              )}
              {revenue.user && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Enregistré par</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {revenue.user.pseudo || `${revenue.user.first_name || ''} ${revenue.user.last_name || ''}`.trim() || 'Utilisateur'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* POS Sale Details */}
          {revenue.revenue_source && revenue.revenue_source !== 'manual' && revenue.sale && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Brut</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(revenue.sale.total_brut)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Réduction</p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatCurrency(revenue.sale.reduction)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Méthode de Paiement</p>
                  <Badge variant="outline">{revenue.sale.methode_paiement}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Statut</p>
                  <Badge variant={revenue.sale.status === 'paye' ? 'default' : 'secondary'}>
                    {revenue.sale.status}
                  </Badge>
                </div>
              </div>

              {revenue.sale.client && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Client</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {revenue.sale.client.first_name} {revenue.sale.client.last_name}
                    </p>
                    {revenue.sale.client.phone && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • {revenue.sale.client.phone}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items Sold (for POS sales) */}
      {revenue.sale && revenue.sale.items && revenue.sale.items.length > 0 && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5" />
              Articles Vendus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Article</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Prix Unitaire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenue.sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Produit
                        </Badge>
                      ) : item.service ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Service
                        </Badge>
                      ) : (
                        <Badge variant="outline">Autre</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.product?.name || item.service?.name || 'Article inconnu'}
                        </p>
                        {item.product?.sku && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {item.product.sku}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.quantite}</TableCell>
                    <TableCell>{formatCurrency(item.prix_unitaire)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(revenue.montant)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

