"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Search, Eye, Trash2, Package, Clock, DollarSign, Users, Scissors, Edit, Pencil, Check, X } from "lucide-react"
import { AddService } from "@/components/services/add-service"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import { useAuth } from "@/contexts/AuthContext"

interface Service {
  id: string
  name: string  // English DB column (primary - actual column name)
  nom?: string  // French (for backward compatibility)
  description?: string
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

export default function ServicesPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editingPriceValue, setEditingPriceValue] = useState<string>('')
  const [updatingPrice, setUpdatingPrice] = useState(false)

  useEffect(() => {
    const action = searchParams.get('action')
    const id = searchParams.get('id')
    if (action === 'create') {
      setShowCreateForm(true)
      setServiceId(null)
    } else if (action === 'edit' && id) {
      setShowCreateForm(true)
      setServiceId(id)
    } else {
      setShowCreateForm(false)
      setServiceId(null)
    }
  }, [searchParams])

  useEffect(() => {
    fetchServices()
    fetchCurrentUserRole()
  }, [currentPage])

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
  // Check if user can edit prices (admin, manager, superadmin, caissière)
  const canEditPrice = canManageServices || currentUserRole === 'caissière'

  const fetchServices = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:dd-categories(id, name)
        `, { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      setServices((data || []) as unknown as Service[])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching services:', error)
      toast.error('Erreur lors du chargement des services')
    } finally {
      setLoading(false)
    }
  }

  const startEditingPrice = (service: Service) => {
    if (!canEditPrice) {
      toast.error('Vous n&apos;avez pas la permission de modifier les prix')
      return
    }
    setEditingPriceId(service.id)
    setEditingPriceValue(String(service.price || service.prix_base || 0))
  }

  const cancelEditingPrice = () => {
    setEditingPriceId(null)
    setEditingPriceValue('')
  }

  const updateServicePrice = async (serviceId: string) => {
    if (!canEditPrice) {
      toast.error('Vous n&apos;avez pas la permission de modifier les prix')
      return
    }

    const newPrice = parseFloat(editingPriceValue)
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Veuillez entrer un prix valide')
      return
    }

    try {
      setUpdatingPrice(true)
      const { error } = await supabase
        .from('dd-services')
        .update({ price: newPrice })
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Prix mis à jour avec succès')
      setEditingPriceId(null)
      setEditingPriceValue('')
      fetchServices()
    } catch (error: any) {
      console.error('Error updating service price:', error)
      toast.error('Erreur lors de la mise à jour du prix')
    } finally {
      setUpdatingPrice(false)
    }
  }

  const deleteService = async (serviceId: string) => {
    if (!canManageServices) {
      toast.error('Vous n&apos;avez pas la permission de supprimer des services')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce service ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-services')
        .delete()
        .eq('id', serviceId)

      if (error) throw error

      toast.success('Service supprimé avec succès!')
      fetchServices()
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error('Erreur lors de la suppression du service')
    }
  }

  const getStatusColor = (active: boolean) => {
    return active 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  const getStatusText = (active: boolean) => {
    return active ? 'Actif' : 'Inactif'
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

  const filteredServices = services.filter(service => {
    const serviceName = service.name || service.nom || ''
    const employeeType = service.employee_type || service.employe_type || ''
    return serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  })

  const totalServices = services.length
  const activeServices = services.filter(s => s.is_active || s.actif).length
  const totalRevenue = services.reduce((sum, service) => sum + (service.price || service.prix_base || 0), 0)
  const averagePrice = totalServices > 0 ? totalRevenue / totalServices : 0

  if (showCreateForm) {
    return <AddService onServiceCreated={fetchServices} serviceId={serviceId} />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground dark:text-white">Services</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez tous vos services et prestations</p>
        </div>
        {canManageServices && (
          <AnimatedButton
            onClick={() => {
              router.push('/admin/services?action=create')
            }}
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Ajouter un Service
          </AnimatedButton>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 ">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-sm">
                <Scissors className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Services</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{totalServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 ">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-sm">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Services Actifs</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{activeServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 ">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-sm">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prix Moyen</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{averagePrice.toFixed(0)}f</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 ">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-sm">
                <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Durée Moyenne</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {totalServices > 0 ? Math.round(services.reduce((sum, s) => sum + (s.duration_minutes || s.duration || s.duree || 0), 0) / totalServices) : 0} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 ">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher des services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">Liste des Services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <TableLoadingState />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Image</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Nom</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Catégorie</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Prix</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Durée</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Type Employé</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider py-3 px-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((service, index) => (
                    <TableRow 
                      key={service.id} 
                      className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-700/30 dark:hover:to-transparent transition-all duration-200 group"
                    >
                      <TableCell className="py-3 px-4">
                        {(service.images && service.images.length > 0) || service.photo ? (
                          <div className="relative w-10 h-10 rounded-sm overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 group-hover:ring-pink-300 dark:group-hover:ring-pink-600 transition-all duration-200">
                            <Image
                              src={(service.images && service.images[0]) || service.photo || ''}
                              alt={service.name || service.nom || 'Service'}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-1 ring-gray-200 dark:ring-gray-700 group-hover:ring-pink-300 dark:group-hover:ring-pink-600 transition-all duration-200">
                            <Scissors className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-xs group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                            {service.name || service.nom}
                          </p>
                          {service.description && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="text-[10px] text-gray-900 dark:text-white">
                          {service.category?.name || 'Non catégorisé'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {editingPriceId === service.id ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              className="w-20 h-7 text-[10px] font-medium border-2 focus:border-pink-500 dark:focus:border-pink-400"
                              disabled={updatingPrice}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateServicePrice(service.id)
                                } else if (e.key === 'Escape') {
                                  cancelEditingPrice()
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateServicePrice(service.id)}
                              disabled={updatingPrice}
                              className="h-6 w-6 p-0 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Enregistrer"
                            >
                              <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditingPrice}
                              disabled={updatingPrice}
                              className="h-6 w-6 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Annuler"
                            >
                              <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingPrice(service)}
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all duration-200"
                              title="Modifier le prix"
                            >
                              <Pencil className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                            </Button>
                            <span className="font-medium text-gray-900 dark:text-white text-[10px]">
                              {(service.price || service.prix_base || 0).toFixed(0)}f
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="text-[10px] text-gray-900 dark:text-white">
                          {service.duration_minutes || service.duration || service.duree || 0} min
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <span className="text-[10px] text-gray-900 dark:text-white">
                          {getEmployeeTypeText(service.employee_type || service.employe_type || '')}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Badge 
                          className={`${getStatusColor(service.is_active ?? service.actif ?? false)} font-normal text-[10px] px-2 py-0.5`}
                        >
                          {getStatusText(service.is_active ?? service.actif ?? false)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              router.push(`/admin/services/${service.id}`)
                            }}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 rounded-lg"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canManageServices && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  router.push(`/admin/services?action=edit&id=${service.id}`)
                                }}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-200 rounded-lg"
                                title="Modifier le service"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteService(service.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 rounded-lg"
                                title="Supprimer le service"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-12 px-6 text-center">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Scissors className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun service trouvé</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Essayez de modifier votre recherche</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} sur {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
