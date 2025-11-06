"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Bell, 
  Search, 
  Eye, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  XCircle,
  Calendar,
  User
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Notification {
  id: string
  type: string // vente, rdv, stock, promo, depense
  message: string
  cible_type: 'client' | 'user' | 'all'
  cible_id?: string
  lu: boolean
  date: string
  created_by?: string
  client?: {
    id: string
    first_name: string
    last_name: string
  }
  user?: {
    id: string
    first_name: string
    last_name: string
  }
}

interface NotificationsListProps {
  onNotificationRead?: (notificationId: string) => void
  onNotificationArchived?: (notificationId: string) => void
}

export function NotificationsList({ onNotificationRead, onNotificationArchived }: NotificationsListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchNotifications()
  }, [currentPage, filterType, filterStatus])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      
      // Fetch notifications with related data based on cible_type
      let query = supabase
        .from('dd-notifications')
        .select('*', { count: 'exact' })
        .order('date', { ascending: false })

      // Apply filters
      if (filterType !== 'all') {
        query = query.eq('type', filterType)
      }
      if (filterStatus !== 'all') {
        if (filterStatus === 'unread') {
          query = query.eq('lu', false)
        } else if (filterStatus === 'read') {
          query = query.eq('lu', true)
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        toast.error('Erreur lors du chargement des notifications')
        return
      }

      // Fetch related client/user data separately
      const notificationsWithRelations = await Promise.all(
        (data || []).map(async (notif) => {
          let client = null
          let user = null
          
          if (notif.cible_type === 'client' && notif.cible_id) {
            const { data: clientData } = await supabase
              .from('dd-clients')
              .select('id, first_name, last_name')
              .eq('id', notif.cible_id)
              .single()
            client = clientData
          } else if (notif.cible_type === 'user' && notif.cible_id) {
            const { data: userData } = await supabase
              .from('dd-users')
              .select('id, first_name, last_name')
              .eq('id', notif.cible_id)
              .single()
            user = userData
          }
          
          return { ...notif, client, user }
        })
      )
      
      setNotifications(notificationsWithRelations)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement des notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('dd-notifications')
        .update({ 
          lu: true
        })
        .eq('id', notificationId)

      if (error) {
        console.error('Error marking notification as read:', error)
        toast.error('Erreur lors de la mise à jour')
        return
      }

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, lu: true }
            : notif
        )
      )
      
      onNotificationRead?.(notificationId)
      toast.success('Notification marquée comme lue')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleArchive = async (notificationId: string) => {
    try {
      // For now, we'll just delete the notification since there's no archive field
      const { error } = await supabase
        .from('dd-notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        console.error('Error deleting notification:', error)
        toast.error('Erreur lors de la suppression')
        return
      }

      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      
      onNotificationArchived?.(notificationId)
      toast.success('Notification supprimée')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vente': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rdv': return <Calendar className="h-4 w-4 text-blue-500" />
      case 'stock': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'promo': return <Info className="h-4 w-4 text-purple-500" />
      case 'depense': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'vente': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'rdv': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'promo': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'depense': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'vente': return 'Vente'
      case 'rdv': return 'Rendez-vous'
      case 'stock': return 'Stock'
      case 'promo': return 'Promotion'
      case 'depense': return 'Dépense'
      default: return type
    }
  }

  const getStatusColor = (lu: boolean) => {
    return lu 
      ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
  }

  const filteredNotifications = notifications.filter(notification =>
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.user?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.lu).length,
    today: notifications.filter(n => 
      new Date(n.date).toDateString() === new Date().toDateString()
    ).length,
    clients: notifications.filter(n => n.cible_type === 'client').length
  }

  if (loading) {
    return <ButtonLoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gérez toutes les notifications et alertes du système
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Non lues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.clients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher dans les notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les types</option>
                <option value="vente">Vente</option>
                <option value="rdv">Rendez-vous</option>
                <option value="stock">Stock</option>
                <option value="promo">Promotion</option>
                <option value="depense">Dépense</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="unread">Non lues</option>
                <option value="read">Lues</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Liste des Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucune notification trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(notification.type)}
                          <Badge className={getTypeColor(notification.type)}>
                            {getTypeText(notification.type)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {notification.message}
                      </TableCell>
                      <TableCell>
                        {notification.cible_type === 'client' && notification.client ? (
                          <div>
                            <p className="font-medium">{notification.client.first_name} {notification.client.last_name}</p>
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              Client
                            </Badge>
                          </div>
                        ) : notification.cible_type === 'user' && notification.user ? (
                          <div>
                            <p className="font-medium">{notification.user.first_name} {notification.user.last_name}</p>
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              Utilisateur
                            </Badge>
                          </div>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">
                            Tous
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(notification.lu)}>
                          {notification.lu ? 'Lue' : 'Non lue'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(notification.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {!notification.lu && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleArchive(notification.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
