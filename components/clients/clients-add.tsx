"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AnimatedCard } from "@/components/ui/animated-card"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { useTheme } from "@/contexts/ThemeContext"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import toast from "react-hot-toast"

interface ClientsAddProps {
  onClientCreated?: () => void
}

export function ClientsAdd({ onClientCreated }: ClientsAddProps) {
  const { t } = useTheme()
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: "",
    lastName: "",
    email: "",
    phones: [""],
    gender: "",
    birthDate: "",
    
    // Address & Contact
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Mali",
    preferredContactMethod: "phone", // Must be 'email', 'phone', or 'sms' per database constraint
    
    // Acquisition & Marketing
    acquisitionChannel: "",
    marketingConsent: false,
    
    // Beauty Profile
    skinType: "",
    hairType: "",
    nailType: "",
    allergies: "",
    productPreferences: "",
    brandPreferences: "",
    
    // Service Preferences
    visitFrequency: "",
    preferredEmployee: "",
    staffNotes: "",
    
    // Loyalty & Status
    loyaltyLevel: "bronze",
    internalStatus: "active",
    internalNotes: "",
    
    // Legacy fields for compatibility
    company: "",
    type: "individual",
    notes: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...formData.phones]
    newPhones[index] = value
    setFormData((prev) => ({ ...prev, phones: newPhones }))
  }

  const addPhoneNumber = () => {
    setFormData((prev) => ({ ...prev, phones: [...prev.phones, ""] }))
  }

  const removePhoneNumber = (index: number) => {
    if (formData.phones.length > 1) {
      const newPhones = formData.phones.filter((_, i) => i !== index)
      setFormData((prev) => ({ ...prev, phones: newPhones }))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Veuillez sélectionner un fichier image valide')
        return
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La taille du fichier ne doit pas dépasser 5MB')
        return
      }
      
      setProfileImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setProfileImage(null)
    setImagePreview(null)
  }

  const uploadImage = async (): Promise<string | null> => {
    if (!profileImage) return null

    try {
      setUploadingImage(true)
      
      const fileExt = profileImage.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `clients/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('cb-bucket')
        .upload(filePath, profileImage)

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
      // Check if authUser exists
      if (!authUser || !authUser.id) {
        toast.error('Utilisateur non authentifié. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      // Get current user ID for created_by field
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

      // Upload image if provided
      let profileImageUrl = null
      if (profileImage) {
        profileImageUrl = await uploadImage()
        if (!profileImageUrl) {
          toast.error('Erreur lors du téléchargement de l\'image')
          return
        }
      }

      // Prepare comprehensive client data for insertion
      // Only include fields that exist in the base dd-clients table schema
      const clientData: Record<string, any> = {
        // Basic Information (required fields in base schema)
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email.trim() || null, // Allow null if empty
        phone: formData.phones[0]?.trim() || null, // Use first phone (base schema has single phone field, not array)
        gender: formData.gender || null,
        date_of_birth: formData.birthDate || null, // Note: base schema uses date_of_birth, not birth_date
        
        // Address & Contact (fields that exist in base schema)
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.zipCode || null,
        country: formData.country || 'Mali',
        // Ensure preferred_contact_method is one of the allowed values
        preferred_contact_method: (formData.preferredContactMethod === 'email' || formData.preferredContactMethod === 'phone' || formData.preferredContactMethod === 'sms') 
          ? formData.preferredContactMethod 
          : 'phone', // Default to 'phone' if invalid value
        marketing_consent: formData.marketingConsent || false,
        
        // Notes (exists in base schema)
        notes: formData.notes || null,
        
        // System fields
        is_active: true,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      }
      
      // Remove null values for optional fields to avoid insertion issues
      Object.keys(clientData).forEach(key => {
        if (clientData[key] === null || clientData[key] === undefined || clientData[key] === '') {
          // Keep null for fields that explicitly allow null, remove empty strings
          if (clientData[key] === '') {
            delete clientData[key]
          }
        }
      })

      // Insert client into dd-clients table
      const { data, error } = await supabase
        .from('dd-clients')
        .insert([clientData])
        .select()

      if (error) {
        console.error('Error creating client:', error)
        toast.error('Erreur lors de la création du client: ' + error.message)
        return
      }

      toast.success("Client créé avec succès!")
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phones: [""],
        gender: "",
        birthDate: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: "Mali",
        preferredContactMethod: "phone", // Must be 'email', 'phone', or 'sms' per database constraint
        acquisitionChannel: "",
        marketingConsent: false,
        skinType: "",
        hairType: "",
        nailType: "",
        allergies: "",
        productPreferences: "",
        brandPreferences: "",
        visitFrequency: "",
        preferredEmployee: "",
        staffNotes: "",
        loyaltyLevel: "bronze",
        internalStatus: "active",
        internalNotes: "",
        company: "",
        type: "individual",
        notes: "",
      })
      
      // Reset image
      setProfileImage(null)
      setImagePreview(null)

      // Call the callback to refresh the clients list
      if (onClientCreated) {
        onClientCreated()
      }
      
    } catch (error) {
      console.error("Error creating client:", error)
      toast.error("Erreur lors de la création du client. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Clear URL parameters and go back to clients list
    window.history.replaceState({}, '', '/admin/clients')
    window.location.reload()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Ajouter un Client</h1>
        <p className="text-muted-foreground dark:text-gray-400">Créer un nouveau profil client avec toutes les informations nécessaires.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Image */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.1}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Photo de Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('profileImage')?.click()}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {profileImage ? 'Changer' : 'Ajouter Photo'}
                    </Button>
                    {profileImage && (
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

          {/* Personal Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.2}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Informations Personnelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">Prénom *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Entrez le prénom"
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">Nom *</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Entrez le nom"
                    required
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Entrez l'email (optionnel)"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-gray-700 dark:text-gray-300">Genre</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleSelectChange('gender', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez le genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Femme</SelectItem>
                      <SelectItem value="male">Homme</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-gray-700 dark:text-gray-300">Date de Naissance</Label>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredContactMethod" className="text-gray-700 dark:text-gray-300">Méthode de Contact Préférée</Label>
                  <Select
                    value={formData.preferredContactMethod}
                    onValueChange={(value) => handleSelectChange('preferredContactMethod', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Téléphone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 dark:text-gray-300">Numéros de Téléphone *</Label>
                <div className="space-y-2">
                  {formData.phones.map((phone, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={phone}
                        onChange={(e) => handlePhoneChange(index, e.target.value)}
                        placeholder="Entrez le numéro de téléphone"
                        required={index === 0}
                        className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                      />
                      {formData.phones.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePhoneNumber(index)}
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhoneNumber}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                  >
                    + Ajouter un Numéro
                  </Button>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Address Information */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.3}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Adresse et Localisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Entrez l'adresse complète"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-gray-700 dark:text-gray-300">Ville</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    value={formData.city} 
                    onChange={handleChange} 
                    placeholder="Entrez la ville" 
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-gray-700 dark:text-gray-300">Région</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Entrez la région"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode" className="text-gray-700 dark:text-gray-300">Code Postal</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    placeholder="Entrez le code postal"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-gray-700 dark:text-gray-300">Pays</Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="Entrez le pays"
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Beauty Profile */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.4}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Profil Beauté</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skinType" className="text-gray-700 dark:text-gray-300">Type de Peau</Label>
                  <Select
                    value={formData.skinType}
                    onValueChange={(value) => handleSelectChange('skinType', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="seche">Sèche</SelectItem>
                      <SelectItem value="grasse">Grasse</SelectItem>
                      <SelectItem value="mixte">Mixte</SelectItem>
                      <SelectItem value="sensible">Sensible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hairType" className="text-gray-700 dark:text-gray-300">Type de Cheveux</Label>
                  <Select
                    value={formData.hairType}
                    onValueChange={(value) => handleSelectChange('hairType', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normaux">Normaux</SelectItem>
                      <SelectItem value="secs">Secs</SelectItem>
                      <SelectItem value="gras">Gras</SelectItem>
                      <SelectItem value="mixtes">Mixtes</SelectItem>
                      <SelectItem value="abimes">Abîmés</SelectItem>
                      <SelectItem value="colores">Colorés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nailType" className="text-gray-700 dark:text-gray-300">Type d'Ongles</Label>
                  <Select
                    value={formData.nailType}
                    onValueChange={(value) => handleSelectChange('nailType', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normaux">Normaux</SelectItem>
                      <SelectItem value="fragiles">Fragiles</SelectItem>
                      <SelectItem value="casses">Cassés</SelectItem>
                      <SelectItem value="mous">Mous</SelectItem>
                      <SelectItem value="secs">Secs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies" className="text-gray-700 dark:text-gray-300">Allergies ou Sensibilités</Label>
                <Textarea
                  id="allergies"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  placeholder="Décrivez les allergies ou sensibilités connues..."
                  rows={2}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productPreferences" className="text-gray-700 dark:text-gray-300">Préférences Produits</Label>
                  <Textarea
                    id="productPreferences"
                    name="productPreferences"
                    value={formData.productPreferences}
                    onChange={handleChange}
                    placeholder="Produits préférés..."
                    rows={2}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandPreferences" className="text-gray-700 dark:text-gray-300">Marques Préférées</Label>
                  <Textarea
                    id="brandPreferences"
                    name="brandPreferences"
                    value={formData.brandPreferences}
                    onChange={handleChange}
                    placeholder="Marques préférées..."
                    rows={2}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Acquisition & Marketing */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.5}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Acquisition et Marketing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="acquisitionChannel" className="text-gray-700 dark:text-gray-300">Canal d'Acquisition</Label>
                <Select
                  value={formData.acquisitionChannel}
                  onValueChange={(value) => handleSelectChange('acquisitionChannel', value)}
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                    <SelectValue placeholder="Comment le client vous a-t-il trouvé ?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="publicite">Publicité</SelectItem>
                    <SelectItem value="recommandation">Recommandation</SelectItem>
                    <SelectItem value="passage">Passage devant l'institut</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketingConsent"
                  checked={formData.marketingConsent}
                  onCheckedChange={(checked) => handleCheckboxChange('marketingConsent', checked as boolean)}
                />
                <Label htmlFor="marketingConsent" className="text-gray-700 dark:text-gray-300">
                  Consentement pour le marketing (SMS, Email, WhatsApp)
                </Label>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Service Preferences */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.6}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Préférences de Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="visitFrequency" className="text-gray-700 dark:text-gray-300">Fréquence de Visite</Label>
                  <Select
                    value={formData.visitFrequency}
                    onValueChange={(value) => handleSelectChange('visitFrequency', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue placeholder="Sélectionnez la fréquence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                      <SelectItem value="bihebdomadaire">Bi-hebdomadaire</SelectItem>
                      <SelectItem value="mensuelle">Mensuelle</SelectItem>
                      <SelectItem value="bimensuelle">Bi-mensuelle</SelectItem>
                      <SelectItem value="occasionnelle">Occasionnelle</SelectItem>
                      <SelectItem value="premiere_fois">Première fois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredEmployee" className="text-gray-700 dark:text-gray-300">Employé(e) Préféré(e)</Label>
                  <Input
                    id="preferredEmployee"
                    name="preferredEmployee"
                    value={formData.preferredEmployee}
                    onChange={handleChange}
                    placeholder="Nom de l'employé(e) préféré(e)"
                    className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staffNotes" className="text-gray-700 dark:text-gray-300">Notes du Personnel</Label>
                <Textarea
                  id="staffNotes"
                  name="staffNotes"
                  value={formData.staffNotes}
                  onChange={handleChange}
                  placeholder="Notes internes du personnel (préférences, remarques spéciales...)"
                  rows={3}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>

          {/* Status & Loyalty */}
          <AnimatedCard className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.7}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Statut et Fidélité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="loyaltyLevel" className="text-gray-700 dark:text-gray-300">Niveau de Fidélité</Label>
                  <Select
                    value={formData.loyaltyLevel}
                    onValueChange={(value) => handleSelectChange('loyaltyLevel', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">Bronze</SelectItem>
                      <SelectItem value="silver">Argent</SelectItem>
                      <SelectItem value="gold">Or</SelectItem>
                      <SelectItem value="platinum">Platine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalStatus" className="text-gray-700 dark:text-gray-300">Statut Interne</Label>
                  <Select
                    value={formData.internalStatus}
                    onValueChange={(value) => handleSelectChange('internalStatus', value)}
                  >
                    <SelectTrigger className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="blocked">Bloqué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalNotes" className="text-gray-700 dark:text-gray-300">Notes Internes</Label>
                <Textarea
                  id="internalNotes"
                  name="internalNotes"
                  value={formData.internalNotes}
                  onChange={handleChange}
                  placeholder="Notes internes pour l'équipe..."
                  rows={2}
                  className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
                />
              </div>
            </CardContent>
          </AnimatedCard>
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <AnimatedCard className="sticky top-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" delay={0.8}>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Résumé du Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Nom Complet</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.firstName} {formData.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.email || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Téléphones</p>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formData.phones.filter(phone => phone.trim()).length > 0 ? (
                      formData.phones.filter(phone => phone.trim()).map((phone, index) => (
                        <div key={index}>{phone}</div>
                      ))
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Genre</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.gender === 'female' ? 'Femme' : 
                     formData.gender === 'male' ? 'Homme' : 
                     formData.gender === 'other' ? 'Autre' : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Date de Naissance</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.birthDate ? new Date(formData.birthDate).toLocaleDateString('fr-FR') : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Contact Préféré</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {formData.preferredContactMethod === 'phone' ? 'Téléphone' :
                     formData.preferredContactMethod === 'email' ? 'Email' :
                     formData.preferredContactMethod === 'sms' ? 'SMS' : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Canal d'Acquisition</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formData.acquisitionChannel ? 
                      formData.acquisitionChannel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Niveau de Fidélité</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {formData.loyaltyLevel === 'bronze' ? 'Bronze' :
                     formData.loyaltyLevel === 'silver' ? 'Argent' :
                     formData.loyaltyLevel === 'gold' ? 'Or' :
                     formData.loyaltyLevel === 'platinum' ? 'Platine' : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground dark:text-gray-400">Statut</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {formData.internalStatus === 'active' ? 'Actif' :
                     formData.internalStatus === 'inactive' ? 'Inactif' :
                     formData.internalStatus === 'prospect' ? 'Prospect' :
                     formData.internalStatus === 'vip' ? 'VIP' :
                     formData.internalStatus === 'blocked' ? 'Bloqué' : '—'}
                  </p>
                </div>
                {formData.skinType && (
                  <div>
                    <p className="text-muted-foreground dark:text-gray-400">Type de Peau</p>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{formData.skinType}</p>
                  </div>
                )}
                {formData.marketingConsent && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-600 dark:text-green-400">✓ Consentement marketing accordé</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={loading || uploadingImage}
                >
                  {loading || uploadingImage ? <ButtonLoadingSpinner /> : "Créer le Client"}
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
