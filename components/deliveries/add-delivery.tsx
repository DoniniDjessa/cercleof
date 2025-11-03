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

interface Sale {
  id: string
  client_id?: string
  total_net: number
  date: string
  client?: {
    id: string
    first_name: string
    last_name: string
    email: string
    phones: string[]
  }
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface AddDeliveryProps {
  onDeliveryCreated?: () => void
}

export function AddDelivery({ onDeliveryCreated }: AddDeliveryProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [deliveryImage, setDeliveryImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  
  const [formData, setFormData] = useState({
    vente_id: "",
    client_id: "",
    adresse: "",
    livreur_id: "",
    date_livraison: "",
    frais: 0,
    mode: "interne",
    note: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch sales with clients
      const { data: salesData, error: salesError } = await supabase
        .from('dd-ventes')
        .select(`
          *,
          client:dd-clients(id, first_name, last_name, email, phones)
        `)
        .eq('status', 'paye')
        .order('date', { ascending: false })
        .limit(100)

      if (salesError) throw salesError

      // Fetch employees (users with delivery roles)
      const { data: employeesData, error: employeesError } = await supabase
        .from('dd-users')
        .select('id, first_name, last_name, role')
        .in('role', ['employe', 'manager', 'admin', 'superadmin'])
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError

      setSales(salesData || [])
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
    
    // Auto-fill client when sale is selected
    if (name === 'vente_id') {
      const selectedSale = sales.find(s => s.id === value)
      if (selectedSale && selectedSale.client_id) {
        setFormData(prev => ({ 
          ...prev, 
          client_id: selectedSale.client_id,
          adresse: selectedSale.client?.address || ""
        }))
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
    setImagePreview(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!deliveryImage) return null

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

      let deliveryImageUrl = null
      if (deliveryImage) {
        deliveryImageUrl = await uploadImage()
        if (!deliveryImageUrl) {
          toast.error('Erreur lors du téléchargement de l\'image')
          return
        }
      }

      const deliveryData = {
        vente_id: formData.vente_id || null,
        client_id: formData.client_id || null,
        adresse: formData.adresse,
        livreur_id: formData.livreur_id || null,
        statut: 'en_preparation',
        date_livraison: formData.date_livraison ? new Date(formData.date_livraison).toISOString() : null,
        frais: parseFloat(formData.frais.toString()),
        mode: formData.mode,
        preuve_photo: deliveryImageUrl,
        note: formData.note || null,
        created_by: currentUser.id
      }

      const { data, error } = await supabase
        .from('dd-livraisons')
        .insert([deliveryData])
        .select()

      if (error) {
        console.error('Error creating delivery:', error)
        toast.error('Erreur lors de la création de la livraison: ' + error.message)
        return
      }

      toast.success("Livraison créée avec succès!")
      
      // Reset form
      setFormData({
        vente_id: "",
        client_id: "",
        adresse: "",
        livreur_id: "",
        date_livraison: "",
        frais: 0,
        mode: "interne",
        note: "",
      })
      
      setDeliveryImage(null)
      setImagePreview(null)

      if (onDeliveryCreated) {
        onDeliveryCreated()
      }
      
    } catch (error) {
      console.error("Error creating delivery:", error)
      toast.error("Erreur lors de la création de la livraison. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    window.history.replaceState({}, '', '/admin/deliveries')
    window.location.reload()
  }

  const selectedSale = sales.find(s => s.id === formData.vente_id)
  const selectedClient = sales.find(s => s.client_id === formData.client_id)?.client
  const selectedEmployee = employees.find(e => e.id === formData.livreur_id)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Nouvelle Livraison</h1>
        <p className="text-muted-foreground dark:text-gray-400">Créer une nouvelle livraison</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Selection */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Vente Associée
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vente_id" className="text-gray-700 dark:text-gray-300">Vente (optionnel)</Label>
                <Select
                  value={formData.vente_id}
                  onValueChange={(value) => handleSelectChange('vente_id', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Sélectionnez une vente" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        #{sale.id.slice(-8)} - {sale.client ? `${sale.client.first_name} ${sale.client.last_name}` : 'Client anonyme'} - {sale.total_net.toFixed(0)} XOF
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Client Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
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
                    <SelectValue placeholder="Sélectionnez un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.filter(s => s.client).map((sale) => (
                      <SelectItem key={sale.client_id} value={sale.client_id!}>
                        {sale.client?.first_name} {sale.client?.last_name} - {sale.client?.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Delivery Address */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Adresse de Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-gray-700 dark:text-gray-300">Adresse *</Label>
                <Textarea
                  id="adresse"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  placeholder="Entrez l'adresse complète de livraison..."
                  rows={3}
                  required
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Delivery Details */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Détails de Livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="livreur_id" className="text-gray-700 dark:text-gray-300">Livreur</Label>
                  <Select
                    value={formData.livreur_id}
                    onValueChange={(value) => handleSelectChange('livreur_id', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez un livreur" />
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
                  <Label htmlFor="frais" className="text-gray-700 dark:text-gray-300">Frais de Livraison (XOF)</Label>
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
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.5}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Preuve de Livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
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
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.6}>
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
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.7}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé de la Livraison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Vente</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedSale ? `#${selectedSale.id.slice(-8)}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Client</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Livreur</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "—"}
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
                    {formData.frais.toFixed(0)} XOF
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || uploadingImage}
                >
                  {loading || uploadingImage ? <ButtonLoadingSpinner /> : "Créer la Livraison"}
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
