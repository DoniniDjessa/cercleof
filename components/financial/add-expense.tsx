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
import { TrendingDown, DollarSign } from "lucide-react"
import toast from "react-hot-toast"

interface AddExpenseProps {
  onExpenseCreated?: () => void
  expenseType?: 'main' | 'finances'
  isAdmin?: boolean
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

export function AddExpense({ onExpenseCreated, expenseType = 'main', isAdmin = false }: AddExpenseProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [travailleurs, setTravailleurs] = useState<Travailleur[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  const [formData, setFormData] = useState({
    categorie: "",
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    fournisseur_id: "",
    note: "",
    user_id: "", // For finance expenses - linked to user/travailleur
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    if (expenseType === 'finances' && isAdmin) {
      fetchUsersAndTravailleurs()
    }
  }, [expenseType, isAdmin])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation for finance expenses
    if (expenseType === 'finances' && !formData.user_id) {
      toast.error('Veuillez sélectionner un utilisateur ou travailleur pour cette dépense finance')
      return
    }

    if (!formData.categorie) {
      toast.error('Veuillez sélectionner une catégorie')
      return
    }

    if (!formData.montant || formData.montant <= 0) {
      toast.error('Veuillez entrer un montant valide')
      return
    }

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

      const expenseData = {
        categorie: formData.categorie,
        montant: parseFloat(formData.montant.toString()),
        date: new Date(formData.date).toISOString(),
        fournisseur_id: expenseType === 'main' 
          ? (formData.fournisseur_id || null)
          : (formData.user_id || null), // For finance expenses, use user_id as fournisseur_id
        note: formData.note || null,
        enregistre_par: currentUser.id
      }

      const { data, error } = await supabase
        .from('dd-depenses')
        .insert([expenseData])
        .select()

      if (error) {
        console.error('Error creating expense:', error)
        toast.error('Erreur lors de la création de la dépense: ' + error.message)
        return
      }

      toast.success("Dépense enregistrée avec succès!")
      
      // Reset form
      setFormData({
        categorie: "",
        montant: 0,
        date: new Date().toISOString().split('T')[0],
        fournisseur_id: "",
        note: "",
        user_id: "",
      })

      // Navigate back to expenses page
      window.history.replaceState({}, '', '/admin/expenses')
      
      if (onExpenseCreated) {
        onExpenseCreated()
      } else {
        // Reload page if no callback provided
        window.location.reload()
      }
      
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Erreur lors de l'enregistrement de la dépense. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    window.history.replaceState({}, '', '/admin/expenses')
    window.location.reload()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          {expenseType === 'finances' ? 'Nouvelle Dépense Finance' : 'Nouvelle Dépense'}
        </h1>
        <p className="text-muted-foreground dark:text-gray-400">
          {expenseType === 'finances' 
            ? 'Enregistrer une dépense liée aux finances (salaire, travailleurs)' 
            : 'Enregistrer une nouvelle dépense'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Informations de la Dépense
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categorie" className="text-gray-700 dark:text-gray-300">Catégorie *</Label>
                <Select
                  value={formData.categorie}
                  onValueChange={(value) => handleSelectChange('categorie', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez la catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseType === 'finances' ? (
                      <>
                        <SelectItem value="salaire">Salaire</SelectItem>
                        <SelectItem value="salaire_travailleur">Salaire Travailleur</SelectItem>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {expenseType === 'finances' && (
                <div className="space-y-2">
                  <Label htmlFor="user_id" className="text-gray-700 dark:text-gray-300">
                    {formData.categorie === 'salaire_travailleur' ? 'Travailleur *' : 'Utilisateur *'}
                  </Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(value) => handleSelectChange('user_id', value)}
                    disabled={loadingUsers}
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

              <div className="space-y-2">
                <Label htmlFor="montant" className="text-gray-700 dark:text-gray-300">Montant (f) *</Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.montant}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-gray-700 dark:text-gray-300">Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              {expenseType === 'main' && (
                <div className="space-y-2">
                  <Label htmlFor="fournisseur_id" className="text-gray-700 dark:text-gray-300">ID Fournisseur (optionnel)</Label>
                  <Input
                    id="fournisseur_id"
                    name="fournisseur_id"
                    value={formData.fournisseur_id}
                    onChange={handleChange}
                    placeholder="ID du fournisseur"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="note" className="text-gray-700 dark:text-gray-300">Notes</Label>
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
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé de la Dépense</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Catégorie</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.categorie || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Montant</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.montant.toFixed(0)}f</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.date ? new Date(formData.date).toLocaleDateString('fr-FR') : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Fournisseur ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.fournisseur_id || "—"}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? <ButtonLoadingSpinner /> : "Enregistrer la Dépense"}
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
