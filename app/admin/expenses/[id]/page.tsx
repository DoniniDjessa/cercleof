"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TableLoadingState, ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { ArrowLeft, Edit, Save, X, DollarSign, Calendar, User, FileText, Building } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Expense {
  id: string
  categorie: string
  montant: number
  date: string
  fournisseur_id?: string
  note?: string
  created_at: string
  enregistre_par: string
  user?: {
    id: string
    first_name: string
    last_name: string
    pseudo: string
  }
  linked_user?: {
    id: string
    first_name: string
    last_name: string
  }
}

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface Travailleur {
  id: string
  first_name: string
  last_name: string
}

export default function ExpenseDetailsPage() {
  const { user: authUser } = useAuth()
  const params = useParams()
  const router = useRouter()
  const expenseId = params.id as string

  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [travailleurs, setTravailleurs] = useState<Travailleur[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Form data for editing
  const [formData, setFormData] = useState({
    categorie: "",
    montant: 0,
    date: "",
    fournisseur_id: "",
    note: "",
  })

  // Check if user has admin access
  const isAdmin = Boolean(authUser?.role && ['admin', 'superadmin'].includes(authUser.role))
  const financeCategories = ['salaire', 'salaire_travailleur']

  useEffect(() => {
    if (expenseId) {
      fetchExpenseDetails()
    }
  }, [expenseId])

  useEffect(() => {
    if (editing && isAdmin) {
      fetchUsersAndTravailleurs()
    }
  }, [editing, isAdmin])

  const fetchExpenseDetails = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('dd-depenses')
        .select(`
          *,
          user:"dd-users"!enregistre_par(id, first_name, last_name, pseudo)
        `)
        .eq('id', expenseId)
        .single()

      if (error) {
        console.error('Error fetching expense details:', error)
        toast.error('Erreur lors du chargement des détails de la dépense')
        router.push('/admin/expenses')
        return
      }

      if (!data) {
        toast.error('Dépense non trouvée')
        router.push('/admin/expenses')
        return
      }

      const expenseData = data as any

      // For finance expenses, fetch linked user info if fournisseur_id exists
      if (financeCategories.includes(expenseData.categorie) && expenseData.fournisseur_id) {
        const { data: linkedUser } = await supabase
          .from('dd-users')
          .select('id, first_name, last_name')
          .eq('id', expenseData.fournisseur_id)
          .single()

        if (linkedUser) {
          expenseData.linked_user = linkedUser
        }
      }

      setExpense(expenseData)
      
      // Initialize form data
      setFormData({
        categorie: expenseData.categorie || "",
        montant: expenseData.montant || 0,
        date: expenseData.date ? new Date(expenseData.date).toISOString().split('T')[0] : "",
        fournisseur_id: expenseData.fournisseur_id || "",
        note: expenseData.note || "",
      })

    } catch (error) {
      console.error('Error fetching expense details:', error)
      toast.error('Erreur lors du chargement des détails de la dépense')
      router.push('/admin/expenses')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsersAndTravailleurs = async () => {
    setLoadingUsers(true)
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('dd-users')
        .select('id, first_name, last_name, role')
        .eq('is_active', true)
        .order('first_name')

      if (usersError) throw usersError

      // Fetch travailleurs (if table exists)
      let travailleursData: Travailleur[] = []
      try {
        const { data: travData, error: travError } = await supabase
          .from('dd-travailleurs')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .order('first_name')

        if (!travError && travData) {
          travailleursData = travData
        }
      } catch (err) {
        // Table might not exist, that's okay
        console.log('Travailleurs table not found')
      }

      setUsers(usersData || [])
      setTravailleurs(travailleursData)
    } catch (error) {
      console.error('Error fetching users and travailleurs:', error)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleEdit = () => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas la permission de modifier des dépenses')
      return
    }
    setEditing(true)
  }

  const handleCancel = () => {
    setEditing(false)
    // Reset form data to original values
    if (expense) {
      setFormData({
        categorie: expense.categorie || "",
        montant: expense.montant || 0,
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : "",
        fournisseur_id: expense.fournisseur_id || "",
        note: expense.note || "",
      })
    }
  }

  const handleSave = async () => {
    if (!isAdmin) {
      toast.error('Vous n\'avez pas la permission de modifier des dépenses')
      return
    }

    if (!formData.categorie || !formData.montant || !formData.date) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setSaving(true)

      const updateData = {
        categorie: formData.categorie,
        montant: parseFloat(formData.montant.toString()),
        date: new Date(formData.date).toISOString(),
        fournisseur_id: formData.fournisseur_id || null,
        note: formData.note || null,
      }

      const { error } = await supabase
        .from('dd-depenses')
        .update(updateData)
        .eq('id', expenseId)

      if (error) throw error

      toast.success('Dépense mise à jour avec succès!')
      setEditing(false)
      fetchExpenseDetails() // Refresh the data
    } catch (error) {
      console.error('Error updating expense:', error)
      toast.error('Erreur lors de la mise à jour de la dépense')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'achat_produits': return 'Achat Produits'
      case 'charges': return 'Charges'
      case 'loyer': return 'Loyer'
      case 'electricite': return 'Électricité'
      case 'eau': return 'Eau'
      case 'internet': return 'Internet'
      case 'marketing': return 'Marketing'
      case 'equipement': return 'Équipement'
      case 'formation': return 'Formation'
      case 'transport': return 'Transport'
      case 'maintenance': return 'Maintenance'
      case 'repair': return 'Réparation'
      case 'food': return 'Nourriture'
      case 'salaire': return 'Salaire'
      case 'salaire_travailleur': return 'Salaire Travailleur'
      case 'autre': return 'Autre'
      default: return category
    }
  }

  const getCategoryColor = (category: string) => {
    if (financeCategories.includes(category)) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
  }

  // Don't render anything if user is not admin
  if (authUser && authUser.role && !isAdmin) {
    return (
      <div className="p-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Accès refusé. Seuls les administrateurs peuvent voir les détails des dépenses.
            </p>
            <Button 
              onClick={() => router.push('/admin')} 
              className="mt-4"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return <TableLoadingState />
  }

  if (!expense) {
    return (
      <div className="p-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400">Dépense non trouvée</p>
            <Button 
              onClick={() => router.push('/admin/expenses')} 
              className="mt-4"
            >
              Retour aux dépenses
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/expenses')}
            className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux dépenses
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white">
              Détails de la dépense
            </h1>
            <p className="text-muted-foreground dark:text-gray-400">
              Dépense #{expense.id.slice(-8)}
            </p>
          </div>
        </div>
        
        {isAdmin && !editing && (
          <AnimatedButton onClick={handleEdit} delay={0.1}>
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </AnimatedButton>
        )}
        
        {editing && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <AnimatedButton onClick={handleSave} disabled={saving} delay={0.1}>
              {saving ? <ButtonLoadingSpinner /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer
            </AnimatedButton>
          </div>
        )}
      </div>

      {/* Expense Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Information */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Catégorie</Label>
              {editing ? (
                <Select
                  value={formData.categorie}
                  onValueChange={(value) => handleInputChange('categorie', value)}
                  disabled={saving}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin && (
                      <>
                        <SelectItem value="salaire">Salaire</SelectItem>
                        <SelectItem value="salaire_travailleur">Salaire Travailleur</SelectItem>
                      </>
                    )}
                    <SelectItem value="achat_produits">Achat Produits</SelectItem>
                    <SelectItem value="charges">Charges</SelectItem>
                    <SelectItem value="loyer">Loyer</SelectItem>
                    <SelectItem value="electricite">Électricité</SelectItem>
                    <SelectItem value="eau">Eau</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="equipement">Équipement</SelectItem>
                    <SelectItem value="formation">Formation</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="repair">Réparation</SelectItem>
                    <SelectItem value="food">Nourriture</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge className={getCategoryColor(expense.categorie)}>
                    {getCategoryText(expense.categorie)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Montant</Label>
              {editing ? (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.montant}
                  onChange={(e) => handleInputChange('montant', parseFloat(e.target.value) || 0)}
                  disabled={saving}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {expense.montant.toFixed(0)}f
                  </span>
                </div>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Date</Label>
              {editing ? (
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={saving}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {new Date(expense.date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>

            {/* Linked User (for finance expenses) */}
            {(editing && financeCategories.includes(formData.categorie)) && (
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  {formData.categorie === 'salaire_travailleur' ? 'Travailleur' : 'Utilisateur'}
                </Label>
                <Select
                  value={formData.fournisseur_id}
                  onValueChange={(value) => handleInputChange('fournisseur_id', value)}
                  disabled={saving || loadingUsers}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder={
                      formData.categorie === 'salaire_travailleur' 
                        ? "Sélectionnez un travailleur" 
                        : "Sélectionnez un utilisateur"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.categorie === 'salaire_travailleur' ? (
                      travailleurs.map((trav) => (
                        <SelectItem key={trav.id} value={trav.id}>
                          {trav.first_name} {trav.last_name}
                        </SelectItem>
                      ))
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.role})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Display linked user for finance expenses when not editing */}
            {!editing && financeCategories.includes(expense.categorie) && expense.linked_user && (
              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">
                  {expense.categorie === 'salaire_travailleur' ? 'Travailleur' : 'Utilisateur'}
                </Label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {expense.linked_user.first_name} {expense.linked_user.last_name}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Informations complémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Notes</Label>
              {editing ? (
                <Textarea
                  value={formData.note}
                  onChange={(e) => handleInputChange('note', e.target.value)}
                  disabled={saving}
                  placeholder="Ajoutez des notes ou commentaires..."
                  rows={4}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground dark:text-gray-400 mt-1" />
                  <span className="text-gray-900 dark:text-white">
                    {expense.note || 'Aucune note'}
                  </span>
                </div>
              )}
            </div>

            {/* Created By */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Enregistré par</Label>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {expense.user ? 
                    `${expense.user.first_name} ${expense.user.last_name} (@${expense.user.pseudo})` :
                    'Utilisateur inconnu'
                  }
                </span>
              </div>
            </div>

            {/* Created At */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-300">Date de création</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {new Date(expense.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
