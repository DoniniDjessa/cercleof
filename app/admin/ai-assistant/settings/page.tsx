'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AISettings {
  id?: string
  user_id: string
  voice_navigation_enabled: boolean
  product_recommendation_enabled: boolean
  skin_analysis_enabled: boolean
  business_query_enabled: boolean
  business_query_vocal_response_enabled: boolean
  created_at?: string
  updated_at?: string
}

export default function AISettingsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AISettings>({
    user_id: '',
    voice_navigation_enabled: false,
    product_recommendation_enabled: true,
    skin_analysis_enabled: true,
    business_query_enabled: true,
    business_query_vocal_response_enabled: false,
  })

  useEffect(() => {
    if (user?.id) {
      fetchSettings()
    }
  }, [user])

  const fetchSettings = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // Get user profile to find dd-users id
      const { data: userProfile } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) {
        console.error('User profile not found')
        setLoading(false)
        return
      }

      // Fetch or create settings
      const { data: existingSettings, error: fetchError } = await supabase
        .from('dd-ai-settings')
        .select('*')
        .eq('user_id', userProfile.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existingSettings) {
        setSettings(existingSettings)
      } else {
        // Create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('dd-ai-settings')
          .insert({
            user_id: userProfile.id,
            voice_navigation_enabled: false,
            product_recommendation_enabled: true,
            skin_analysis_enabled: true,
            business_query_enabled: true,
            business_query_vocal_response_enabled: false,
          })
          .select()
          .single()

        if (createError) throw createError
        if (newSettings) setSettings(newSettings)
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error)
      toast.error('Erreur lors du chargement des paramètres')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (field: keyof Omit<AISettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>, value: boolean) => {
    if (!user?.id || saving) return

    try {
      setSaving(true)

      // Get user profile
      const { data: userProfile } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (!userProfile) {
        throw new Error('User profile not found')
      }

      const updatedSettings = { ...settings, [field]: value, user_id: userProfile.id }

      const { error } = await supabase
        .from('dd-ai-settings')
        .upsert(updatedSettings, {
          onConflict: 'user_id',
        })

      if (error) throw error

      setSettings(updatedSettings)
      
      // Update localStorage for voice navigation (for immediate effect)
      if (field === 'voice_navigation_enabled') {
        localStorage.setItem('voiceNavigationEnabled', value.toString())
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('voiceNavigationToggle', { detail: { enabled: value } }))
      }

      toast.success('Paramètres mis à jour avec succès')
    } catch (error: any) {
      console.error('Error updating setting:', error)
      toast.error('Erreur lors de la mise à jour des paramètres')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-600" />
          Paramètres Assistant IA
        </h1>
        <p className="text-muted-foreground dark:text-gray-400 mt-2">
          Activez ou désactivez les fonctionnalités de l'assistant IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flows de l'Assistant IA</CardTitle>
          <CardDescription>
            Configurez quels flows de l'assistant IA sont disponibles pour vous
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Navigation */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="voice-nav" className="text-base font-medium">
                Navigation Vocale
              </Label>
              <p className="text-sm text-muted-foreground">
                OFF: Mode push-to-talk (maintenez le bouton pour parler). ON: Mode toujours actif (vous pouvez parler à tout moment sans cliquer).
              </p>
            </div>
            <Switch
              id="voice-nav"
              checked={settings.voice_navigation_enabled}
              onCheckedChange={(checked) => updateSetting('voice_navigation_enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* Product Recommendation */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="product-rec" className="text-base font-medium">
                Recommandation de Produit
              </Label>
              <p className="text-sm text-muted-foreground">
                Activez le flow de recommandation de produits basé sur les descriptions textuelles
              </p>
            </div>
            <Switch
              id="product-rec"
              checked={settings.product_recommendation_enabled}
              onCheckedChange={(checked) => updateSetting('product_recommendation_enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* Skin Analysis */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="skin-analysis" className="text-base font-medium">
                Analyse de Peau
              </Label>
              <p className="text-sm text-muted-foreground">
                Activez le flow d'analyse de peau par analyse d'image avec Gemini
              </p>
            </div>
            <Switch
              id="skin-analysis"
              checked={settings.skin_analysis_enabled}
              onCheckedChange={(checked) => updateSetting('skin_analysis_enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* Business Query */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="business-query" className="text-base font-medium">
                Questions Business
              </Label>
              <p className="text-sm text-muted-foreground">
                Activez le flow de questions business pour interroger les données de l'application
              </p>
            </div>
            <Switch
              id="business-query"
              checked={settings.business_query_enabled}
              onCheckedChange={(checked) => updateSetting('business_query_enabled', checked)}
              disabled={saving}
            />
          </div>

          {/* Business Query Vocal Response */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="business-query-vocal" className="text-base font-medium">
                Réponse Vocale Questions Business
              </Label>
              <p className="text-sm text-muted-foreground">
                Activez les réponses vocales pour les questions business. L'IA lira sa réponse à voix haute.
              </p>
            </div>
            <Switch
              id="business-query-vocal"
              checked={settings.business_query_vocal_response_enabled}
              onCheckedChange={(checked) => updateSetting('business_query_vocal_response_enabled', checked)}
              disabled={saving || !settings.business_query_enabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="text-sm">Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Les paramètres sont sauvegardés automatiquement. La navigation vocale prend effet immédiatement après activation.
            Pour utiliser la navigation vocale, cliquez sur le bouton microphone qui apparaîtra dans le coin de l'écran.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

