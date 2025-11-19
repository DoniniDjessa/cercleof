'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface VoiceNavigationContextType {
  isEnabled: boolean
  isListening: boolean
  isAlwaysListening: boolean // New: true when ON mode (always listening), false when OFF mode (push-to-talk)
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  handlePOSCommand: (command: string) => Promise<boolean> // For POS-specific commands
}

const VoiceNavigationContext = createContext<VoiceNavigationContextType | undefined>(undefined)

// Complete navigation mapping based on sidebar menu
const navigationMap: Array<{ keywords: string[], path: string, label: string }> = [
  // Main pages
  { keywords: ['dashboard', 'accueil', 'tableau de bord', 'tableau'], path: '/', label: 'Tableau de bord' },
  
  // Clients section
  { keywords: ['clients', 'client'], path: '/admin/clients', label: 'Liste Clients' },
  { keywords: ['ajouter client', 'nouveau client', 'créer client'], path: '/admin/clients?action=create', label: 'Ajouter Client' },
  { keywords: ['détails client', 'détail client'], path: '/admin/clients/details', label: 'Détails Client' },
  
  // Products section
  { keywords: ['produits', 'produit'], path: '/admin/products', label: 'Liste Produits' },
  { keywords: ['ajouter produit', 'nouveau produit', 'créer produit'], path: '/admin/products?action=create', label: 'Ajouter Produit' },
  { keywords: ['détails produit', 'détail produit'], path: '/admin/products/details', label: 'Détails Produit' },
  { keywords: ['catégories produits', 'catégorie produit', 'catégories produit'], path: '/admin/categories?type=product', label: 'Catégories Produits' },
  { keywords: ['gestion des stocks', 'stock', 'stocks', 'gestion stock'], path: '/admin/stock', label: 'Gestion des Stocks' },
  
  // Services section
  { keywords: ['services', 'service'], path: '/admin/services', label: 'Liste Services' },
  { keywords: ['ajouter service', 'nouveau service', 'créer service'], path: '/admin/services?action=create', label: 'Ajouter Service' },
  { keywords: ['détails service', 'détail service'], path: '/admin/services/details', label: 'Détails Service' },
  { keywords: ['catégories services', 'catégorie service', 'catégories service'], path: '/admin/categories?type=service', label: 'Catégories Services' },
  
  // Users section
  { keywords: ['utilisateurs', 'utilisateur', 'users', 'user'], path: '/admin/users', label: 'Liste Utilisateurs' },
  { keywords: ['ajouter utilisateur', 'nouveau utilisateur', 'créer utilisateur'], path: '/admin/users?action=create', label: 'Ajouter Utilisateur' },
  
  // Sales & POS section
  { keywords: ['point de vente', 'pos', 'point vente'], path: '/admin/pos', label: 'Point de Vente' },
  { keywords: ['salon'], path: '/admin/salon', label: 'Salon' },
  { keywords: ['ventes', 'vente'], path: '/admin/sales', label: 'Liste Ventes' },
  { keywords: ['nouvelle vente', 'nouveau vente', 'créer vente'], path: '/admin/sales/create', label: 'Nouvelle Vente' },
  { keywords: ['détails vente', 'détail vente'], path: '/admin/sales/details', label: 'Détails Vente' },
  
  // Appointments section
  { keywords: ['rendez-vous', 'rdv', 'rendez vous', 'appointments'], path: '/admin/appointments', label: 'Liste RDV' },
  { keywords: ['nouveau rdv', 'nouveau rendez-vous', 'créer rdv', 'nouveau rendez vous'], path: '/admin/appointments/create', label: 'Nouveau RDV' },
  { keywords: ['calendrier', 'calendar'], path: '/admin/appointments/calendar', label: 'Calendrier' },
  
  // Deliveries section
  { keywords: ['livraisons', 'livraison', 'deliveries'], path: '/admin/deliveries', label: 'Liste Livraisons' },
  { keywords: ['nouvelle livraison', 'nouveau livraison', 'créer livraison'], path: '/admin/deliveries/create', label: 'Nouvelle Livraison' },
  { keywords: ['suivi livraisons', 'suivi livraison', 'tracking'], path: '/admin/deliveries/tracking', label: 'Suivi Livraisons' },
  
  // Finances section
  { keywords: ['revenus', 'revenu'], path: '/admin/revenues', label: 'Liste Revenus' },
  { keywords: ['nouveau revenu', 'nouveau revenue', 'créer revenu'], path: '/admin/revenues/create', label: 'Nouveau Revenu' },
  { keywords: ['dépenses', 'dépense', 'expenses'], path: '/admin/expenses', label: 'Liste Dépenses' },
  { keywords: ['nouvelle dépense', 'nouveau dépense', 'créer dépense'], path: '/admin/expenses/create', label: 'Nouvelle Dépense' },
  { keywords: ['promotions', 'promotion'], path: '/admin/promotions', label: 'Liste Promotions' },
  { keywords: ['nouvelle promotion', 'nouveau promotion', 'créer promotion'], path: '/admin/promotions/create', label: 'Nouvelle Promotion' },
  { keywords: ['fidélité', 'fidelite', 'loyalty'], path: '/admin/loyalty', label: 'Cartes Fidélité' },
  { keywords: ['points clients', 'points client', 'points'], path: '/admin/loyalty/points', label: 'Points Clients' },
  
  // Analytics & Reports section
  { keywords: ['analytics', 'analyse', 'analyses'], path: '/admin/analytics', label: 'Tableau de Bord Analytics' },
  { keywords: ['rapports', 'rapport', 'reports'], path: '/admin/reports/sales', label: 'Rapports' },
  { keywords: ['rapport ventes', 'rapport vente'], path: '/admin/reports/sales', label: 'Rapport Ventes' },
  { keywords: ['rapport clients', 'rapport client'], path: '/admin/reports/clients', label: 'Rapport Clients' },
  { keywords: ['rapport produits', 'rapport produit'], path: '/admin/reports/products', label: 'Rapport Produits' },
  { keywords: ['rapport financier', 'rapport finance'], path: '/admin/reports/financial', label: 'Rapport Financier' },
  { keywords: ['notifications', 'notification'], path: '/admin/notifications', label: 'Notifications' },
  { keywords: ['audit'], path: '/admin/audit', label: 'Audit' },
  { keywords: ['actions', 'action'], path: '/admin/actions', label: 'Actions' },
  
  // AI Assistant section
  { keywords: ['assistant ia', 'assistant ia gemini', 'assistant gemini', 'assistant ai'], path: '/admin/ai-assistant', label: 'Assistant Gemini' },
  { keywords: ['recommandation produit', 'recommandation', 'recommandation produit'], path: '/admin/ai-assistant?flow=recommendation', label: 'Recommandation Produit' },
  { keywords: ['analyse de peau', 'analyse peau', 'analyse de la peau'], path: '/admin/ai-assistant?flow=skin-analysis', label: 'Analyse de Peau' },
  { keywords: ['questions business', 'question business', 'business query'], path: '/admin/ai-assistant?flow=business-query', label: 'Questions Business' },
  { keywords: ['navigation vocale', 'voice nav'], path: '/admin/ai-assistant?flow=voice-nav', label: 'Navigation Vocale' },
  { keywords: ['paramètres ia', 'paramètres assistant', 'parametres ia', 'parametres assistant', 'settings ai'], path: '/admin/ai-assistant/settings', label: 'Paramètres Assistant IA' },
]

