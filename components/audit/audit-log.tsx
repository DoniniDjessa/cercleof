"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Activity, 
  Search, 
  User, 
  Calendar,
  Eye,
  Filter,
  Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_values?: any
  new_values?: any
  ip_address?: string
  user_agent?: string
  created_at: string
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
}

export function AuditLog() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState<string>('all')
  const [filterEntity, setFilterEntity] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchAuditLogs()
  }, [currentPage, filterAction, filterEntity])

  const fetchAuditLogs = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('dd-actions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // Apply filters
      if (filterAction !== 'all') {
        query = query.eq('action', filterAction)
      }
      if (filterEntity !== 'all') {
        query = query.eq('entity_type', filterEntity)
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      // Fetch audit logs first
      const { data: auditLogsData, error, count } = await query

      if (error) {
        console.error('Error fetching audit logs:', error)
        toast.error('Erreur lors du chargement du journal d\'audit')
        return
      }

      if (!auditLogsData || auditLogsData.length === 0) {
        setAuditLogs([])
        setTotalPages(Math.ceil((count || 0) / itemsPerPage))
        return
      }

      // Fetch users separately
      const userIds = auditLogsData
        .map(log => log.user_id)
        .filter((id): id is string => !!id)

      const usersMap = new Map<string, { first_name: string; last_name: string; email: string; role: string }>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('dd-users')
          .select('id, first_name, last_name, email, role')
          .in('id', userIds)
        
        users?.forEach(user => {
          usersMap.set(user.id, {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            role: user.role || ''
          })
        })
      }

      // Map users to audit logs
      const auditLogsWithUsers = auditLogsData.map(log => ({
        ...log,
        user: log.user_id ? usersMap.get(log.user_id) : undefined
      })) as AuditLog[]

      setAuditLogs(auditLogsWithUsers)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors du chargement du journal d\'audit')
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'delete': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'login': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'logout': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'user': return '👤'
      case 'client': return '👥'
      case 'product': return '📦'
      case 'service': return '✂️'
      case 'sale': return '💰'
      case 'appointment': return '📅'
      case 'delivery': return '🚚'
      case 'revenue': return '📈'
      case 'expense': return '📉'
      case 'promotion': return '🏷️'
      case 'loyalty': return '⭐'
      default: return '📄'
    }
  }

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: auditLogs.length,
    today: auditLogs.filter(log => 
      new Date(log.created_at).toDateString() === new Date().toDateString()
    ).length,
    creates: auditLogs.filter(log => log.action.toLowerCase() === 'create').length,
    updates: auditLogs.filter(log => log.action.toLowerCase() === 'update').length,
    deletes: auditLogs.filter(log => log.action.toLowerCase() === 'delete').length
  }

  const exportAuditLog = () => {
    const csvContent = [
      ['Date', 'Utilisateur', 'Action', 'Entité', 'ID Entité', 'IP', 'User Agent'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString('fr-FR'),
        `${log.user?.first_name} ${log.user?.last_name}`,
        log.action,
        log.entity_type,
        log.entity_id,
        log.ip_address || '',
        log.user_agent || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <ButtonLoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Journal d'Audit</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Suivez toutes les actions et modifications dans le système
          </p>
        </div>
        <Button onClick={exportAuditLog} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Créations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.creates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Modifications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.updates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Suppressions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.deletes}</p>
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
                  placeholder="Rechercher dans le journal d'audit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Toutes les actions</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="delete">Suppression</option>
                <option value="login">Connexion</option>
                <option value="logout">Déconnexion</option>
              </select>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Toutes les entités</option>
                <option value="user">Utilisateurs</option>
                <option value="client">Clients</option>
                <option value="product">Produits</option>
                <option value="service">Services</option>
                <option value="sale">Ventes</option>
                <option value="appointment">Rendez-vous</option>
                <option value="delivery">Livraisons</option>
                <option value="revenue">Revenus</option>
                <option value="expense">Dépenses</option>
                <option value="promotion">Promotions</option>
                <option value="loyalty">Fidélité</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Journal d'Audit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date(log.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {log.user?.first_name} {log.user?.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.user?.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          {log.user?.role}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getActionColor(log.action)}>
                        {log.action.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getEntityIcon(log.entity_type)}</span>
                        <span className="capitalize">{log.entity_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {log.entity_id.substring(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-mono">
                        {log.ip_address || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
