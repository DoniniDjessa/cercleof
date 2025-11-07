"use client"

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Activity, 
  Search, 
  Filter,
  User,
  Calendar,
  FileText,
  X,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Action {
  id: string
  user_id: string
  type: string
  cible_table: string
  cible_id: string | null
  description: string
  ip_address: string | null
  user_agent: string | null
  date: string
  user?: {
    first_name: string
    last_name: string
    email: string
    pseudo: string
  }
}

interface ActionDetails {
  sale?: any
  client?: any
  items?: any[]
  delivery?: any
}

export default function ActionsPage() {
  const { user: authUser } = useAuth()
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [actionDetails, setActionDetails] = useState<Record<string, ActionDetails>>({})
  const itemsPerPage = 50

  // Check if user is admin (only admins can access this page)
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin'

  useEffect(() => {
    fetchCurrentUserRole()
  }, [authUser])

  const fetchCurrentUserRole = async () => {
    try {
      if (!authUser?.id) {
        setCheckingRole(false)
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current user role:', error)
        setCurrentUserRole('')
        setCheckingRole(false)
        return
      }

      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error:', error)
      setCurrentUserRole('')
    } finally {
      setCheckingRole(false)
    }
  }

  const fetchActions = async () => {
    try {
      setLoading(true)
      
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      let query = supabase
        .from('dd-actions')
        .select(`
          *,
          user:dd-users!dd-actions_user_id_fkey(
            id,
            first_name,
            last_name,
            email,
            pseudo
          )
        `, { count: 'exact' })
        .order('date', { ascending: false })
        .range(from, to)

      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching actions:', error)
        toast.error('Erreur lors du chargement des actions')
        return
      }

      setActions((data as any) || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des actions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchActions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserRole, currentPage, filterType])

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vente': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'ajout': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'edition': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'suppression': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'connexion': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'vente': return 'Vente'
      case 'ajout': return 'Ajout'
      case 'edition': return 'Édition'
      case 'suppression': return 'Suppression'
      case 'connexion': return 'Connexion'
      default: return type
    }
  }

  const fetchActionDetails = async (action: Action) => {
    if (actionDetails[action.id]) {
      return // Already fetched
    }

    try {
      const details: ActionDetails = {}

      // If it's a sale action, fetch sale details
      if (action.type === 'vente' && action.cible_table === 'dd-ventes' && action.cible_id) {
        const { data: saleData, error: saleError } = await supabase
          .from('dd-ventes')
          .select(`
            *,
            client:dd-clients(id, first_name, last_name, email, phone),
            user:dd-users!dd-ventes_user_id_fkey(id, first_name, last_name, email, pseudo),
            items:dd-ventes-items(
              *,
              product:dd-products(id, name, sku),
              service:dd-services(id, name)
            )
          `)
          .eq('id', action.cible_id)
          .single()

        if (saleError) {
          console.error('Error fetching sale details:', saleError)
          // Set empty details to show error state
          setActionDetails(prev => ({ ...prev, [action.id]: { sale: null } }))
          return
        }

        if (saleData) {
          const sale = saleData as any
          details.sale = sale
          details.client = sale.client
          details.items = sale.items

          // Fetch delivery if exists (don't fail if not found)
          const { data: deliveryData } = await supabase
            .from('dd-livraisons')
            .select('*')
            .eq('vente_id', action.cible_id)
            .maybeSingle()

          if (deliveryData) {
            details.delivery = deliveryData
          }
        }
      }

      setActionDetails(prev => ({ ...prev, [action.id]: details }))
    } catch (error) {
      console.error('Error fetching action details:', error)
      // Set empty details on error
      setActionDetails(prev => ({ ...prev, [action.id]: { sale: null } }))
    }
  }

  const toggleActionDetails = async (actionId: string, action: Action) => {
    if (expandedAction === actionId) {
      setExpandedAction(null)
    } else {
      setExpandedAction(actionId)
      await fetchActionDetails(action)
    }
  }

  const deleteAction = async (actionId: string, actionDescription: string) => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas la permission de supprimer des actions')
      return
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer cette action ?\n\n"${actionDescription}"\n\nCette action ne peut pas être annulée.`)) {
      return
    }

    try {
      console.log('Deleting action:', actionId)
      
      const { error: deleteError, data: deletedAction } = await supabase
        .from('dd-actions')
        .delete()
        .eq('id', actionId)
        .select()

      if (deleteError) {
        console.error('Error deleting action:', deleteError)
        if (deleteError.message?.includes('policy') || deleteError.message?.includes('permission') || deleteError.message?.includes('RLS')) {
          toast.error('Permission insuffisante pour supprimer cette action. Vérifiez vos permissions RLS.')
        } else {
          toast.error(`Erreur lors de la suppression: ${deleteError.message}`)
        }
        return
      }

      if (!deletedAction || deletedAction.length === 0) {
        console.error('No rows deleted - action may not exist or RLS prevented deletion')
        toast.error('Aucune ligne supprimée. L\'action n\'existe peut-être pas ou vous n\'avez pas les permissions nécessaires.')
        return
      }

      console.log(`Successfully deleted action. Rows affected: ${deletedAction.length}`)

      // Remove from local state immediately
      setActions(prevActions => prevActions.filter(action => action.id !== actionId))
      
      // Clean up action details if expanded
      if (expandedAction === actionId) {
        setExpandedAction(null)
        setActionDetails(prev => {
          const updated = { ...prev }
          delete updated[actionId]
          return updated
        })
      }
      
      toast.success('Action supprimée avec succès!')
      
      // Refresh the list
      await fetchActions()
    } catch (error: any) {
      console.error('Error deleting action:', error)
      toast.error(`Erreur lors de la suppression: ${error?.message || 'Erreur inconnue'}`)
    }
  }

  const filteredActions = actions.filter(action =>
    action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.cible_table.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.pseudo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (checkingRole || loading) {
    return <ButtonLoadingSpinner />
  }

  // Access control: only admins can access this page
  if (!isAdmin) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <X className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Accès Interdit</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md">
                Vous n'avez pas les permissions nécessaires pour accéder à cette page.
                Seuls les administrateurs peuvent consulter les actions du système.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Actions du Système</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Historique complet de toutes les actions effectuées dans le système
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher dans les actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les types</option>
                <option value="vente">Ventes</option>
                <option value="ajout">Ajouts</option>
                <option value="edition">Éditions</option>
                <option value="suppression">Suppressions</option>
                <option value="connexion">Connexions</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Liste des Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucune action trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <React.Fragment key={action.id}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {new Date(action.date).toLocaleString('fr-FR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {action.user ? (
                            <div>
                              <div className="font-medium">
                                {action.user.pseudo || action.user.email}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {action.user.first_name} {action.user.last_name}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Utilisateur supprimé</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(action.type)}>
                            {getTypeText(action.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {action.cible_table}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md truncate" title={action.description}>
                            {action.description}
                          </div>
                        </TableCell>
                        <TableCell>
                          {action.ip_address ? (
                            <code className="text-xs text-gray-500">{action.ip_address}</code>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {action.type === 'vente' && action.cible_table === 'dd-ventes' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleActionDetails(action.id, action)}
                                className="h-8 w-8 p-0"
                                title="Voir les détails"
                              >
                                {expandedAction === action.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAction(action.id, action.description)}
                                className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {!isAdmin && action.type !== 'vente' && action.cible_table !== 'dd-ventes' && (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedAction === action.id && action.type === 'vente' && action.cible_table === 'dd-ventes' && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-gray-50 dark:bg-gray-900/50 p-4">
                            {!actionDetails[action.id] ? (
                              <div className="text-xs text-gray-500">Chargement des détails...</div>
                            ) : actionDetails[action.id]?.sale === null ? (
                              <div className="text-xs text-red-500">Erreur: Impossible de charger les détails de la vente</div>
                            ) : actionDetails[action.id]?.sale ? (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">Détails de la Vente</h4>
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <span className="text-gray-500">Client:</span>{' '}
                                      {actionDetails[action.id].client ? (
                                        <span>{actionDetails[action.id].client?.first_name} {actionDetails[action.id].client?.last_name}</span>
                                      ) : (
                                        <span className="text-gray-400">Client anonyme</span>
                                      )}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Vendeur:</span>{' '}
                                      <span>{actionDetails[action.id].sale?.user?.pseudo || actionDetails[action.id].sale?.user?.email}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Total:</span>{' '}
                                      <span>{actionDetails[action.id].sale?.total_net?.toFixed(0)}f</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Méthode:</span>{' '}
                                      <span>{actionDetails[action.id].sale?.methode_paiement}</span>
                                    </div>
                                  </div>
                                </div>
                                {actionDetails[action.id].items && actionDetails[action.id].items!.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">Produits/Services</h4>
                                    <div className="space-y-1">
                                      {actionDetails[action.id].items?.map((item: any) => (
                                        <div key={item.id} className="text-xs flex justify-between">
                                          <span>
                                            {item.product ? item.product.name : item.service ? item.service.name : item.product_id ? 'inconnu' : 'N/A'} x {item.quantite}
                                          </span>
                                          <span>{item.total?.toFixed(0)}f</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {actionDetails[action.id].delivery && (
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2">Livraison</h4>
                                    <div className="text-xs">
                                      <div>
                                        <span className="text-gray-500">Adresse:</span> {actionDetails[action.id].delivery?.adresse}
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Statut:</span> {actionDetails[action.id].delivery?.statut}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">Chargement des détails...</div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

