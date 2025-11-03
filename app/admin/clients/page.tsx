'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { TableLoadingState } from '@/components/ui/context-loaders'
import { Eye, Trash2, Search, Mail, Phone } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ClientsAdd } from '@/components/clients/clients-add'

interface Client {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  phones?: string[] // Support for multiple phone numbers
  date_of_birth?: string
  gender?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  preferred_contact_method?: string
  marketing_consent: boolean
  is_active: boolean
  created_at: string
  created_by?: string
}

export default function ClientsPage() {
  const { user: authUser } = useAuth()
  const { t } = useTheme()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    fetchClients()
    fetchCurrentUserRole()
    
    // Check if we should show the create form based on URL params
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams, currentPage])

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching current user role:', error)
        setCurrentUserRole('')
        return
      }

      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Error fetching current user role:', error)
      setCurrentUserRole('')
    }
  }

  // Check if user can add clients (admin, manager, caissiere, superadmin)
  const canAddClients = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'caissiere' || currentUserRole === 'superadmin'
  
  // Check if user can edit/delete clients (admin, manager, superadmin)
  const canEditClients = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const fetchClients = async () => {
    setLoading(true)
    try {
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-clients')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      
      setClients(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching clients:', error)
      toast.error('Error fetching clients')
    } finally {
      setLoading(false)
    }
  }

  const deleteClient = async (clientId: string, clientName: string) => {
    if (!canEditClients) {
      toast.error('You do not have permission to delete clients')
      return
    }

    if (!confirm(`Are you sure you want to delete client ${clientName}? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
      fetchClients()
      toast.success('Client deleted successfully!')
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Error deleting client')
    }
  }

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.phones?.some(phone => phone.includes(searchTerm))
  )

  const getStatusColor = (status: boolean) => {
    return status 
      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" 
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
  }

  const getStatusText = (status: boolean) => {
    return status ? "Active" : "Inactive"
  }

  if (loading && clients.length === 0) {
    return <TableLoadingState />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Clients</h1>
          <p className="text-muted-foreground dark:text-gray-400">Manage your client database.</p>
        </div>
        {canAddClients && (
          <AnimatedButton onClick={() => {
            setShowCreateForm(!showCreateForm)
            if (showCreateForm) {
              // Clear URL parameters when canceling
              window.history.replaceState({}, '', '/admin/clients')
            }
          }} delay={0.1}>
            {showCreateForm ? 'Cancel' : 'Add Client'}
          </AnimatedButton>
        )}
      </div>

      {/* Create Client Form */}
      {showCreateForm && <ClientsAdd onClientCreated={fetchClients} />}

      {/* Only show clients list when not in create mode */}
      {!showCreateForm && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{clients.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Active Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{clients.filter((c) => c.is_active).length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Business Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{clients.filter((c) => c.preferred_contact_method === 'business').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Search Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clients Table */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Client List ({filteredClients.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-700">
                      <TableHead className="text-gray-600 dark:text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Company</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {client.first_name} {client.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{client.email || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {client.phones && client.phones.length > 0 
                                ? client.phones.filter(phone => phone.trim()).join(', ') 
                                : client.phone || '—'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">{client.preferred_contact_method || '—'}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">Individual</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(client.is_active)}>
                            {getStatusText(client.is_active)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Link href={`/admin/clients/${client.id}`}>
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {canEditClients && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                onClick={() => deleteClient(client.id, `${client.first_name} ${client.last_name}`)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredClients.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No clients found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, clients.length)} of {clients.length} clients
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
