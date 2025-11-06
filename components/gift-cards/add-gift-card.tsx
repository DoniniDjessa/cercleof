"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { AnimatedButton } from '@/components/ui/animated-button'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Gift, 
  Calendar, 
  DollarSign, 
  User,
  Save,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface AddGiftCardProps {
  onGiftCardCreated?: () => void
  onCancel?: () => void
}

export function AddGiftCard({ onGiftCardCreated, onCancel }: AddGiftCardProps) {
  const { user: authUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    code: '',
    initial_amount: 0,
    client_id: '',
    expiry_date: '',
    notes: ''
  })

  useEffect(() => {
    fetchClients()
    generateCode()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, email')
        .eq('is_active', true)
        .order('first_name')

      if (error) throw error

      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const generateCode = () => {
    // Generate a unique gift card code: GC-XXXX-XXXX
    const randomPart1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const randomPart2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const code = `GC-${randomPart1}-${randomPart2}`
    setFormData(prev => ({ ...prev, code }))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.code || formData.initial_amount <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      setLoading(true)

      // Get current user
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

      const giftCardData = {
        code: formData.code.toUpperCase().trim(),
        initial_amount: formData.initial_amount,
        current_balance: formData.initial_amount,
        client_id: formData.client_id || null,
        purchased_by: currentUser.id,
        expiry_date: formData.expiry_date || null,
        status: 'active',
        notes: formData.notes || null,
        created_by: currentUser.id
      }

      const { data: insertedGiftCard, error } = await supabase
        .from('dd-gift-cards')
        .insert([giftCardData])
        .select()
        .single()

      if (error) {
        console.error('Error creating gift card:', error)
        if (error.code === '23505') { // Unique constraint violation
          toast.error('Ce code de carte cadeau existe déjà. Veuillez générer un nouveau code.')
          generateCode()
          return
        }
        toast.error('Erreur lors de la création de la carte cadeau')
        return
      }

      // Create transaction record
      if (insertedGiftCard) {
        const { error: transactionError } = await supabase
          .from('dd-gift-card-transactions')
          .insert([{
            gift_card_id: insertedGiftCard.id,
            amount: formData.initial_amount,
            balance_before: 0,
            balance_after: formData.initial_amount,
            transaction_type: 'purchase',
            notes: 'Carte cadeau créée',
            created_by: currentUser.id
          }])

        if (transactionError) {
          console.error('Error creating transaction:', transactionError)
          // Don't fail the whole operation if transaction creation fails
        }
      }

      toast.success('Carte cadeau créée avec succès!')
      
      // Reset form
      setFormData({
        code: '',
        initial_amount: 0,
        client_id: '',
        expiry_date: '',
        notes: ''
      })
      generateCode()

      onGiftCardCreated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la création de la carte cadeau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nouvelle Carte Cadeau</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créez une nouvelle carte cadeau pour vos clients
          </p>
        </div>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Informations de Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code" className="text-gray-700 dark:text-gray-300">
                  Code de la Carte Cadeau *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                    placeholder="GC-XXXX-XXXX"
                    required
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCode}
                    className="whitespace-nowrap"
                  >
                    Générer
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Code unique pour la carte cadeau</p>
              </div>
              <div>
                <Label htmlFor="initial_amount" className="text-gray-700 dark:text-gray-300">
                  Montant Initial (f) *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="initial_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.initial_amount || ''}
                    onChange={(e) => handleInputChange('initial_amount', parseFloat(e.target.value) || 0)}
                    placeholder="10000"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="client_id" className="text-gray-700 dark:text-gray-300">
                Client (optionnel)
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => handleInputChange('client_id', value)}
              >
                <SelectTrigger>
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

            <div>
              <Label htmlFor="expiry_date" className="text-gray-700 dark:text-gray-300">
                Date d&apos;Expiration (optionnel)
              </Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end">
          <AnimatedButton
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200"
          >
            {loading ? (
              <ButtonLoadingSpinner />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Créer la Carte Cadeau
              </>
            )}
          </AnimatedButton>
        </div>
      </form>
    </div>
  )
}

