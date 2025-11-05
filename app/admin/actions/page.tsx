"use client"

import { useState, useEffect } from 'react'
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
  X
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
    role: string
  }
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

  useEffect(() => {
    if (isAdmin) {
      fetchActions()
    }
  }, [isAdmin, currentPage, filterType])

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
            role
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

      setActions(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des actions')
    } finally {
      setLoading(false)
    }
  }

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

  const filteredActions = actions.filter(action =>
    action.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.cible_table.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucune action trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredActions.map((action) => (
                    <TableRow key={action.id}>
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
                              {action.user.first_name} {action.user.last_name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {action.user.email}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {action.user.role}
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
                    </TableRow>
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

