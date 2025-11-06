"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, ArrowLeft, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { useAuth } from "@/contexts/AuthContext"
import toast from "react-hot-toast"

interface Service {
  id: string
  name: string  // English DB column (primary - actual column name)
  nom?: string  // French (for backward compatibility)
  description?: string
  category_id?: string
  price: number  // English DB column (primary - actual column name)
  prix_base?: number  // French (for backward compatibility)
  duration_minutes: number  // English DB column (primary - actual column name)
  duration?: number  // Alternative name
  duree?: number  // French (for backward compatibility)
  employe_type?: string  // May not exist in actual DB
  employee_type?: string  // Alternative name
  commission_employe?: number  // May not exist in actual DB
  commission_rate?: number  // Alternative name
  is_active: boolean  // DB column (primary - actual column name)
  actif?: boolean  // French (for backward compatibility)
  popularite?: number  // May not exist in actual DB
  popularity?: number  // Alternative name
  tags: string[]
  images?: string[]  // JSONB array (primary - actual column name)
  photo?: string  // French (for backward compatibility)
  created_at: string
  category?: {
    id: string
    name: string
  }
}

interface ServiceProduct {
  id: string
  service_id: string
  product_id: string
  quantite: number
  product: {
    id: string
    name: string
    sku?: string
    price: number
    stock_quantity: number
  }
}

interface ServiceDetailsProps {
  serviceId?: string
}

export function ServiceDetails({ serviceId }: ServiceDetailsProps) {
  const { user: authUser } = useAuth()
  const [service, setService] = useState<Service | null>(null)
  const [serviceProducts, setServiceProducts] = useState<ServiceProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  useEffect(() => {
    if (serviceId) {
      fetchService()
      fetchCurrentUserRole()
    }
  }, [serviceId])

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser?.id)
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

  // Check if user can manage services (admin, manager, superadmin)
  const canManageServices = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchService = async () => {
    try {
      setLoading(true)
      
      // Fetch service details
      const { data: serviceData, error: serviceError } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:dd-categories(id, name)
        `)
        .eq('id', serviceId)
        .single()

      if (serviceError) {
        console.error('Error fetching service:', serviceError)
        throw serviceError
      }

      if (!serviceData) {
        throw new Error('Service not found')
      }

      // Fetch service products
      const { data: productsData, error: productsError } = await supabase
        .from('dd-services-produits')
        .select(`
          *,
          product:dd-products(id, name, sku, price, stock_quantity)
        `)
        .eq('service_id', serviceId)

      if (productsError) throw productsError

      setService(serviceData as unknown as Service)
      setServiceProducts((productsData || []) as unknown as ServiceProduct[])
    } catch (error) {
      console.error('Error fetching service:', error)
      setError('Erreur lors de la récupération du service')
      toast.error('Erreur lors de la récupération du service')
    } finally {
      setLoading(false)
    }
  }

  const deleteService = async () => {
    if (!service || !canManageServices) {
      toast.error('Vous n\'avez pas la permission de supprimer des services')
      return
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le service "${service.name || service.nom || 'Service'}"? Cette action ne peut pas être annulée.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-services')
        .delete()
        .eq('id', service.id)

      if (error) throw error
      
      toast.success('Service supprimé avec succès!')
      window.history.back()
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Erreur lors de la suppression du service')
    }
  }

  const getEmployeeTypeText = (type?: string) => {
    switch (type) {
      case 'esthéticienne': return 'Esthéticienne'
      case 'coiffeuse': return 'Coiffeuse'
      case 'manucure': return 'Manucure'
      case 'massage': return 'Massage'
      case 'autre': return 'Autre'
      default: return 'Non spécifié'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ButtonLoadingSpinner />
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement du service...</p>
        </div>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Service non trouvé'}</p>
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => window.history.back()}
          className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">{service.name || service.nom}</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            {service.category?.name || 'Non catégorisé'} • {service.duration_minutes || service.duration || service.duree || 0} minutes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Image */}
          {((service.images && service.images.length > 0) || service.photo) && (
            <Card className="bg-white dark:bg-gray-800 ">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Image du Service</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={(service.images && service.images[0]) || service.photo}
                    alt={service.name || service.nom || 'Service'}
                    className="w-full max-w-md h-64 object-cover rounded-sm border border-gray-200 dark:border-gray-600"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Information */}
          <Card className="bg-white dark:bg-gray-800 ">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Informations du Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Catégorie</p>
                  <p className="font-medium text-gray-900 dark:text-white">{service.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Statut</p>
                  <Badge className={
                    (service.is_active ?? service.actif ?? false)
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }>
                    {(service.is_active ?? service.actif ?? false) ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Type d&apos;Employé</p>
                  <p className="font-medium text-gray-900 dark:text-white">{getEmployeeTypeText(service.employee_type || service.employe_type || '')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Popularité</p>
                  <p className="font-medium text-gray-900 dark:text-white">{service.popularity || service.popularite || 0} points</p>
                </div>
              </div>
              {service.description && (
                <div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">Description</p>
                  <p className="text-sm text-gray-900 dark:text-white">{service.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & Duration */}
          <Card className="bg-white dark:bg-gray-800 ">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Tarification et Durée</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-sm">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Prix de Base</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{(service.price || service.prix_base || 0).toFixed(0)}f</p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-sm">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Durée</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{service.duration_minutes || service.duration || service.duree || 0} min</p>
                </div>
                <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-sm">
                  <p className="text-xs text-muted-foreground dark:text-gray-400">Commission Employé</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{(service.commission_rate || service.commission_employe || 0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Used */}
          {serviceProducts.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 ">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Produits Utilisés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceProducts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{item.product.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            SKU: {item.product.sku || 'N/A'} • Stock: {item.product.stock_quantity}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{item.quantite} unité(s)</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.product.price.toFixed(0)}f/unité
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {service.tags.length > 0 && (
            <Card className="bg-white dark:bg-gray-800 ">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {service.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-md text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <Card className="bg-white dark:bg-gray-800 ">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManageServices && (
                <>
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Edit className="w-4 h-4" />
                    Modifier le Service
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2"
                    onClick={deleteService}
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer le Service
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Service Statistics */}
          <Card className="bg-white dark:bg-gray-800 ">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-sm">
                <p className="text-xs text-muted-foreground dark:text-gray-400">Prix de Base</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {(service.price || service.prix_base || 0).toFixed(0)}f
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-sm">
                <p className="text-xs text-muted-foreground dark:text-gray-400">Commission Employé</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {(service.commission_rate || service.commission_employe || 0)}%
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-sm">
                <p className="text-xs text-muted-foreground dark:text-gray-400">Date de Création</p>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  {new Date(service.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
