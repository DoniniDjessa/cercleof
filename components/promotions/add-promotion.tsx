"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AnimatedButton } from '@/components/ui/animated-button'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  Percent, 
  Calendar, 
  Tag, 
  Users, 
  Package, 
  Scissors,
  DollarSign,
  Save,
  X
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Promotion {
  name: string
  code: string  // Promotion code that employees can enter
  description: string
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping'
  value: number
  min_purchase_amount?: number
  max_discount_amount?: number
  start_date: string
  end_date: string
  is_active: boolean
  applicable_to: 'all' | 'products' | 'services' | 'specific_items'
  applicable_items?: string[]
  customer_segments?: string[]
  usage_limit?: number  // Maximum number of times the code can be used (0 = unlimited)
  usage_count: number
  is_unique_usage?: boolean  // If true, code can only be used once per client
  conditions?: string
}

interface AddPromotionProps {
  onPromotionCreated?: () => void
  onCancel?: () => void
}

export function AddPromotion({ onPromotionCreated, onCancel }: AddPromotionProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Promotion>({
    name: '',
    code: '',  // Promotion code
    description: '',
    type: 'percentage',
    value: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
    start_date: '',
    end_date: '',
    is_active: true,
    applicable_to: 'all',
    applicable_items: [],
    customer_segments: [],
    usage_limit: 0,
    usage_count: 0,
    is_unique_usage: false,
    conditions: ''
  })

  const [products, setProducts] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])

  useEffect(() => {
    fetchProductsAndServices()
  }, [])

  const fetchProductsAndServices = async () => {
    try {
      const [productsResult, servicesResult] = await Promise.all([
        supabase.from('dd-products').select('id, name, price').eq('is_active', true),
        supabase.from('dd-services').select('id, name, price').eq('is_active', true)
      ])

      if (productsResult.data) setProducts(productsResult.data)
      if (servicesResult.data) setServices(servicesResult.data)
    } catch (error) {
      console.error('Error fetching products and services:', error)
    }
  }

  const handleInputChange = (field: keyof Promotion, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCheckboxChange = (field: keyof Promotion, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.code || !formData.start_date || !formData.end_date) {
      toast.error('Veuillez remplir tous les champs obligatoires (nom, code, dates)')
      return
    }

    // Validate code format (alphanumeric, uppercase, 3-20 characters)
    if (!/^[A-Z0-9]{3,20}$/.test(formData.code.toUpperCase())) {
      toast.error('Le code promotionnel doit contenir 3 à 20 caractères alphanumériques (lettres majuscules et chiffres)')
      return
    }

    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('La date de fin doit être postérieure à la date de début')
      return
    }

    try {
      setLoading(true)

      const promotionData = {
        name: formData.name,
        code: formData.code.toUpperCase(),  // Store code in uppercase
        description: formData.description,
        type: formData.type,
        value: formData.value,
        min_purchase_amount: formData.min_purchase_amount || null,
        max_discount_amount: formData.max_discount_amount || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
        applicable_to: formData.applicable_to,
        applicable_items: formData.applicable_items || [],
        customer_segments: formData.customer_segments || [],
        usage_limit: formData.usage_limit || null,
        usage_count: 0,
        is_unique_usage: formData.is_unique_usage || false,
        conditions: formData.conditions || null
      }

      const { error } = await supabase
        .from('dd-promotions')
        .insert([promotionData])

      if (error) {
        console.error('Error creating promotion:', error)
        toast.error('Erreur lors de la création de la promotion')
        return
      }

      toast.success('Promotion créée avec succès!')
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'percentage',
        value: 0,
        min_purchase_amount: 0,
        max_discount_amount: 0,
        start_date: '',
        end_date: '',
        is_active: true,
        applicable_to: 'all',
        applicable_items: [],
        customer_segments: [],
        usage_limit: 0,
        usage_count: 0,
        is_unique_usage: false,
        conditions: ''
      })

      onPromotionCreated?.()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la création de la promotion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nouvelle Promotion</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créez une nouvelle promotion pour attirer et fidéliser vos clients
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
              <Tag className="h-5 w-5" />
              Informations de Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nom de la Promotion *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Réduction Été 2024"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Code Promotionnel * (ex: SUMMER24)
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="Ex: SUMMER24"
                  maxLength={20}
                  required
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">3-20 caractères alphanumériques (majuscules et chiffres)</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type de Promotion *
                </label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage de réduction</SelectItem>
                    <SelectItem value="fixed_amount">Montant fixe</SelectItem>
                    <SelectItem value="buy_x_get_y">Achetez X, obtenez Y</SelectItem>
                    <SelectItem value="free_shipping">Livraison gratuite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez les détails de cette promotion..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valeur de la Promotion *
                </label>
                <div className="relative">
                  {formData.type === 'percentage' ? (
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  )}
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                    placeholder={formData.type === 'percentage' ? '10' : '5000'}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.type === 'percentage' ? 'Pourcentage de réduction (ex: 10 pour 10%)' : 'Montant en XOF'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Montant Minimum d'Achat
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="number"
                    value={formData.min_purchase_amount || ''}
                    onChange={(e) => handleInputChange('min_purchase_amount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dates and Validity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Période de Validité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de Début *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date de Fin *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleCheckboxChange('is_active', checked as boolean)}
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Promotion active
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Applicability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Applicabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Applicable à
              </label>
              <Select value={formData.applicable_to} onValueChange={(value) => handleInputChange('applicable_to', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits et services</SelectItem>
                  <SelectItem value="products">Produits uniquement</SelectItem>
                  <SelectItem value="services">Services uniquement</SelectItem>
                  <SelectItem value="specific_items">Articles spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.applicable_to === 'specific_items' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Articles Spécifiques
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Produits</h4>
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2 mb-1">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={formData.applicable_items?.includes(product.id) || false}
                          onCheckedChange={(checked) => {
                            const items = formData.applicable_items || []
                            if (checked) {
                              handleInputChange('applicable_items', [...items, product.id])
                            } else {
                              handleInputChange('applicable_items', items.filter(id => id !== product.id))
                            }
                          }}
                        />
                        <label htmlFor={`product-${product.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                          {product.name} - {product.price} XOF
                        </label>
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Services</h4>
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center space-x-2 mb-1">
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={formData.applicable_items?.includes(service.id) || false}
                          onCheckedChange={(checked) => {
                            const items = formData.applicable_items || []
                            if (checked) {
                              handleInputChange('applicable_items', [...items, service.id])
                            } else {
                              handleInputChange('applicable_items', items.filter(id => id !== service.id))
                            }
                          }}
                        />
                        <label htmlFor={`service-${service.id}`} className="text-sm text-gray-700 dark:text-gray-300">
                          {service.name} - {service.price} XOF
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Limites d'Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Limite d'Utilisation Globale
                </label>
                <Input
                  type="number"
                  value={formData.usage_limit || ''}
                  onChange={(e) => handleInputChange('usage_limit', parseInt(e.target.value) || 0)}
                  placeholder="0 = illimité"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nombre maximum d'utilisations de cette promotion (0 = illimité)
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="is_unique_usage"
                  checked={formData.is_unique_usage || false}
                  onCheckedChange={(checked) => handleCheckboxChange('is_unique_usage', checked as boolean)}
                />
                <label htmlFor="is_unique_usage" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Usage unique par client
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Conditions Spéciales
              </label>
              <Textarea
                value={formData.conditions || ''}
                onChange={(e) => handleInputChange('conditions', e.target.value)}
                placeholder="Ex: Non cumulable avec d'autres promotions, valable uniquement en magasin..."
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
            className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200"
          >
            {loading ? (
              <ButtonLoadingSpinner />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Créer la Promotion
              </>
            )}
          </AnimatedButton>
        </div>
      </form>
    </div>
  )
}
