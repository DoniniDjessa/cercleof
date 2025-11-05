"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Search, Eye, Trash2, Calendar, Clock, User, Scissors, Plus } from "lucide-react"
import { AddAppointment } from "@/components/appointments/add-appointment"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Appointment {
  id: string
  client_id: string
  service_id: string
  employe_id: string
  date_rdv: string
  duree: number
  statut: string
  note?: string
  created_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phones: string[]
  }
  service?: {
    id: string
    nom: string
    prix_base: number
  }
  employe?: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setShowCreateForm(true)
    } else {
      setShowCreateForm(false)
    }
  }, [searchParams])

  useEffect(() => {
    fetchAppointments()
  }, [currentPage])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('dd-rdv')
        .select(`
          *,
          client:dd-clients(id, first_name, last_name, email, phones),
          service:dd-services(id, nom, prix_base),
          employe:dd-users(id, first_name, last_name, role)
        `, { count: 'exact' })
        .range(from, to)
        .order('date_rdv', { ascending: true })

      if (error) throw error

      setAppointments(data || [])
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching appointments:', error)
      toast.error('Erreur lors du chargement des rendez-vous')
    } finally {
      setLoading(false)
    }
  }

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action ne peut pas être annulée.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('dd-rdv')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Rendez-vous supprimé avec succès!')
      fetchAppointments()
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Erreur lors de la suppression du rendez-vous')
    }
  }

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('dd-rdv')
        .update({ statut: newStatus })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Statut mis à jour avec succès!')
      fetchAppointments()
    } catch (error) {
      console.error('Error updating appointment status:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'confirme':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'termine':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'annule':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'no_show':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_attente': return 'En Attente'
      case 'confirme': return 'Confirmé'
      case 'termine': return 'Terminé'
      case 'annule': return 'Annulé'
      case 'no_show': return 'No Show'
      default: return status
    }
  }

  const filteredAppointments = appointments.filter(appointment =>
    appointment.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.service?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.employe?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.employe?.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAppointments = appointments.length
  const pendingAppointments = appointments.filter(a => a.statut === 'en_attente').length
  const confirmedAppointments = appointments.filter(a => a.statut === 'confirme').length
  const completedAppointments = appointments.filter(a => a.statut === 'termine').length

  if (showCreateForm) {
    return <AddAppointment onAppointmentCreated={fetchAppointments} />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Rendez-vous</h1>
          <p className="text-muted-foreground dark:text-gray-400">Gérez tous vos rendez-vous et planifications</p>
        </div>
        <AnimatedButton
          onClick={() => {
            const url = new URL(window.location.href)
            url.searchParams.set('action', 'create')
            window.history.pushState({}, '', url.toString())
            setShowCreateForm(true)
          }}
          className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau RDV
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RDV</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En Attente</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <User className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confirmés</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{confirmedAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Scissors className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Terminés</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher des rendez-vous..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Rendez-vous</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableLoadingState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Service</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Employé</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Date & Heure</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Durée</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Statut</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.client?.first_name} {appointment.client?.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {appointment.client?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.service?.nom}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {appointment.service?.prix_base.toFixed(0)} XOF
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {appointment.employe?.first_name} {appointment.employe?.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {appointment.employe?.role}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(appointment.date_rdv).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(appointment.date_rdv).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">
                          {appointment.duree} min
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appointment.statut)}>
                          {getStatusText(appointment.statut)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Navigate to appointment details
                              window.location.href = `/admin/appointments/${appointment.id}`
                            }}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {appointment.statut === 'en_attente' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirme')}
                              className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                            >
                              Confirmer
                            </Button>
                          )}
                          {appointment.statut === 'confirme' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateAppointmentStatus(appointment.id, 'termine')}
                              className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/20"
                            >
                              Terminer
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAppointment(appointment.id)}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
