"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ButtonLoadingSpinner } from "@/components/ui/context-loaders"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { X, UserPlus } from "lucide-react"
import toast from "react-hot-toast"

interface QuickCreateClientProps {
  isOpen: boolean
  onClose: () => void
  onClientCreated: (client: { id: string; first_name: string; last_name: string; email: string; phone?: string }) => void
}

export function QuickCreateClient({ isOpen, onClose, onClientCreated }: QuickCreateClientProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  if (!isOpen) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Le prénom et le nom sont requis')
      return
    }

    if (!formData.email.trim() && !formData.phone.trim()) {
      toast.error('Au moins un email ou un numéro de téléphone est requis')
      return
    }

    setLoading(true)

    try {
      // Get current user ID for created_by field
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

      // Prepare client data - only essential fields for quick creation
      const clientData = {
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        phones: formData.phone.trim() ? [formData.phone.trim()] : [],
        is_active: true,
        created_by_user_id: currentUser.id,
        updated_by_user_id: currentUser.id,
        // Set defaults for required fields
        preferred_contact_method: 'whatsapp',
        loyalty_level: 'bronze',
        internal_status: 'active',
      }

      // Insert client into dd-clients table
      const { data, error } = await supabase
        .from('dd-clients')
        .insert([clientData])
        .select('id, first_name, last_name, email, phone')
        .single()

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
        phone: "",
      })

      // Call callback with new client
      onClientCreated(data)
      onClose()
      
    } catch (error) {
      console.error("Error creating client:", error)
      toast.error("Erreur lors de la création du client. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Créer un Client Rapidement
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-gray-700 dark:text-gray-300">
                Prénom *
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Prénom"
                required
                autoFocus
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-gray-700 dark:text-gray-300">
                Nom *
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Nom"
                required
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@example.com"
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300">
                Téléphone
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+223 XX XX XX XX"
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              * Champs requis. Au moins un email ou téléphone est nécessaire.
            </p>

            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading}
              >
                {loading ? <ButtonLoadingSpinner /> : "Créer"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 bg-transparent border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" 
                onClick={handleCancel}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

