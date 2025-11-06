"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedCard } from "@/components/ui/animated-card"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Calendar, Clock, User, Scissors } from "lucide-react"
import toast from "react-hot-toast"

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phones: string[]
}

interface Service {
  id: string
  nom: string
  prix_base: number
  duree: number
  category?: {
    id: string
    name: string
  }
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface AddAppointmentProps {
  onAppointmentCreated?: () => void
}

export function AddAppointment({ onAppointmentCreated }: AddAppointmentProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    employe_id: "",
    date_rdv: "",
    time_rdv: "",
    duree: 60,
    note: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, email, phones')
        .eq('is_active', true)
        .order('first_name')

      if (clientsError) throw clientsError

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('dd-services')
        .select(`
          *,
          category:dd-categories(id, name)
        `)
        .eq('actif', true)
        .order('nom')

      if (servicesError) throw servicesError

      // Fetch employees (users with employee roles)
      const { data: employeesData, error: employeesError } = await supabase
        .from('dd-users')
        .select('id, first_name, last_name, role')
        .in('role', ['employe', 'manager', 'admin', 'superadmin'])
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError

      setClients(clientsData || [])
      setServices(servicesData || [])
      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Erreur lors du chargement des données')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Auto-update duration when service changes
    if (name === 'service_id') {
      const selectedService = services.find(s => s.id === value)
      if (selectedService) {
        setFormData(prev => ({ ...prev, duree: selectedService.duree }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: currentUser, error: userError } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', authUser?.id)
        .single()

      if (userError) {
        console.error('Error fetching current user:', userError)
        toast.error('Erreur lors de la récupération des informations utilisateur')
        return
      }

      // Combine date and time
      const appointmentDateTime = new Date(`${formData.date_rdv}T${formData.time_rdv}`)

      const appointmentData = {
        client_id: formData.client_id || null, // Client is optional
        service_id: formData.service_id,
        employe_id: formData.employe_id,
        date_rdv: appointmentDateTime.toISOString(),
        duree: parseInt(formData.duree.toString()),
        statut: 'en_attente',
        note: formData.note || null,
        created_by: currentUser.id
      }

      const { data, error } = await supabase
        .from('dd-rdv')
        .insert([appointmentData])
        .select()

      if (error) {
        console.error('Error creating appointment:', error)
        toast.error('Erreur lors de la création du rendez-vous: ' + error.message)
        return
      }

      toast.success("Rendez-vous créé avec succès!")
      
      // Reset form
      setFormData({
        client_id: "",
        service_id: "",
        employe_id: "",
        date_rdv: "",
        time_rdv: "",
        duree: 60,
        note: "",
      })

      if (onAppointmentCreated) {
        onAppointmentCreated()
      }
      
    } catch (error) {
      console.error("Error creating appointment:", error)
      toast.error("Erreur lors de la création du rendez-vous. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    window.history.replaceState({}, '', '/admin/appointments')
    window.location.reload()
  }

  const selectedService = services.find(s => s.id === formData.service_id)
  const selectedClient = clients.find(c => c.id === formData.client_id)
  const selectedEmployee = employees.find(e => e.id === formData.employe_id)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Nouveau Rendez-vous</h1>
        <p className="text-muted-foreground dark:text-gray-400">Planifier un nouveau rendez-vous pour un client</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_id" className="text-gray-700 dark:text-gray-300">Client (optionnel)</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => handleSelectChange('client_id', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez un client (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} - {client.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Service Selection */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service_id" className="text-gray-700 dark:text-gray-300">Service *</Label>
                <Select
                  value={formData.service_id}
                  onValueChange={(value) => handleSelectChange('service_id', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez un service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.nom} - {service.prix_base.toFixed(0)}f ({service.duree} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Employee Selection */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Employé
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employe_id" className="text-gray-700 dark:text-gray-300">Employé *</Label>
                <Select
                  value={formData.employe_id}
                  onValueChange={(value) => handleSelectChange('employe_id', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} - {employee.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Date & Time */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Date et Heure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_rdv" className="text-gray-700 dark:text-gray-300">Date *</Label>
                  <Input
                    id="date_rdv"
                    name="date_rdv"
                    type="date"
                    value={formData.date_rdv}
                    onChange={handleChange}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_rdv" className="text-gray-700 dark:text-gray-300">Heure *</Label>
                  <Input
                    id="time_rdv"
                    name="time_rdv"
                    type="time"
                    value={formData.time_rdv}
                    onChange={handleChange}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Duration */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.5}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Durée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duree" className="text-gray-700 dark:text-gray-300">Durée (minutes) *</Label>
                <Input
                  id="duree"
                  name="duree"
                  type="number"
                  min="1"
                  value={formData.duree}
                  onChange={handleChange}
                  required
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Notes */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.6}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note" className="text-gray-700 dark:text-gray-300">Notes du rendez-vous</Label>
                <Textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  placeholder="Ajoutez des notes ou commentaires..."
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.7}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé du Rendez-vous</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Client</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Service</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedService ? selectedService.nom : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Employé</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.date_rdv ? new Date(formData.date_rdv).toLocaleDateString('fr-FR') : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Heure</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.time_rdv || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Durée</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.duree} minutes
                  </p>
                </div>
                {selectedService && (
                  <div>
                    <p className="text-muted-foreground dark:text-gray-400">Prix</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedService.prix_base.toFixed(0)}f
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? <ButtonLoadingSpinner /> : "Créer le Rendez-vous"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
                  onClick={handleCancel}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </form>
    </div>
  )
}
