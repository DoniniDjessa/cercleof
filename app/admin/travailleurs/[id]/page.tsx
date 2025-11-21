"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { AnimatedButton } from '@/components/ui/animated-button'
import { ArrowLeft, Edit, Save, X, Star, Calendar, Clock, DollarSign, TrendingUp, Plus, User, Phone, Mail, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getUserRole } from '@/lib/utils/role-check'

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
  date_embauche?: string
  notes?: string
  rating_global?: number
  total_services?: number
  total_montants_recus?: number
  jours_travailles?: number
  heures_travailles?: number
  salaire?: number
  salary_history?: any[]
  payments_history?: any[]
  work_history?: any[]
  notes_history?: any[]
  created_at: string
}

export default function TravailleurDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const travailleurId = params?.id as string

  const [travailleur, setTravailleur] = useState<Travailleur | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  // Edit form states
  const [editForm, setEditForm] = useState({
    salaire: '',
    jours_travailles: '',
    heures_travailles: '',
    montant_recu: '',
    note_ajout: '',
  })

  useEffect(() => {
    if (user && travailleurId) {
      fetchTravailleur()
      fetchUserRole()
    }
  }, [user, travailleurId])

  const fetchUserRole = async () => {
    if (!user?.id) return
    const role = await getUserRole(user.id)
    setCurrentUserRole(role || '')
    setIsAdmin(role === 'admin' || role === 'superadmin' || role === 'manager')
  }

  const fetchTravailleur = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dd-travailleurs')
        .select('*')
        .eq('id', travailleurId)
        .single()

      if (error) throw error
      setTravailleur(data as Travailleur)
    } catch (error) {
      console.error('Error fetching travailleur:', error)
      toast.error('Erreur lors du chargement du travailleur')
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!travailleur || !isAdmin) return

    try {
      setSaving(true)
      
      const updates: any = {}
      const historyEntries: any[] = []
      const now = new Date().toISOString()

      // Update salary
      if (editForm.salaire && parseFloat(editForm.salaire) > 0) {
        const newSalary = parseFloat(editForm.salaire)
        updates.salaire = newSalary
        
        // Add to salary history
        const salaryHistory = travailleur.salary_history || []
        salaryHistory.push({
          date: now,
          amount: newSalary,
          added_by: user?.id,
          note: editForm.note_ajout || null
        })
        updates.salary_history = salaryHistory
        historyEntries.push({ type: 'salary', date: now, amount: newSalary })
      }

      // Update work days
      if (editForm.jours_travailles && parseInt(editForm.jours_travailles) > 0) {
        const daysToAdd = parseInt(editForm.jours_travailles)
        updates.jours_travailles = (travailleur.jours_travailles || 0) + daysToAdd
        
        const workHistory = travailleur.work_history || []
        workHistory.push({
          date: now,
          days: daysToAdd,
          hours: 0,
          added_by: user?.id,
          note: editForm.note_ajout || null
        })
        updates.work_history = workHistory
        historyEntries.push({ type: 'work_days', date: now, days: daysToAdd })
      }

      // Update work hours
      if (editForm.heures_travailles && parseFloat(editForm.heures_travailles) > 0) {
        const hoursToAdd = parseFloat(editForm.heures_travailles)
        updates.heures_travailles = (parseFloat(String(travailleur.heures_travailles || 0))) + hoursToAdd
        
        const workHistory = travailleur.work_history || []
        workHistory.push({
          date: now,
          days: 0,
          hours: hoursToAdd,
          added_by: user?.id,
          note: editForm.note_ajout || null
        })
        updates.work_history = workHistory
        historyEntries.push({ type: 'work_hours', date: now, hours: hoursToAdd })
      }

      // Update payment received
      if (editForm.montant_recu && parseFloat(editForm.montant_recu) > 0) {
        const amountToAdd = parseFloat(editForm.montant_recu)
        updates.total_montants_recus = (parseFloat(String(travailleur.total_montants_recus || 0))) + amountToAdd
        
        const paymentsHistory = travailleur.payments_history || []
        paymentsHistory.push({
          date: now,
          amount: amountToAdd,
          added_by: user?.id,
          note: editForm.note_ajout || null
        })
        updates.payments_history = paymentsHistory
        historyEntries.push({ type: 'payment', date: now, amount: amountToAdd })
      }

      // Add note to history
      if (editForm.note_ajout && editForm.note_ajout.trim() !== '' && historyEntries.length === 0) {
        const notesHistory = travailleur.notes_history || []
        notesHistory.push({
          date: now,
          note: editForm.note_ajout.trim(),
          added_by: user?.id
        })
        updates.notes_history = notesHistory
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('dd-travailleurs')
          .update(updates)
          .eq('id', travailleurId)

        if (error) throw error

        toast.success('Informations mises à jour avec succès!')
        setEditForm({
          salaire: '',
          jours_travailles: '',
          heures_travailles: '',
          montant_recu: '',
          note_ajout: '',
        })
        fetchTravailleur()
      } else {
        toast.error('Veuillez remplir au moins un champ')
      }
    } catch (error) {
      console.error('Error updating travailleur:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  if (!travailleur) {
    return (
      <div className="p-4">
        <p className="text-gray-500 dark:text-gray-400">Travailleur non trouvé</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/users?tab=travailleurs')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {travailleur.first_name} {travailleur.last_name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {travailleur.specialite || 'Sans spécialité'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant={isEditing ? "outline" : "default"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Note Globale</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {travailleur.rating_global ? travailleur.rating_global.toFixed(1) : '—'}
                </p>
                {travailleur.rating_global && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      / 10
                    </span>
                  </div>
                )}
              </div>
              <Star className="w-8 h-8 text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Services</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {travailleur.total_services || 0}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Montants Reçus</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {travailleur.total_montants_recus ? travailleur.total_montants_recus.toFixed(0) : 0}f
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Temps de Travail</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {travailleur.jours_travailles || 0} jours
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {travailleur.heures_travailles ? travailleur.heures_travailles.toFixed(1) : 0}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-400 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      {isEditing && isAdmin && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Ajouter des informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaire">Salaire (f)</Label>
                <Input
                  id="salaire"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.salaire}
                  onChange={(e) => setEditForm({ ...editForm, salaire: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="montant_recu">Montant Reçu (f)</Label>
                <Input
                  id="montant_recu"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.montant_recu}
                  onChange={(e) => setEditForm({ ...editForm, montant_recu: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jours_travailles">Jours Travaillés</Label>
                <Input
                  id="jours_travailles"
                  type="number"
                  min="0"
                  value={editForm.jours_travailles}
                  onChange={(e) => setEditForm({ ...editForm, jours_travailles: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heures_travailles">Heures Travaillées</Label>
                <Input
                  id="heures_travailles"
                  type="number"
                  min="0"
                  step="0.1"
                  value={editForm.heures_travailles}
                  onChange={(e) => setEditForm({ ...editForm, heures_travailles: e.target.value })}
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note_ajout">Note (optionnel)</Label>
              <Textarea
                id="note_ajout"
                value={editForm.note_ajout}
                onChange={(e) => setEditForm({ ...editForm, note_ajout: e.target.value })}
                placeholder="Ajouter une note pour cette modification..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setEditForm({
                    salaire: '',
                    jours_travailles: '',
                    heures_travailles: '',
                    montant_recu: '',
                    note_ajout: '',
                  })
                }}
              >
                Annuler
              </Button>
              <AnimatedButton
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <ButtonLoadingSpinner />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </AnimatedButton>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal Info */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations Personnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {travailleur.first_name} {travailleur.last_name}
              </span>
            </div>
            {travailleur.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{travailleur.phone}</span>
              </div>
            )}
            {travailleur.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{travailleur.email}</span>
              </div>
            )}
            {travailleur.date_embauche && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Embauché le {new Date(travailleur.date_embauche).toLocaleDateString('fr-FR')}
                </span>
              </div>
            )}
            {travailleur.salaire && travailleur.salaire > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Salaire: {travailleur.salaire.toFixed(0)}f
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Info */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations Professionnelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {travailleur.specialite && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Spécialité</span>
                <Badge className="ml-2">{travailleur.specialite}</Badge>
              </div>
            )}
            {travailleur.taux_horaire && travailleur.taux_horaire > 0 && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Taux Horaire</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {travailleur.taux_horaire.toFixed(0)}f/h
                </p>
              </div>
            )}
            {travailleur.commission_rate && travailleur.commission_rate > 0 && (
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Commission</span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {travailleur.commission_rate.toFixed(1)}%
                </p>
              </div>
            )}
            <div>
              <span className="text-xs text-gray-500 dark:text-gray-400">Statut</span>
              <Badge className={`ml-2 ${
                travailleur.is_active 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {travailleur.is_active ? 'Actif' : 'Inactif'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Sections */}
      {(travailleur.salary_history?.length || travailleur.payments_history?.length || travailleur.work_history?.length || travailleur.notes_history?.length) && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Historique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Salary History */}
              {travailleur.salary_history && travailleur.salary_history.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Historique des Salaires</h4>
                  <div className="space-y-2">
                    {travailleur.salary_history.slice(-5).reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}: {entry.amount.toFixed(0)}f
                        {entry.note && ` - ${entry.note}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments History */}
              {travailleur.payments_history && travailleur.payments_history.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Historique des Paiements</h4>
                  <div className="space-y-2">
                    {travailleur.payments_history.slice(-5).reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}: +{entry.amount.toFixed(0)}f
                        {entry.note && ` - ${entry.note}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work History */}
              {travailleur.work_history && travailleur.work_history.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Historique du Travail</h4>
                  <div className="space-y-2">
                    {travailleur.work_history.slice(-5).reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}: 
                        {entry.days > 0 && ` +${entry.days} jours`}
                        {entry.hours > 0 && ` +${entry.hours.toFixed(1)}h`}
                        {entry.note && ` - ${entry.note}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes History */}
              {travailleur.notes_history && travailleur.notes_history.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                  <div className="space-y-2">
                    {travailleur.notes_history.slice(-5).reverse().map((entry: any, idx: number) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="font-medium">{new Date(entry.date).toLocaleDateString('fr-FR')}:</span> {entry.note}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

