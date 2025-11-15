"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TableLoadingState, ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { supabase } from "@/lib/supabase"
import { 
  Truck, MapPin, User, Package, Clock, DollarSign, 
  ArrowLeft, Edit, Phone, Mail, Calendar, FileText,
  Image as ImageIcon, CheckCircle, XCircle, AlertCircle
} from "lucide-react"
import toast from "react-hot-toast"
import { EditDelivery } from "./edit-delivery"

interface Delivery {
  id: string
  vente_id?: string
  client_id?: string
  adresse: string
  livreur_id?: string
  statut: string
  date_livraison?: string
  frais: number
  mode: string
  preuve_photo?: string
  note?: string
  contact_phone?: string
  created_at: string
  updated_at?: string
  vente?: {
    id: string
    total_net: number
    date: string
    type: string
  }
  client?: {
    id: string
    first_name: string
    last_name: string
    email?: string | null
    phone?: string | null
  }
  livreur?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
  created_by_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

interface DeliveryDetailsProps {
  deliveryId: string
}

export function DeliveryDetails({ deliveryId }: DeliveryDetailsProps) {
  const router = useRouter()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    fetchDelivery()
  }, [deliveryId])

  const fetchDelivery = async () => {
    try {
      setLoading(true)
      
      // Fetch delivery with related data
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('dd-livraisons')
        .select('*')
        .eq('id', deliveryId)
        .single()

      if (deliveryError) throw deliveryError

      if (!deliveryData) {
        toast.error('Livraison introuvable')
        router.push('/admin/deliveries')
        return
      }

      // Fetch related data
      const promises: Array<Promise<{ type: string; data: any; error: any }>> = []

      // Fetch sale if exists
      if (deliveryData.vente_id) {
        promises.push(
          Promise.resolve(
            supabase
              .from('dd-ventes')
              .select('id, total_net, date, type')
              .eq('id', deliveryData.vente_id)
              .single()
          ).then(({ data, error }) => ({ type: 'vente', data, error }))
        )
      }

      // Fetch client if exists
      if (deliveryData.client_id) {
        promises.push(
          Promise.resolve(
            supabase
              .from('dd-clients')
              .select('id, first_name, last_name, email, phone')
              .eq('id', deliveryData.client_id)
              .single()
          ).then(({ data, error }) => ({ type: 'client', data, error }))
        )
      }

      // Fetch livreur if exists
      if (deliveryData.livreur_id) {
        promises.push(
          Promise.resolve(
            supabase
              .from('dd-users')
              .select('id, first_name, last_name, role')
              .eq('id', deliveryData.livreur_id)
              .single()
          ).then(({ data, error }) => ({ type: 'livreur', data, error }))
        )
      }

      // Fetch created_by user
      if (deliveryData.created_by) {
        promises.push(
          Promise.resolve(
            supabase
              .from('dd-users')
              .select('id, first_name, last_name')
              .eq('id', deliveryData.created_by)
              .single()
          ).then(({ data, error }) => ({ type: 'created_by', data, error }))
        )
      }

      const results = await Promise.all(promises)

      const deliveryWithRelations: Delivery = { ...deliveryData }

      results.forEach((result: any) => {
        if (result.error) {
          console.error(`Error fetching ${result.type}:`, result.error)
          return
        }

        switch (result.type) {
          case 'vente':
            deliveryWithRelations.vente = result.data
            break
          case 'client':
            deliveryWithRelations.client = result.data
            break
          case 'livreur':
            deliveryWithRelations.livreur = result.data
            break
          case 'created_by':
            deliveryWithRelations.created_by_user = result.data
            break
        }
      })

      setDelivery(deliveryWithRelations)
    } catch (error: any) {
      console.error('Error fetching delivery:', error)
      toast.error(`Erreur lors du chargement de la livraison: ${error.message}`)
      router.push('/admin/deliveries')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_preparation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'expedie':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'livre':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'annule':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'retourne':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_preparation': return 'En Préparation'
      case 'expedie': return 'Expédié'
      case 'livre': return 'Livré'
      case 'annule': return 'Annulé'
      case 'retourne': return 'Retourné'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'livre':
        return <CheckCircle className="w-5 h-5" />
      case 'annule':
        return <XCircle className="w-5 h-5" />
      case 'expedie':
        return <Truck className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <TableLoadingState />
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="p-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Livraison introuvable</p>
            <Button onClick={() => router.push('/admin/deliveries')} className="mt-4">
              Retour à la liste
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (editing) {
    return (
      <EditDelivery 
        delivery={delivery} 
        onDeliveryUpdated={() => {
          setEditing(false)
          fetchDelivery()
        }} 
        onCancel={() => setEditing(false)} 
      />
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/deliveries')}
            className="text-gray-600 dark:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">Détails de la Livraison</h1>
            <p className="text-muted-foreground dark:text-gray-400">Informations complètes sur la livraison</p>
          </div>
        </div>
        <Button
          onClick={() => setEditing(true)}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
        >
          <Edit className="w-4 h-4 mr-2" />
          Modifier
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                {getStatusIcon(delivery.statut)}
                Statut de la Livraison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${getStatusColor(delivery.statut)} text-base px-4 py-2`}>
                {getStatusText(delivery.statut)}
              </Badge>
            </CardContent>
          </AnimatedCard>

          {/* Delivery Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Informations de Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Adresse</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">{delivery.adresse}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mode</p>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    {delivery.mode === 'interne' ? 'Interne' : 'Externe'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Frais</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{delivery.frais.toFixed(0)}f</p>
                </div>
              </div>
              {delivery.date_livraison && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date de Livraison
                  </p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {new Date(delivery.date_livraison).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
              {delivery.contact_phone && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Téléphone de Contact
                  </p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{delivery.contact_phone}</p>
                </div>
              )}
            </CardContent>
          </AnimatedCard>

          {/* Client Information */}
          {delivery.client && (
            <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nom</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {delivery.client.first_name} {delivery.client.last_name}
                  </p>
                </div>
                {delivery.client.email && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="text-base text-gray-900 dark:text-white">{delivery.client.email}</p>
                  </div>
                )}
                {delivery.client.phone && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </p>
                    <p className="text-base text-gray-900 dark:text-white">{delivery.client.phone}</p>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>
          )}

          {/* Livreur Information */}
          {delivery.livreur && (
            <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Livreur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Nom</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {delivery.livreur.first_name} {delivery.livreur.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rôle</p>
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                    {delivery.livreur.role}
                  </Badge>
                </div>
              </CardContent>
            </AnimatedCard>
          )}

          {/* Notes */}
          {delivery.note && (
            <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.5}>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{delivery.note}</p>
              </CardContent>
            </AnimatedCard>
          )}

          {/* Proof Photo */}
          {delivery.preuve_photo && (
            <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.6}>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Preuve de Livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative w-full max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={delivery.preuve_photo} 
                    alt="Preuve de livraison" 
                    className="w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </CardContent>
            </AnimatedCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Sale Information */}
          {delivery.vente && (
            <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.7}>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Vente Associée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Référence</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">#{delivery.vente.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Montant Total
                  </p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    {delivery.vente.total_net.toFixed(0)}f
                  </p>
                </div>
                {delivery.vente.date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date
                    </p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {new Date(delivery.vente.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/admin/sales/${delivery.vente?.id}`)}
                  className="w-full mt-2"
                >
                  Voir la vente
                </Button>
              </CardContent>
            </AnimatedCard>
          )}

          {/* Metadata */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.8}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Informations Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé le</p>
                <p className="text-base text-gray-900 dark:text-white">
                  {new Date(delivery.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              {delivery.updated_at && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Modifié le</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {new Date(delivery.updated_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              )}
              {delivery.created_by_user && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Créé par</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {delivery.created_by_user.first_name} {delivery.created_by_user.last_name}
                  </p>
                </div>
              )}
            </CardContent>
          </AnimatedCard>
        </div>
      </div>
    </div>
  )
}