export function VoiceNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [isEnabled, setIsEnabled] = useState(false)
  const [isAlwaysListening, setIsAlwaysListening] = useState(false) // ON mode: always listening, OFF mode: push-to-talk
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const recognitionRef = useRef<any>(null)
  const isPOSPage = pathname === '/admin/pos'

  // Search for product by name and navigate to details
  const searchProductByName = useCallback(async (productName: string) => {
    try {
      const { data: products, error } = await supabase
        .from('dd-products')
        .select('id, name')
        .ilike('name', `%${productName}%`)
        .eq('is_active', true)
        .limit(5)

      if (error) throw error

      if (products && products.length > 0) {
        // Use the first match (most likely)
        const product = products[0]
        router.push(`/admin/products/${product.id}`)
        toast.success(`Navigation vers ${product.name}`)
        return true
      }
      return false
    } catch (error) {
      console.error('Error searching product:', error)
      return false
    }
  }, [router])

  // Search for client by name and navigate to details
  const searchClientByName = useCallback(async (clientName: string) => {
    try {
      const nameParts = clientName.trim().split(/\s+/)
      let query = supabase
        .from('dd-clients')
        .select('id, first_name, last_name')
        .eq('is_active', true)

      if (nameParts.length === 1) {
        // Single name - search in first_name or last_name
        query = query.or(`first_name.ilike.%${nameParts[0]}%,last_name.ilike.%${nameParts[0]}%`)
      } else {
        // Multiple words - try to match first and last name
        query = query
          .ilike('first_name', `%${nameParts[0]}%`)
          .ilike('last_name', `%${nameParts.slice(1).join(' ')}%`)
      }

      const { data: clients, error } = await query.limit(5)

      if (error) throw error

      if (clients && clients.length > 0) {
        const client = clients[0]
        router.push(`/admin/clients/${client.id}`)
        toast.success(`Navigation vers ${client.first_name} ${client.last_name}`)
        return true
      }
      return false
    } catch (error) {
      console.error('Error searching client:', error)
      return false
    }
  }, [router])

  // Handle POS-specific commands
  const handlePOSCommand = useCallback(async (command: string) => {
    if (!isPOSPage) return false

    const lowerCommand = command.toLowerCase().trim()

    // Check for "ajoute client [name]"
    if (lowerCommand.startsWith('ajoute client') || lowerCommand.startsWith('ajouter client')) {
      const clientName = lowerCommand.replace(/^(ajoute|ajouter)\s+client\s+/i, '').trim()
      if (clientName) {
        window.dispatchEvent(new CustomEvent('pos-select-client', { detail: { name: clientName } }))
        toast.success(`Recherche du client: ${clientName}`)
        return true
      }
    }

    // Check for "ajoute produit [name]"
    if (lowerCommand.startsWith('ajoute produit') || lowerCommand.startsWith('ajouter produit')) {
      const productName = lowerCommand.replace(/^(ajoute|ajouter)\s+produit\s+/i, '').trim()
      if (productName) {
        window.dispatchEvent(new CustomEvent('pos-add-product', { detail: { name: productName } }))
        toast.success(`Ajout du produit: ${productName}`)
        return true
      }
    }

    return false
  }, [isPOSPage])

  const handleVoiceCommand = useCallback(async (command: string) => {
    const lowerCommand = command.toLowerCase().trim()

    // Handle POS-specific commands first
    if (isPOSPage) {
      const handled = await handlePOSCommand(command)
      if (handled) return
    }

    // Check for "produit [name]" pattern
    if (lowerCommand.startsWith('produit ')) {
      const productName = lowerCommand.replace(/^produit\s+/i, '').trim()
      if (productName) {
        const found = await searchProductByName(productName)
        if (found) return
      }
    }

    // Check for "client [name]" pattern
    if (lowerCommand.startsWith('client ')) {
      const clientName = lowerCommand.replace(/^client\s+/i, '').trim()
      if (clientName) {
        const found = await searchClientByName(clientName)
        if (found) return
      }
    }

    // Find matching navigation item
    for (const item of navigationMap) {
      for (const keyword of item.keywords) {
        if (lowerCommand.includes(keyword)) {
          router.push(item.path)
          toast.success(`Navigation vers ${item.label}`)
          return
        }
      }
    }

    // If no exact match found, try fuzzy matching for common patterns
    if (lowerCommand.includes('ajouter') || lowerCommand.includes('nouveau') || lowerCommand.includes('créer')) {
      // Try to find what to add
      if (lowerCommand.includes('client')) {
        router.push('/admin/clients?action=create')
        toast.success('Navigation vers Ajouter Client')
        return
      } else if (lowerCommand.includes('produit')) {
        router.push('/admin/products?action=create')
        toast.success('Navigation vers Ajouter Produit')
        return
      } else if (lowerCommand.includes('service')) {
        router.push('/admin/services?action=create')
        toast.success('Navigation vers Ajouter Service')
        return
      } else if (lowerCommand.includes('vente')) {
        router.push('/admin/sales/create')
        toast.success('Navigation vers Nouvelle Vente')
        return
      } else if (lowerCommand.includes('rdv') || lowerCommand.includes('rendez-vous')) {
        router.push('/admin/appointments/create')
        toast.success('Navigation vers Nouveau RDV')
        return
      }
    }

    // Default: show detected command
    toast(`Commande détectée: "${command}" - Aucune correspondance trouvée`, {
      icon: '💡',
      duration: 3000,
    })
  }, [router, isPOSPage, handlePOSCommand, searchProductByName, searchClientByName])

  // Auto-restart recognition when always listening is enabled
  useEffect(() => {
    if (isAlwaysListening && recognition && !isListening && isEnabled) {
      try {
        recognition.start()
      } catch (error) {
        // Recognition might already be running, ignore
      }
    }
  }, [isAlwaysListening, isListening, isEnabled, recognition])

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if voice navigation is enabled
    const checkSettings = async () => {
      if (!user?.id) return

      try {
        const { data: userProfile } = await supabase
          .from('dd-users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (!userProfile) return

        const { data: settings } = await supabase
          .from('dd-ai-settings')
          .select('voice_navigation_enabled')
          .eq('user_id', userProfile.id)
          .single()

        if (settings) {
          setIsEnabled(settings.voice_navigation_enabled)
          setIsAlwaysListening(settings.voice_navigation_enabled) // ON mode = always listening
          localStorage.setItem('voiceNavigationEnabled', settings.voice_navigation_enabled.toString())
        }
      } catch (error) {
        console.error('Error checking voice navigation settings:', error)
      }
    }

    checkSettings()

    // Listen for setting changes
    const handleSettingChange = (event: CustomEvent) => {
      setIsEnabled(event.detail.enabled)
      setIsAlwaysListening(event.detail.enabled) // ON mode = always listening
    }

    window.addEventListener('voiceNavigationToggle', handleSettingChange as EventListener)

    // Initialize speech recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (SpeechRecognition && !recognitionRef.current) {
      const recognitionInstance = new SpeechRecognition()
      recognitionInstance.lang = 'fr-FR'
      recognitionInstance.interimResults = false

      recognitionInstance.onstart = () => {
        setIsListening(true)
      }

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript
        handleVoiceCommand(transcript)
        
        // If always listening, it will auto-restart
        if (!isAlwaysListening) {
          setIsListening(false)
        }
      }

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast.error('Erreur de reconnaissance vocale')
        }
        
        // If always listening and not aborted, try to restart
        if (isAlwaysListening && event.error !== 'aborted' && isEnabled) {
          setTimeout(() => {
            try {
              if (recognitionRef.current) {
                recognitionRef.current.continuous = true
                recognitionRef.current.start()
              }
            } catch (e) {
              // Ignore
            }
          }, 1000)
        } else {
          setIsListening(false)
        }
      }

      recognitionInstance.onend = () => {
        if (!isAlwaysListening || !isEnabled) {
          setIsListening(false)
        } else if (isEnabled && isAlwaysListening) {
          // Auto-restart if always listening
          setTimeout(() => {
            try {
              if (recognitionRef.current) {
                recognitionRef.current.continuous = true
                recognitionRef.current.start()
              }
            } catch (e) {
              // Ignore - might already be starting
            }
          }, 100)
        }
      }

      recognitionRef.current = recognitionInstance
      setRecognition(recognitionInstance)

      // Start recognition if always listening is enabled
      if (isAlwaysListening && isEnabled) {
        recognitionInstance.continuous = true
        try {
          recognitionInstance.start()
        } catch (e) {
          // Ignore - might already be starting
        }
      }
    } else if (recognitionRef.current && isAlwaysListening && isEnabled && !isListening) {
      // Update continuous mode and start if needed
      recognitionRef.current.continuous = true
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Ignore
      }
    } else if (recognitionRef.current && !isAlwaysListening && isListening) {
      // Stop if always listening is disabled
      recognitionRef.current.continuous = false
      try {
        recognitionRef.current.stop()
      } catch (e) {
        // Ignore
      }
    }

    // Check localStorage on mount
    const stored = localStorage.getItem('voiceNavigationEnabled')
    if (stored === 'true') {
      setIsEnabled(true)
      setIsAlwaysListening(true)
    }

    return () => {
      window.removeEventListener('voiceNavigationToggle', handleSettingChange as EventListener)
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [user, router, handleVoiceCommand, isAlwaysListening, isEnabled])

  const startListening = () => {
    if (!isEnabled) {
      toast.error('La navigation vocale n\'est pas activée dans les paramètres')
      return
    }

    if (recognition && !isListening) {
      try {
        recognition.start()
      } catch (error) {
        console.error('Error starting recognition:', error)
        toast.error('Erreur lors du démarrage de la reconnaissance vocale')
      }
    } else if (!recognition) {
      toast.error('La reconnaissance vocale n\'est pas supportée par votre navigateur')
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <VoiceNavigationContext.Provider
      value={{
        isEnabled,
        isListening,
        isAlwaysListening,
        startListening,
        stopListening,
        toggleListening,
        handlePOSCommand,
      }}
    >
      {children}
    </VoiceNavigationContext.Provider>
  )
}

export function useVoiceNavigation() {
  const context = useContext(VoiceNavigationContext)
  if (context === undefined) {
    throw new Error('useVoiceNavigation must be used within a VoiceNavigationProvider')
  }
  return context
}
