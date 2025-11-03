'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { TableLoadingState, ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { Search, Mail, Phone, User, Shield, Crown, Users, CreditCard, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface User {
  id: string
  auth_user_id?: string
  email: string
  pseudo: string
  first_name: string
  last_name: string
  phone?: string
  role: string
  is_active: boolean
  hire_date?: string
  salary?: number
  created_at: string
}

export default function UsersManagementPage() {
  const { user: authUser } = useAuth()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    pseudo: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'employe'
  })

  useEffect(() => {
    fetchUsers()
    fetchCurrentUserRole()
    
    // Check if we should show the create form based on URL params
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  const fetchCurrentUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('id, role')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // User doesn't exist in our system - this should be handled by AuthContext
        console.log('User not found in dd-users table')
        setCurrentUserRole('')
        setCurrentUserId('')
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || '')
      setCurrentUserId(data?.id || '')
    } catch (error) {
      console.error('Error fetching current user role:', error)
      setCurrentUserRole('')
      setCurrentUserId('')
    }
  }

  // Check if user has admin or superadmin role
  const hasAdminAccess = currentUserRole === 'admin' || currentUserRole === 'superadmin'

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm)
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'caissiere':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusColor = (user: User) => {
    if (!user.auth_user_id) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    }
    return user.is_active 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  const getStatusText = (user: User) => {
    if (!user.auth_user_id) return 'Pending Signup'
    return user.is_active ? 'Active' : 'Inactive'
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Crown className="w-4 h-4" />
      case 'admin':
        return <Shield className="w-4 h-4" />
      case 'manager':
        return <Briefcase className="w-4 h-4" />
      case 'caissiere':
        return <CreditCard className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Error fetching users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Use API route to create user with admin privileges
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          pseudo: formData.pseudo,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          role: formData.role,
          created_by: currentUserId
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

          // Reset form and refresh users
          setFormData({
            email: '',
            password: '',
            pseudo: '',
            first_name: '',
            last_name: '',
            phone: '',
            role: 'employe'
          })
          setShowCreateForm(false)
          // Clear URL parameters
          window.history.replaceState({}, '', '/admin/users')
          fetchUsers()
      
      toast.success(result.message || 'User created successfully! They can now log in with their email and password.')
    } catch (error) {
      console.error('Error creating user:', error)
      toast.error('Error creating user: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dd-users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      fetchUsers()
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Error updating user status')
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    const userToDelete = users.find(u => u.id === userId)
    
    // Security checks
    if (!userToDelete) {
      toast.error('User not found')
      return
    }

    // Superadmin cannot delete themselves
    if (userToDelete.id === currentUserId) {
      toast.error('You cannot delete your own account')
      return
    }

    // Superadmin is undeletable (only superadmin can delete superadmin, but not themselves)
    if (userToDelete.role === 'superadmin') {
      toast.error('Superadmin accounts cannot be deleted')
      return
    }

    // Only superadmin can delete admin users
    if (userToDelete.role === 'admin' && currentUserRole !== 'superadmin') {
      toast.error('Only superadmin can delete admin users')
      return
    }

    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      // First, try to delete the auth user if it exists
      if (userToDelete.auth_user_id) {
        try {
          const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.auth_user_id)
          if (authError) {
            console.log('Could not delete auth user:', authError)
            // Continue with profile deletion even if auth deletion fails
          } else {
            console.log('Auth user deleted successfully')
          }
        } catch (authError) {
          console.log('Auth user deletion failed:', authError)
          // Continue with profile deletion
        }
      }

      // Delete the user profile
      const { error } = await supabase
        .from('dd-users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Profile deletion error:', error)
        throw error
      }

      console.log('User profile deleted successfully')
      fetchUsers()
      toast.success('User deleted successfully!')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Error deleting user: ' + (error as Error).message)
    }
  }

  if (loading && users.length === 0) {
    return <TableLoadingState />
  }

  // Check access permissions
  if (!hasAdminAccess) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access the user management page. Only administrators and super administrators can view this page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Your current role: <span className="font-medium">{currentUserRole || 'Unknown'}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Users</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Manage staff members and their roles
            {currentUserRole === 'superadmin' && (
              <span className="ml-2 text-sm bg-red-100 text-red-800 px-2 py-1 rounded dark:bg-red-900/20 dark:text-red-400">
                Superadmin Access
              </span>
            )}
          </p>
        </div>
        <AnimatedButton onClick={() => {
          setShowCreateForm(!showCreateForm)
          if (showCreateForm) {
            // Clear URL parameters when canceling
            window.history.replaceState({}, '', '/admin/users')
          }
        }} delay={0.1}>
          {showCreateForm ? 'Cancel' : 'Add User'}
        </AnimatedButton>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <AnimatedCard className="border-2 border-gray-200 dark:border-gray-700" delay={0.3}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Create New User</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Add a new staff member to the system. They will be created in Supabase auth and can log in immediately with their email and password.</p>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pseudo" className="text-gray-700 dark:text-gray-300">Username *</Label>
                  <Input
                    id="pseudo"
                    type="text"
                    placeholder="Choose a unique username"
                    value={formData.pseudo}
                    onChange={(e) => setFormData({ ...formData, pseudo: e.target.value })}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-gray-700 dark:text-gray-300">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-gray-700 dark:text-gray-300">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-gray-700 dark:text-gray-300">Role *</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    required
                  >
                    <option value="employe">Employé</option>
                    <option value="caissiere">Caissière</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <AnimatedButton type="submit" disabled={loading} delay={0.1}>
                {loading ? <ButtonLoadingSpinner /> : 'Create User'}
              </AnimatedButton>
            </form>
          </div>
        </AnimatedCard>
      )}

      {/* Only show users list when not in create mode */}
      {!showCreateForm && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter((u) => u.is_active).length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length}</div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground dark:text-gray-400">Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter((u) => u.role === 'employe' || u.role === 'caissiere' || u.role === 'manager').length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Search Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <Input
                    placeholder="Search by name, email, username, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Users List ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-gray-700">
                      <TableHead className="text-gray-600 dark:text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Username</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Email</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Role</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Phone</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-600 dark:text-gray-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="font-mono text-sm bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                              {user.pseudo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <Badge className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">{user.phone || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user)}>
                            {getStatusText(user)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            {(() => {
                              // Show delete button based on security rules
                              const canDelete = 
                                (currentUserRole === 'superadmin' || currentUserRole === 'admin') && // User has admin privileges
                                user.id !== currentUserId && // Cannot delete themselves
                                user.role !== 'superadmin' && // Superadmin is undeletable
                                (user.role !== 'admin' || currentUserRole === 'superadmin'); // Only superadmin can delete admin
                              
                              return canDelete ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteUser(user.id, user.email)}
                                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  Delete
                                </Button>
                              ) : null;
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No users found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
