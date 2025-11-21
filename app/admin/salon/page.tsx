"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Search, User, Calendar, Clock, Star, Edit, Check, X, Users, Plus, Play } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface SalonService {
  id: string
  vente_id: string
  vente_item_id?: string
  client_id?: string
  service_id: string
  service_name: string
  service_price: number
  date_service: string
  statut: 'en_attente' | 'en_cours' | 'termine' | 'annule' | 'no_show'
  notes?: string
  review?: string
  rating?: number
  duree_estimee?: number
  duree_reelle?: number
  created_at: string
  client?: {
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  service?: {
    id: string
    name: string
    duration_minutes?: number
  }
  travailleurs?: Array<{
    id: string
    travailleur_id: string
    role?: string
    commission?: number
    notes?: string
    travailleur: {
      id: string
      first_name: string
      last_name: string
      specialite?: string
    }
  }>
}

interface Travailleur {
  id: string
  first_name: string
  last_name: string
  phone?: string
  email?: string
  specialite?: string
  competence?: string[]
  taux_horaire?: number
  commission_rate?: number
  is_active: boolean
}

export default function SalonPage() {
  const { user: authUser } = useAuth()
  const [salonServices, setSalonServices] = useState<SalonService[]>([])
  const [travailleurs, setTravailleurs] = useState<Travailleur[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedService, setSelectedService] = useState<SalonService | null>(null)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedTravailleurs, setSelectedTravailleurs] = useState<string[]>([])
  const [assignmentNotes, setAssignmentNotes] = useState("")
  // Store rating and note for each travailleur
  const [travailleurRatings, setTravailleurRatings] = useState<Record<string, number | undefined>>({})
  const [travailleurNotes, setTravailleurNotes] = useState<Record<string, string>>({})
  const [serviceNotes, setServiceNotes] = useState("")
  const [serviceRating, setServiceRating] = useState<number | undefined>()
  const [serviceReview, setServiceReview] = useState("")
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  
  // Timer states for active services
  const [activeTimers, setActiveTimers] = useState<Record<string, { startTime: Date; durationMinutes: number }>>({})
  const [remainingTimes, setRemainingTimes] = useState<Record<string, number>>({}) // in seconds

  useEffect(() => {
    fetchCurrentUserRole()
    fetchSalonServices()
    fetchTravailleurs()
  }, [authUser])

  // Timer effect for active services
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      const updated: Record<string, number> = {}
      
      Object.entries(activeTimers).forEach(([serviceId, timer]) => {
        const elapsed = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000) // seconds
        const totalSeconds = timer.durationMinutes * 60
        const remaining = Math.max(0, totalSeconds - elapsed)
        updated[serviceId] = remaining
      })
      
      setRemainingTimes(updated)
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [activeTimers])

  const fetchCurrentUserRole = async () => {
    try {
      if (!authUser?.id) {
        setCurrentUserRole("")
        return
      }

      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        setCurrentUserRole("")
        return
      }

      if (error) throw error
      setCurrentUserRole(data?.role || "")
    } catch (error) {
      console.error('Error fetching user role:', error)
      setCurrentUserRole("")
    }
  }

  const fetchSalonServices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dd-salon')
        .select(`
          *,
          client:dd-clients(id, first_name, last_name, email, phone),
          service:dd-services(id, name, duration_minutes),
          travailleurs:dd-salon-travailleurs(
            id,
            travailleur_id,
            role,
            commission,
            notes,
            travailleur:dd-travailleurs(id, first_name, last_name, specialite)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const services = (data || []) as unknown as SalonService[]
      setSalonServices(services)
      
      // Restore active timers for services that are 'en_cours'
      // Note: For a more accurate timer, you should store the actual start time in the database
      // For now, we'll start the timer from now when the page loads
      const activeServices = services.filter((s: SalonService) => s.statut === 'en_cours')
      const timers: Record<string, { startTime: Date; durationMinutes: number }> = {}
      
      activeServices.forEach((service: SalonService) => {
        const durationMinutes = service.service?.duration_minutes || service.duree_estimee || 60
        // Start timer from now when page loads (you may want to store actual start time in DB)
        timers[service.id] = {
          startTime: new Date(), // Start from now
          durationMinutes
        }
      })
      
      setActiveTimers(timers)
    } catch (error) {
      console.error('Error fetching salon services:', error)
      toast.error('Erreur lors du chargement des services salon')
    } finally {
      setLoading(false)
    }
  }

  const fetchTravailleurs = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-travailleurs')
        .select('*')
        .eq('is_active', true)
        .order('first_name')

      if (error) throw error

      setTravailleurs(data || [])
    } catch (error) {
      console.error('Error fetching travailleurs:', error)
      toast.error('Erreur lors du chargement des travailleurs')
    }
  }

  const handleAssignTravailleurs = async () => {
    if (!selectedService || selectedTravailleurs.length === 0) {
      toast.error('Veuillez sélectionner au moins un travailleur')
      return
    }

    try {
      // Remove existing assignments for this service
      const { error: deleteError } = await supabase
        .from('dd-salon-travailleurs')
        .delete()
        .eq('salon_id', selectedService.id)

      if (deleteError) throw deleteError

      // Create new assignments with rating and notes
      const assignments = selectedTravailleurs.map(travailleurId => ({
        salon_id: selectedService.id,
        travailleur_id: travailleurId,
        notes: travailleurNotes[travailleurId] || assignmentNotes || null
      }))

      const { error: insertError } = await supabase
        .from('dd-salon-travailleurs')
        .insert(assignments)

      if (insertError) throw insertError

      // Update travailleurs table with ratings and update stats
      const now = new Date()
      for (const travailleurId of selectedTravailleurs) {
        const rating = travailleurRatings[travailleurId]
        if (rating !== undefined && rating !== null) {
          try {
            // Fetch current travailleur data
            const { data: travailleurData, error: fetchError } = await supabase
              .from('dd-travailleurs')
              .select('rating_global, total_services, work_history')
              .eq('id', travailleurId)
              .single()

            if (fetchError) {
              console.error(`Error fetching travailleur ${travailleurId}:`, fetchError)
              continue
            }

            const currentRating = travailleurData?.rating_global || 0
            const currentTotalServices = travailleurData?.total_services || 0
            const workHistory = (travailleurData?.work_history || []) as Array<{
              date: string
              service_id?: string
              service_name?: string
              rating?: number
              notes?: string
            }>

            // Check if this service is already in work_history
            const existingEntryIndex = workHistory.findIndex(entry => entry.service_id === selectedService.id)
            const ratingValue = typeof rating === 'number' ? rating : parseFloat(String(rating))

            if (!isNaN(ratingValue) && ratingValue >= 0 && ratingValue <= 10) {
              let newRating = currentRating
              let newTotalServices = currentTotalServices

              if (existingEntryIndex >= 0) {
                // Update existing entry
                const oldRating = workHistory[existingEntryIndex].rating || 0
                workHistory[existingEntryIndex] = {
                  date: workHistory[existingEntryIndex].date || now.toISOString(),
                  service_id: selectedService.id,
                  service_name: selectedService.service_name,
                  rating: ratingValue,
                  notes: travailleurNotes[travailleurId] || assignmentNotes || undefined
                }

                // Recalculate global rating
                if (currentTotalServices > 0) {
                  const totalRating = (currentRating * currentTotalServices) - oldRating + ratingValue
                  newRating = totalRating / currentTotalServices
                } else {
                  newRating = ratingValue
                  newTotalServices = 1
                }
              } else {
                // New entry
                newTotalServices = currentTotalServices + 1
                newRating = ((currentRating * currentTotalServices) + ratingValue) / newTotalServices

                workHistory.push({
                  date: now.toISOString(),
                  service_id: selectedService.id,
                  service_name: selectedService.service_name,
                  rating: ratingValue,
                  notes: travailleurNotes[travailleurId] || assignmentNotes || undefined
                })
              }

              // Update travailleur
              const { error: updateError } = await supabase
                .from('dd-travailleurs')
                .update({
                  rating_global: parseFloat(newRating.toFixed(1)),
                  total_services: newTotalServices,
                  work_history: workHistory
                })
                .eq('id', travailleurId)

              if (updateError) {
                console.error(`Error updating travailleur ${travailleurId}:`, updateError)
              }
            }
          } catch (error) {
            console.error(`Error processing travailleur ${travailleurId}:`, error)
          }
        }
      }

      toast.success('Travailleurs assignés avec succès!')
      setShowAssignDialog(false)
      setSelectedTravailleurs([])
      setAssignmentNotes("")
      setTravailleurRatings({})
      setTravailleurNotes({})
      fetchSalonServices()
    } catch (error) {
      console.error('Error assigning travailleurs:', error)
      toast.error('Erreur lors de l\'assignation des travailleurs')
    }
  }


  const handleUpdateServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      // Get current user info and service details before updating
      let serviceDetails: SalonService | null = null
      let currentUser: any = null
      
      if (newStatus === 'termine') {
        // Fetch service details with travailleurs
        const { data: serviceData } = await supabase
          .from('dd-salon')
          .select(`
            *,
            client:dd-clients(id, first_name, last_name),
            travailleurs:dd-salon-travailleurs(
              *,
              travailleur:dd-travailleurs(id, first_name, last_name)
            )
          `)
          .eq('id', serviceId)
          .single()

        serviceDetails = serviceData as any

        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: userData } = await supabase
            .from('dd-users')
            .select('id, pseudo, email')
            .eq('auth_user_id', authUser.id)
            .single()

          currentUser = userData
        }
      }

      const { error } = await supabase
        .from('dd-salon')
        .update({ statut: newStatus })
        .eq('id', serviceId)

      if (error) throw error

      // Stop timer if service is completed or cancelled
      if (newStatus === 'termine' || newStatus === 'annule' || newStatus === 'no_show') {
        setActiveTimers(prev => {
          const updated = { ...prev }
          delete updated[serviceId]
          return updated
        })
        setRemainingTimes(prev => {
          const updated = { ...prev }
          delete updated[serviceId]
          return updated
        })
      }

      // Create action when service is completed
      if (newStatus === 'termine' && serviceDetails && currentUser) {
        const now = new Date()
        const serviceDate = new Date(serviceDetails.date_service || now.toISOString())
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const serviceDay = new Date(serviceDate)
        serviceDay.setHours(0, 0, 0, 0)

        let timePrefix = ''
        if (serviceDay.getTime() === today.getTime()) {
          timePrefix = serviceDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        } else if (serviceDay.getTime() === yesterday.getTime()) {
          timePrefix = `hier:${serviceDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
        } else {
          timePrefix = serviceDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + serviceDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }

        // Get travailleurs assigned to this service
        const travailleurs = serviceDetails.travailleurs || []
        
        // Get service rating (fetch updated service data)
        const { data: updatedService } = await supabase
          .from('dd-salon')
          .select('rating')
          .eq('id', serviceId)
          .single()
        
        const serviceRating = updatedService?.rating

        // Update travailleurs statistics if rating exists (use the helper function)
        if (serviceRating !== undefined && serviceRating !== null && travailleurs.length > 0) {
          await updateTravailleurStats(serviceId, serviceRating, serviceDetails.service_name)
        }

        // Get travailleur name (first one if multiple)
        const travailleur = travailleurs.length > 0 && travailleurs[0].travailleur
          ? travailleurs[0].travailleur
          : null
        const travailleurName = travailleur ? `${travailleur.first_name} ${travailleur.last_name}` : 'travailleur'
        const userDisplayName = currentUser.pseudo || currentUser.email

        // Create action description
        let actionDescription = ''
        if (serviceDetails.client) {
          actionDescription = `${timePrefix}: ${serviceDetails.client.first_name} ${serviceDetails.client.last_name} s'est ${serviceDetails.service_name} à ${serviceDetails.service_price.toFixed(0)}f, fait par ${travailleurName}, cloturé par ${userDisplayName}`
        } else {
          actionDescription = `${timePrefix}: Service ${serviceDetails.service_name} terminé à ${serviceDetails.service_price.toFixed(0)}f, fait par ${travailleurName}, cloturé par ${userDisplayName}`
        }

        // Create action
        const { error: actionError } = await supabase
          .from('dd-actions')
          .insert([{
            user_id: currentUser.id,
            type: 'edition',
            cible_table: 'dd-salon',
            cible_id: serviceId,
            description: actionDescription
          }])

        if (actionError) {
          console.error('Error creating action:', actionError)
        }

        // Create notification for client (without user)
        if (serviceDetails.client) {
          const notificationMessage = `${timePrefix}: ${serviceDetails.client.first_name} ${serviceDetails.client.last_name} s'est ${serviceDetails.service_name} à ${serviceDetails.service_price.toFixed(0)}f, fait par ${travailleurName}`
          
          const { error: notifError } = await supabase
            .from('dd-notifications')
            .insert([{
              type: 'service',
              message: notificationMessage,
              cible_type: 'client',
              cible_id: serviceDetails.client.id,
              created_by: currentUser.id
            }])

          if (notifError) {
            console.error('Error creating notification:', notifError)
          }
        }
      }

      toast.success('Statut mis à jour avec succès!')
      fetchSalonServices()
    } catch (error) {
      console.error('Error updating service status:', error)
      toast.error('Erreur lors de la mise à jour du statut')
    }
  }

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Terminé'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const updateTravailleurStats = async (serviceId: string, serviceRating: number | undefined, serviceName: string) => {
    if (!serviceRating) return

    try {
      // Fetch service details with travailleurs
      const { data: serviceData } = await supabase
        .from('dd-salon')
        .select(`
          *,
          travailleurs:dd-salon-travailleurs(
            *,
            travailleur:dd-travailleurs(id, first_name, last_name)
          )
        `)
        .eq('id', serviceId)
        .single()

      if (!serviceData) return

      const serviceDataTyped = serviceData as any
      const travailleurs = serviceDataTyped.travailleurs || []
      if (travailleurs.length === 0) return

      const now = new Date()
      const serviceNotes = serviceDataTyped.notes || undefined

      for (const st of travailleurs) {
        const travailleurId = st.travailleur_id || st.travailleur?.id
        if (!travailleurId) continue

        try {
          // Fetch current travailleur data
          const { data: travailleurData, error: fetchError } = await supabase
            .from('dd-travailleurs')
            .select('rating_global, total_services, work_history')
            .eq('id', travailleurId)
            .single()

          if (fetchError) {
            console.error(`Error fetching travailleur ${travailleurId}:`, fetchError)
            continue
          }

          const currentRating = travailleurData?.rating_global || 0
          const currentTotalServices = travailleurData?.total_services || 0
          const workHistory = (travailleurData?.work_history || []) as Array<{
            date: string
            service_id?: string
            service_name?: string
            rating?: number
            notes?: string
          }>

          // Check if this service is already in work_history
          const existingEntryIndex = workHistory.findIndex(entry => entry.service_id === serviceId)
          const ratingValue = typeof serviceRating === 'number' ? serviceRating : parseFloat(String(serviceRating))

          if (!isNaN(ratingValue) && ratingValue >= 0 && ratingValue <= 10) {
            let newRating = currentRating
            let newTotalServices = currentTotalServices

            if (existingEntryIndex >= 0) {
              // Update existing entry - need to recalculate rating
              const oldRating = workHistory[existingEntryIndex].rating || 0
              workHistory[existingEntryIndex] = {
                date: workHistory[existingEntryIndex].date || now.toISOString(),
                service_id: serviceId,
                service_name: serviceName,
                rating: ratingValue,
                notes: serviceNotes
              }

              // Recalculate global rating: subtract old rating, add new rating
              if (currentTotalServices > 0) {
                const totalRating = (currentRating * currentTotalServices) - oldRating + ratingValue
                newRating = totalRating / currentTotalServices
              } else {
                newRating = ratingValue
                newTotalServices = 1
              }
            } else {
              // New entry - add to history and update stats
              newTotalServices = currentTotalServices + 1
              newRating = ((currentRating * currentTotalServices) + ratingValue) / newTotalServices

              workHistory.push({
                date: now.toISOString(),
                service_id: serviceId,
                service_name: serviceName,
                rating: ratingValue,
                notes: serviceNotes
              })
            }

            // Update travailleur
            const { error: updateError } = await supabase
              .from('dd-travailleurs')
              .update({
                rating_global: parseFloat(newRating.toFixed(1)),
                total_services: newTotalServices,
                work_history: workHistory
              })
              .eq('id', travailleurId)

            if (updateError) {
              console.error(`Error updating travailleur ${travailleurId}:`, updateError)
            }
          }
        } catch (error) {
          console.error(`Error processing travailleur ${travailleurId}:`, error)
        }
      }
    } catch (error) {
      console.error('Error updating travailleur stats:', error)
    }
  }

  const handleUpdateService = async () => {
    if (!selectedService) return

    try {
      const updateData: any = {
        notes: serviceNotes || null
      }

      const oldRating = selectedService.rating
      const newRating = serviceRating

      if (serviceRating !== undefined) {
        updateData.rating = serviceRating
      }

      if (serviceReview) {
        updateData.review = serviceReview
      }

      const { error } = await supabase
        .from('dd-salon')
        .update(updateData)
        .eq('id', selectedService.id)

      if (error) throw error

      // Update travailleur stats if rating changed and service is already completed
      if (selectedService.statut === 'termine' && newRating !== undefined && newRating !== oldRating) {
        await updateTravailleurStats(selectedService.id, newRating, selectedService.service_name)
      }

      toast.success('Service mis à jour avec succès!')
      setSelectedService(null)
      setServiceNotes("")
      setServiceRating(undefined)
      setServiceReview("")
      fetchSalonServices()
    } catch (error) {
      console.error('Error updating service:', error)
      toast.error('Erreur lors de la mise à jour du service')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'en_cours':
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
      case 'en_cours': return 'En Cours'
      case 'termine': return 'Terminé'
      case 'annule': return 'Annulé'
      case 'no_show': return 'No Show'
      default: return status
    }
  }

  const canManageServices = currentUserRole === 'admin' || currentUserRole === 'manager' || currentUserRole === 'superadmin'

  const filteredServices = salonServices.filter(service =>
    service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.client?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.client?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.client?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.client?.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(service => filterStatus === 'all' || service.statut === filterStatus)

  const pendingServices = salonServices.filter(s => s.statut === 'en_attente').length
  const inProgressServices = salonServices.filter(s => s.statut === 'en_cours').length
  const completedServices = salonServices.filter(s => s.statut === 'termine').length

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground dark:text-white">Salon</h1>
        <p className="text-muted-foreground dark:text-gray-400">Gérez les services et assignez les travailleurs</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">En Attente</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{pendingServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">En Cours</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{inProgressServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Terminés</p>
                <p className="text-base font-bold text-gray-900 dark:text-white">{completedServices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Rechercher des services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-48 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En Attente</SelectItem>
                <SelectItem value="en_cours">En Cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
                <SelectItem value="no_show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Services Salon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-gray-700 dark:text-gray-300">Client</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Service</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Prix</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Travailleurs</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Statut</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Temps Restant</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Date</TableHead>
                  <TableHead className="text-gray-700 dark:text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500 dark:text-gray-400">
                      Aucun service trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service) => (
                    <TableRow key={service.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <TableCell>
                        {service.client ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {service.client.first_name} {service.client.last_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {service.client.email || service.client.phone || '—'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Client anonyme</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-900 dark:text-white">{service.service_name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-900 dark:text-white">{service.service_price.toFixed(0)}f</span>
                      </TableCell>
                      <TableCell>
                        {service.travailleurs && service.travailleurs.length > 0 ? (
                          <div className="space-y-1">
                            {service.travailleurs.map((t) => (
                              <Badge key={t.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {t.travailleur.first_name} {t.travailleur.last_name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 text-xs">Non assigné</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(service.statut)}>
                          {getStatusText(service.statut)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {service.statut === 'en_cours' && activeTimers[service.id] ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className={`text-sm font-medium ${
                              (remainingTimes[service.id] || 0) <= 300 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              {formatTimeRemaining(remainingTimes[service.id] || 0)}
                            </span>
                          </div>
                        ) : service.statut === 'en_cours' ? (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTimeRemaining((service.service?.duration_minutes || service.duree_estimee || 60) * 60)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-900 dark:text-white">
                          {new Date(service.date_service).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(service.date_service).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canManageServices && service.statut === 'en_attente' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedService(service)
                                setSelectedTravailleurs(service.travailleurs?.map(t => t.travailleur_id) || [])
                                setShowAssignDialog(true)
                              }}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              <Users className="w-3 h-3 mr-1" />
                              Assigner
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Assign Travailleurs Dialog */}
      {showAssignDialog && selectedService && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Assigner des Travailleurs
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAssignDialog(false)
                    setSelectedService(null)
                    setSelectedTravailleurs([])
                    setAssignmentNotes("")
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Service</Label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedService.service_name}</p>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Sélectionner les Travailleurs</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {travailleurs.map((travailleur) => (
                    <div key={travailleur.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`travailleur-${travailleur.id}`}
                        checked={selectedTravailleurs.includes(travailleur.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTravailleurs([...selectedTravailleurs, travailleur.id])
                          } else {
                            setSelectedTravailleurs(selectedTravailleurs.filter(id => id !== travailleur.id))
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`travailleur-${travailleur.id}`}
                        className="text-sm text-gray-900 dark:text-white cursor-pointer"
                      >
                        {travailleur.first_name} {travailleur.last_name}
                        {travailleur.specialite && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({travailleur.specialite})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Notes (optionnel)</Label>
                <Textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Notes pour l'assignation..."
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignDialog(false)
                    setSelectedService(null)
                    setSelectedTravailleurs([])
                    setAssignmentNotes("")
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAssignTravailleurs}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
                >
                  Assigner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Service Dialog (for completion/review) */}
      {selectedService && !showAssignDialog && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <CardContent className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Terminer le Service
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedService(null)
                    setServiceNotes("")
                    setServiceRating(undefined)
                    setServiceReview("")
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Service</Label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedService.service_name}</p>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Notes</Label>
                <Textarea
                  value={serviceNotes}
                  onChange={(e) => setServiceNotes(e.target.value)}
                  placeholder="Notes sur le service..."
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Note (0-10, optionnel)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={serviceRating ?? ''}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '') {
                      setServiceRating(undefined)
                    } else {
                      const numValue = parseFloat(value)
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
                        setServiceRating(numValue)
                      }
                    }
                  }}
                  placeholder="Ex: 8.5"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 max-w-xs"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Note de 0 à 10 pour évaluer la qualité du service</p>
              </div>

              <div>
                <Label className="text-gray-700 dark:text-gray-300">Avis (optionnel)</Label>
                <Textarea
                  value={serviceReview}
                  onChange={(e) => setServiceReview(e.target.value)}
                  placeholder="Avis du client..."
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedService(null)
                    setServiceNotes("")
                    setServiceRating(undefined)
                    setServiceReview("")
                  }}
                >
                  Annuler
                </Button>
                <Button
                  onClick={async () => {
                    await handleUpdateService()
                    await handleUpdateServiceStatus(selectedService.id, 'termine')
                  }}
                  className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white"
                >
                  Terminer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
