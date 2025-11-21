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
import { TrendingUp, DollarSign } from "lucide-react"
import toast from "react-hot-toast"

interface AddRevenueProps {
  onRevenueCreated?: () => void
  revenueId?: string | null // If provided, we're in edit mode
  onCancel?: () => void
}

export function AddRevenue({ onRevenueCreated, revenueId, onCancel }: AddRevenueProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const isEditMode = !!revenueId
  
  // Get current date and time for default values
  const now = new Date()
  const defaultDate = now.toISOString().split('T')[0]
  const defaultTime = now.toTimeString().slice(0, 5) // HH:mm format
  
  const [formData, setFormData] = useState({
    type: "",
    source_id: "",
    montant: 0,
    date: defaultDate,
    time: defaultTime,
    note: "",
    // Service-specific fields
    categorie: "none",
    sous_categorie: "none",
    type_employe: "",
    nom_employe: "none",
  })

  // Service categories and employees
  const [serviceCategories, setServiceCategories] = useState<Array<{id: string, name: string, parent_id: string | null}>>([])
  const [subcategories, setSubcategories] = useState<Array<{id: string, name: string, parent_id: string | null}>>([])
  const [employees, setEmployees] = useState<Array<{id: string, first_name: string, last_name: string}>>([])
  const [employeeInputMode, setEmployeeInputMode] = useState<'select' | 'text'>('select')

  // Fetch service categories and employees
  useEffect(() => {
    fetchServiceCategories()
    fetchEmployees()
  }, [])

  // Fetch subcategories when category changes
  useEffect(() => {
    if (formData.categorie && formData.categorie !== 'none') {
      fetchSubcategories(formData.categorie)
    } else {
      setSubcategories([])
      setFormData(prev => ({ ...prev, sous_categorie: "none" }))
    }
  }, [formData.categorie])

  // Fetch revenue data if in edit mode
  useEffect(() => {
    if (revenueId) {
      fetchRevenueData()
    }
  }, [revenueId])

  const fetchServiceCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', 'service')
        .eq('is_active', true)
        .is('parent_id', null) // Only parent categories
        .order('name')

      if (error) throw error
      setServiceCategories(data || [])
    } catch (error) {
      console.error('Error fetching service categories:', error)
    }
  }

  const fetchSubcategories = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', 'service')
        .eq('is_active', true)
        .eq('parent_id', parentId)
        .order('name')

      if (error) throw error
      setSubcategories(data || [])
    } catch (error) {
      console.error('Error fetching subcategories:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-travailleurs')
        .select('id, first_name, last_name')
        .order('first_name')

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching travailleurs:', error)
    }
  }

  const fetchRevenueData = async () => {
    if (!revenueId) return
    
    try {
      setFetching(true)
      const { data, error } = await supabase
        .from('dd-revenues')
        .select('*')
        .eq('id', revenueId)
        .single()

      if (error) throw error

      if (data) {
        const revenueDate = new Date(data.date)
        const dateStr = revenueDate.toISOString().split('T')[0]
        const timeStr = revenueDate.toTimeString().slice(0, 5)
        
        // Parse service details from note if it's a JSON string
        let serviceDetails = {
          categorie: "none",
          sous_categorie: "none",
          type_employe: "",
          nom_employe: "none",
        }
        let noteText = ""
        
        if (data.type === 'service' && data.note) {
          try {
            const parsed = JSON.parse(data.note)
            if (parsed.categorie || parsed.sous_categorie || parsed.type_employe || parsed.nom_employe) {
              serviceDetails = {
                categorie: parsed.categorie || "none",
                sous_categorie: parsed.sous_categorie || "none",
                type_employe: parsed.type_employe || "",
                nom_employe: parsed.nom_employe || "none",
              }
              // Extract note_text if it exists
              if (parsed.note_text) {
                noteText = parsed.note_text
              }
            }
          } catch (e) {
            // Note is not JSON, keep it as is
            noteText = data.note || ""
          }
        } else {
          noteText = data.note || ""
        }
        
        setFormData({
          type: data.type || "",
          source_id: data.source_id || "",
          montant: data.montant || 0,
          date: dateStr,
          time: timeStr,
          note: noteText,
          ...serviceDetails,
        })
        
        // Fetch subcategories if category is set
        if (serviceDetails.categorie && serviceDetails.categorie !== 'none') {
          fetchSubcategories(serviceDetails.categorie)
        }
      }
    } catch (error) {
      console.error('Error fetching revenue:', error)
      toast.error('Erreur lors du chargement du revenu')
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'number' && name === 'montant') {
      // Handle number input separately
      const numValue = value === '' ? 0 : parseFloat(value) || 0
      setFormData((prev) => ({ ...prev, [name]: numValue }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if authUser exists
      if (!authUser || !authUser.id) {
        toast.error('Utilisateur non authentifié. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const { data: currentUser, error: userError } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError) {
        console.error('Error fetching current user:', userError)
        toast.error('Erreur lors de la récupération des informations utilisateur')
        setLoading(false)
        return
      }

      if (!currentUser || !currentUser.id) {
        toast.error('Utilisateur introuvable dans la base de données')
        setLoading(false)
        return
      }

      // Validate and convert montant
      const montantValue = Number(formData.montant) || 0

      if (isNaN(montantValue) || montantValue <= 0) {
        toast.error('Veuillez entrer un montant valide (supérieur à 0)')
        setLoading(false)
        return
      }

      // Ensure source_id is either a valid UUID string or null (not empty string)
      // UUID validation regex pattern
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      let sourceIdValue: string | null = null
      
      if (formData.source_id && formData.source_id.trim() !== '') {
        const trimmedSourceId = formData.source_id.trim()
        // Validate UUID format if provided
        if (uuidRegex.test(trimmedSourceId)) {
          sourceIdValue = trimmedSourceId
        } else {
          toast.error('L\'ID Source doit être un UUID valide ou laissé vide')
          setLoading(false)
          return
        }
      }

      // Combine date and time into a single datetime
      const dateTimeStr = `${formData.date}T${formData.time}:00`
      const dateTime = new Date(dateTimeStr)

      // Build note with service details if type is service
      let noteValue: string | null = null
      if (formData.type === 'service') {
        const serviceDetails: any = {}
        if (formData.categorie && formData.categorie !== 'none') serviceDetails.categorie = formData.categorie
        if (formData.sous_categorie && formData.sous_categorie !== 'none') serviceDetails.sous_categorie = formData.sous_categorie
        if (formData.type_employe) serviceDetails.type_employe = formData.type_employe
        if (formData.nom_employe && formData.nom_employe !== 'none') serviceDetails.nom_employe = formData.nom_employe
        
        // If there are service details or a note, combine them
        if (Object.keys(serviceDetails).length > 0 || (formData.note && formData.note.trim() !== '')) {
          if (formData.note && formData.note.trim() !== '') {
            serviceDetails.note_text = formData.note.trim()
          }
          noteValue = JSON.stringify(serviceDetails)
        }
      } else {
        // For non-service types, just use the note as is
        noteValue = formData.note && formData.note.trim() !== '' ? formData.note.trim() : null
      }

      const revenueData = {
        type: formData.type,
        source_id: sourceIdValue,
        montant: montantValue,
        date: dateTime.toISOString(),
        note: noteValue,
        ...(isEditMode ? {} : { enregistre_par: currentUser.id }) // Don't update enregistre_par on edit
      }

      let data, error
      if (isEditMode && revenueId) {
        // Update existing revenue
        const { data: updateData, error: updateError } = await supabase
          .from('dd-revenues')
          .update(revenueData)
          .eq('id', revenueId)
          .select()
        data = updateData
        error = updateError
      } else {
        // Create new revenue
        const { data: insertData, error: insertError } = await supabase
          .from('dd-revenues')
          .insert([revenueData])
          .select()
        data = insertData
        error = insertError
      }

      if (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'creating'} revenue:`, error)
        toast.error(`Erreur lors de ${isEditMode ? 'la mise à jour' : 'la création'} du revenu: ` + error.message)
        return
      }

      toast.success(`Revenu ${isEditMode ? 'modifié' : 'enregistré'} avec succès!`)
      
      if (isEditMode) {
        // In edit mode, just call the callback and let parent handle navigation
        if (onRevenueCreated) {
          onRevenueCreated()
        }
        if (onCancel) {
          onCancel()
        }
      } else {
        // Reset form for create mode
        const now = new Date()
        setFormData({
          type: "",
          source_id: "",
          montant: 0,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          note: "",
          categorie: "none",
          sous_categorie: "none",
          type_employe: "",
          nom_employe: "none",
        })
        setEmployeeInputMode('select')

        // Navigate back to revenues list
        window.history.replaceState({}, '', '/admin/revenues')
        
        if (onRevenueCreated) {
          onRevenueCreated()
        }
      }
      
    } catch (error) {
      console.error("Error creating revenue:", error)
      toast.error("Erreur lors de l'enregistrement du revenu. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (isEditMode && onCancel) {
      onCancel()
    } else {
      window.history.replaceState({}, '', '/admin/revenues')
      window.location.reload()
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">
          {isEditMode ? 'Modifier le Revenu' : 'Nouveau Revenu'}
        </h1>
        <p className="text-muted-foreground dark:text-gray-400">
          {isEditMode ? 'Modifier les informations du revenu' : 'Enregistrer un nouveau revenu'}
        </p>
      </div>

      {fetching && (
        <div className="flex items-center justify-center p-8">
          <ButtonLoadingSpinner />
        </div>
      )}

      <form onSubmit={handleSubmit} className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${fetching ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Informations du Revenu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type" className="text-gray-700 dark:text-gray-300">Type de Revenu *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez le type de revenu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">Vente</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="abonnement">Abonnement</SelectItem>
                    <SelectItem value="partenariat">Partenariat</SelectItem>
                    <SelectItem value="investissement">Investissement</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="source_id" className="text-gray-700 dark:text-gray-300">ID Source (optionnel)</Label>
                <Input
                  id="source_id"
                  name="source_id"
                  value={formData.source_id}
                  onChange={handleChange}
                  placeholder="ID de la vente, service ou autre source"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="montant" className="text-gray-700 dark:text-gray-300">Montant (f) *</Label>
                <Input
                  id="montant"
                  name="montant"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.montant === 0 ? '' : formData.montant}
                  onChange={handleChange}
                  onFocus={(e) => {
                    // Select all text when focused for easy editing
                    e.target.select()
                  }}
                  placeholder="0.00"
                  required
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-gray-700 dark:text-gray-300">Heure *</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Service-specific fields - only show when type is "service" */}
              {formData.type === 'service' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="categorie" className="text-gray-700 dark:text-gray-300">Catégorie (optionnel)</Label>
                    <Select
                      value={formData.categorie}
                      onValueChange={(value) => handleSelectChange('categorie', value)}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionnez une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        {serviceCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.categorie && formData.categorie !== 'none' && subcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="sous_categorie" className="text-gray-700 dark:text-gray-300">Sous-catégorie (optionnel)</Label>
                      <Select
                        value={formData.sous_categorie}
                        onValueChange={(value) => handleSelectChange('sous_categorie', value)}
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                          <SelectValue placeholder="Sélectionnez une sous-catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucune</SelectItem>
                          {subcategories.map((subcat) => (
                            <SelectItem key={subcat.id} value={subcat.id}>
                              {subcat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="type_employe" className="text-gray-700 dark:text-gray-300">Type d'employé (optionnel)</Label>
                    <Input
                      id="type_employe"
                      name="type_employe"
                      value={formData.type_employe}
                      onChange={handleChange}
                      placeholder="Ex: Coiffeuse, Esthéticienne..."
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="nom_employe" className="text-gray-700 dark:text-gray-300">Nom employé (optionnel)</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmployeeInputMode(employeeInputMode === 'select' ? 'text' : 'select')}
                        className="text-xs h-6 px-2"
                      >
                        {employeeInputMode === 'select' ? 'Taper manuellement' : 'Sélectionner'}
                      </Button>
                    </div>
                    {employeeInputMode === 'select' ? (
                      <Select
                        value={formData.nom_employe}
                        onValueChange={(value) => handleSelectChange('nom_employe', value)}
                      >
                        <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                          <SelectValue placeholder="Sélectionnez un employé" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={`${emp.first_name} ${emp.last_name}`}>
                              {emp.first_name} {emp.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="nom_employe"
                        name="nom_employe"
                        value={formData.nom_employe}
                        onChange={handleChange}
                        placeholder="Tapez le nom de l'employé"
                        className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                      />
                    )}
                  </div>
                </>
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
              <CardTitle className="text-gray-900 dark:text-white">Résumé du Revenu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.type || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Montant</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.montant && !isNaN(formData.montant) ? formData.montant.toFixed(0) : '0'}f
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Date et Heure</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.date ? (
                      <>
                        {new Date(formData.date).toLocaleDateString('fr-FR')}
                        {formData.time && ` à ${formData.time}`}
                      </>
                    ) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Source ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.source_id || "—"}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading}
                >
                  {loading ? <ButtonLoadingSpinner /> : isEditMode ? "Modifier le Revenu" : "Enregistrer le Revenu"}
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
