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
import { Truck, MapPin, User, Package, Upload, X, Image as ImageIcon } from "lucide-react"
import toast from "react-hot-toast"

interface Delivery {
  id: string
  vente_id?: string
  client_id?: string
  adresse: string
  livreur_id?: string
  livreur_name?: string
  statut: string
  date_livraison?: string
  frais: number
  mode: string
  preuve_photo?: string
  note?: string
  created_at: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface EditDeliveryProps {
  delivery: Delivery
  onDeliveryUpdated?: () => void
  onCancel?: () => void
}

export function EditDelivery({ delivery, onDeliveryUpdated, onCancel }: EditDeliveryProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deliveryImage, setDeliveryImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(delivery.preuve_photo || null)
  const [employees, setEmployees] = useState<Employee[]>([])
  
  const [formData, setFormData] = useState({
    livreur_id: delivery.livreur_id || "",
    livreur_name: delivery.livreur_name || "",
    date_livraison: delivery.date_livraison ? new Date(delivery.date_livraison).toISOString().slice(0, 16) : "",
    frais: delivery.frais || 0,
    mode: delivery.mode || "interne",
    note: delivery.note || "",
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from('dd-users')
        .select('id, first_name, last_name, role')
        .in('role', ['employe', 'manager', 'admin', 'superadmin', 'caissiere'])
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError

      setEmployees(employeesData || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Erreur lors du chargement des travailleurs')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    
    // Clear livreur fields when mode changes
    if (name === 'mode') {
      if (value === 'externe') {
        setFormData(prev => ({ ...prev, livreur_id: '' }))
      } else {
        setFormData(prev => ({ ...prev, livreur_name: '' }))
      }
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image valide')
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La taille du fichier ne doit pas dépasser 5MB')
        return
      }
      
      setDeliveryImage(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setDeliveryImage(null)
    setImagePreview(delivery.preuve_photo || null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!deliveryImage) return delivery.preuve_photo || null

    try {
      setUploadingImage(true)
      
      const fileExt = deliveryImage.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `deliveries/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('cb-bucket')
        .upload(filePath, deliveryImage)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        toast.error('Erreur lors du téléchargement de l\'image')
        return null
      }

      const { data } = supabase.storage
        .from('cb-bucket')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Erreur lors du téléchargement de l\'image')
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let deliveryImageUrl = delivery.preuve_photo || null
      if (deliveryImage) {
        deliveryImageUrl = await uploadImage()
        if (!deliveryImageUrl) {
          toast.error('Erreur lors du téléchargement de l\'image')
          return
        }
      }

      const updateData: any = {
        livreur_id: formData.mode === 'interne' ? (formData.livreur_id || null) : null,
        livreur_name: formData.mode === 'externe' ? (formData.livreur_name || null) : null,
        date_livraison: formData.date_livraison ? new Date(formData.date_livraison).toISOString() : null,
        frais: parseFloat(formData.frais.toString()),
        mode: formData.mode,
        preuve_photo: deliveryImageUrl,
        note: formData.note || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('dd-livraisons')
        .update(updateData)
        .eq('id', delivery.id)

      if (error) {
        console.error('Error updating delivery:', error)
        toast.error('Erreur lors de la mise à jour de la livraison: ' + error.message)
        return
      }

      toast.success("Livraison mise à jour avec succès!")
      
      if (onDeliveryUpdated) {
        onDeliveryUpdated()
      }
      
    } catch (error) {
      console.error("Error updating delivery:", error)
      toast.error("Erreur lors de la mise à jour de la livraison. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const selectedEmployee = employees.find(e => e.id === formData.livreur_id)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Modifier la Livraison</h1>
          <p className="text-muted-foreground dark:text-gray-400">Mettre à jour les informations de la livraison</p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Details */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Détails de Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mode" className="text-gray-700 dark:text-gray-300">Mode de Livraison</Label>
                  <Select
                    value={formData.mode}
                    onValueChange={(value) => handleSelectChange('mode', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interne">Interne</SelectItem>
                      <SelectItem value="externe">Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.mode === 'interne' ? (
                  <div className="space-y-2">
                    <Label htmlFor="livreur_id" className="text-gray-700 dark:text-gray-300">Livreur (Travailleur)</Label>
                    <Select
                      value={formData.livreur_id}
                      onValueChange={(value) => handleSelectChange('livreur_id', value)}
                    >
                      <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                        <SelectValue placeholder="Sélectionnez un travailleur" />
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="livreur_name" className="text-gray-700 dark:text-gray-300">Nom du Livreur Externe</Label>
                    <Input
                      id="livreur_name"
                      name="livreur_name"
                      type="text"
                      value={formData.livreur_name}
                      onChange={handleChange}
                      placeholder="Entrez le nom du livreur externe"
                      className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="date_livraison" className="text-gray-700 dark:text-gray-300">Date de Livraison</Label>
                  <Input
                    id="date_livraison"
                    name="date_livraison"
                    type="datetime-local"
                    value={formData.date_livraison}
                    onChange={handleChange}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="frais" className="text-gray-700 dark:text-gray-300">Frais de Livraison (f)</Label>
                  <Input
                    id="frais"
                    name="frais"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.frais}
                    onChange={handleChange}
                    placeholder="0.00"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Delivery Proof */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Preuve de Livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="deliveryImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('deliveryImage')?.click()}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {deliveryImage ? 'Changer' : 'Ajouter Photo'}
                    </Button>
                    {deliveryImage && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeImage}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Formats acceptés: JPG, PNG, WebP (max 5MB)
                  </p>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Notes */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note" className="text-gray-700 dark:text-gray-300">Notes de Livraison</Label>
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
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Adresse</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {delivery.adresse}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Livreur</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.mode === 'interne' && selectedEmployee 
                      ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                      : formData.mode === 'externe' && formData.livreur_name
                      ? formData.livreur_name
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Mode</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.mode === 'interne' ? 'Interne' : 'Externe'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Date de Livraison</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.date_livraison ? new Date(formData.date_livraison).toLocaleString('fr-FR') : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Frais</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.frais.toFixed(0)}f
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || uploadingImage}
                >
                  {loading || uploadingImage ? <ButtonLoadingSpinner /> : "Mettre à jour"}
                </Button>
                {onCancel && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
                    onClick={onCancel}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </form>
    </div>
  )
}

