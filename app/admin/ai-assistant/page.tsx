'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MessageSquare, Camera, BarChart, Mic, Loader2, Send, Image as ImageIcon, Copy, AlertTriangle, TrendingUp, GitCompare, Brain, Zap, UserSearch, DollarSign, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useVoiceNavigation } from '@/contexts/VoiceNavigationContext'
import toast from 'react-hot-toast'

type FlowType = 'recommendation' | 'skin-analysis' | 'business-query' | 'voice-nav' | 'duplicate-check' | 'price-recommendation' | 'client-profile' | 'performance-prediction' | 'performance-comparison' | 'smart-alerts' | 'strategic-decision' | 'what-if' | 'admin-analytics' | null

interface Product {
  id: string
  name: string
  description?: string
  price: number
  images?: string[]
  category?: { name: string }
}

interface SkinAnalysisResult {
  secheresse_score: number
  rougeurs_score: number
  eclat_score: number
  interpretation_texte: string
}

export default function AIAssistantPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const [currentFlow, setCurrentFlow] = useState<FlowType>(null)
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [roleChecked, setRoleChecked] = useState(false)

  // Flow 1: Product Recommendation
  const [recommendationQuery, setRecommendationQuery] = useState('')
  const [recommendedProduct, setRecommendedProduct] = useState<Product | null>(null)
  const [recommendationResponse, setRecommendationResponse] = useState('')

  // Flow 2: Skin Analysis
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [skinAnalysisResult, setSkinAnalysisResult] = useState<SkinAnalysisResult | null>(null)
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([])

  // Flow 3: Business Query
  const [businessQuery, setBusinessQuery] = useState('')
  const businessQueryRef = useRef('')
  const [businessResponse, setBusinessResponse] = useState('')
  const [isListeningBusiness, setIsListeningBusiness] = useState(false)
  const [businessRecognition, setBusinessRecognition] = useState<any>(null)

  // Flow: Duplicate Check
  const [duplicateCheckProduct, setDuplicateCheckProduct] = useState<{name: string, description: string, brand: string, price: number} | null>(null)
  const [duplicateResults, setDuplicateResults] = useState<any>(null)

  // Flow: Price Recommendation
  const [priceRecProduct, setPriceRecProduct] = useState<{name: string, description: string, brand: string, category_id?: string, cost: number, price: number} | null>(null)
  const [priceRecResult, setPriceRecResult] = useState<any>(null)

  // Flow: Client Profile
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clientProfileResult, setClientProfileResult] = useState<any>(null)

  // Flow: Performance Prediction (Admin)
  const [predictionPeriod, setPredictionPeriod] = useState<string>('week')
  const [predictionResult, setPredictionResult] = useState<any>(null)

  // Flow: Performance Comparison (Admin)
  const [comparisonType, setComparisonType] = useState<string>('period')
  const [comparisonPeriod1, setComparisonPeriod1] = useState<{start: string, end: string}>({start: '', end: ''})
  const [comparisonPeriod2, setComparisonPeriod2] = useState<{start: string, end: string}>({start: '', end: ''})
  const [comparisonResult, setComparisonResult] = useState<any>(null)

  // Flow: Smart Alerts (Admin)
  const [alertsResult, setAlertsResult] = useState<any>(null)

  // Flow: Strategic Decision (Admin)
  const [strategicQuestion, setStrategicQuestion] = useState('')
  const [strategicResult, setStrategicResult] = useState<any>(null)

  // Flow: What-If Scenarios (Admin)
  const [whatIfScenario, setWhatIfScenario] = useState('')
  const [whatIfResult, setWhatIfResult] = useState<any>(null)

  // Keep ref in sync with state
  useEffect(() => {
    businessQueryRef.current = businessQuery
  }, [businessQuery])

  // Flow 4: Voice Navigation
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')

  // Flow 3: Business Query - additional state
  const [vocalResponseEnabled, setVocalResponseEnabled] = useState(false)

  // Flow 4: Voice Navigation - additional state
  const [recognition, setRecognition] = useState<{
    start: () => void
    stop: () => void
    lang: string
    continuous: boolean
    interimResults: boolean
    onstart: (() => void) | null
    onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null
    onerror: ((event: { error: string }) => void) | null
    onend: (() => void) | null
  } | null>(null)

  const fetchUserRole = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single()

      if (!error && data) {
        setUserRole(data.role || '')
        setRoleChecked(true)
        // Redirect non-admins immediately
        if (!['admin', 'superadmin', 'manager'].includes((data.role || '').toLowerCase())) {
          router.push('/admin/pos')
        }
      } else {
        setRoleChecked(true)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
      setRoleChecked(true)
    }
  }, [user?.id, router])

  useEffect(() => {
    const flow = searchParams.get('flow') as FlowType
    if (flow) {
      setCurrentFlow(flow)
    }
    fetchUserRole()
  }, [searchParams, user, fetchUserRole])

  // Helper to check if user can access admin-only features
  const isAdmin = ['admin', 'superadmin', 'manager'].includes(userRole.toLowerCase())
  const canAccessStaffFeatures = ['admin', 'superadmin', 'manager', 'receptionniste', 'caissiere'].includes(userRole.toLowerCase())
  
  // Check access for specific flows - allow all users for some features
  const canAccessFlow = (flow: FlowType): boolean => {
    if (!flow) return true
    // All users can access these
    if (['recommendation', 'skin-analysis', 'voice-nav', 'duplicate-check', 'price-recommendation'].includes(flow)) {
      return true
    }
    // Staff features (receptionniste, caissiere, admins)
    if (['client-profile'].includes(flow)) {
      return canAccessStaffFeatures
    }
    // Admin only features
    if (['business-query', 'performance-prediction', 'performance-comparison', 'smart-alerts', 'strategic-decision', 'what-if'].includes(flow)) {
      return isAdmin
    }
    return true
  }

  // Flow 1: Product Recommendation
  const handleProductRecommendation = async () => {
    if (!recommendationQuery.trim()) {
      toast.error('Veuillez entrer une demande')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/product-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: recommendationQuery, userRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la recommandation')
      }

      setRecommendationResponse(data.response)
      if (data.product) {
        setRecommendedProduct(data.product)
      }
      toast.success('Recommandation générée avec succès!')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Erreur lors de la recommandation')
    } finally {
      setLoading(false)
    }
  }

  // Flow 2: Skin Analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setSelectedImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSkinAnalysis = async () => {
    if (!selectedImage) {
      toast.error('Veuillez sélectionner une image')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/skin-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selectedImage, userRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse')
      }

      setSkinAnalysisResult(data.analysis)
      setRecommendedProducts(data.recommendedProducts || [])
      toast.success('Analyse terminée avec succès!')
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Fetch vocal response setting
    const fetchVocalResponseSetting = async () => {
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
          .select('business_query_vocal_response_enabled')
          .eq('user_id', userProfile.id)
          .single()

        if (settings) {
          setVocalResponseEnabled(settings.business_query_vocal_response_enabled || false)
        }
      } catch (error) {
        console.error('Error fetching vocal response setting:', error)
      }
    }

    fetchVocalResponseSetting()

    // Listen for setting changes
    const handleSettingChange = () => {
      fetchVocalResponseSetting()
    }

    window.addEventListener('focus', handleSettingChange)

    return () => {
      window.removeEventListener('focus', handleSettingChange)
    }
  }, [user])

  const speakText = useCallback((text: string, force: boolean = false) => {
    if ((!vocalResponseEnabled && !force) || !('speechSynthesis' in window)) return

    // Stop any ongoing speech
    window.speechSynthesis.cancel()

    // Remove asterisks (*) from text before speaking
    const cleanedText = text.replace(/\*/g, '')

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText)
    utterance.lang = 'fr-FR'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to find a French voice (load voices if needed)
    const getVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        // Voices might not be loaded yet
        window.speechSynthesis.onvoiceschanged = () => {
          const loadedVoices = window.speechSynthesis.getVoices()
          const frenchVoice = loadedVoices.find(voice => 
            voice.lang.startsWith('fr') || voice.lang.includes('FR')
          )
          if (frenchVoice) {
            utterance.voice = frenchVoice
          }
          window.speechSynthesis.speak(utterance)
        }
        return
      }
      const frenchVoice = voices.find(voice => 
        voice.lang.startsWith('fr') || voice.lang.includes('FR')
      )
      if (frenchVoice) {
        utterance.voice = frenchVoice
      }
      window.speechSynthesis.speak(utterance)
    }

    getVoices()
  }, [vocalResponseEnabled])

  const handleBusinessQuery = useCallback(async (queryToProcess?: string) => {
    // Use ref to get latest businessQuery without making it a dependency
    const query = queryToProcess || businessQueryRef.current

    if (!query || !query.trim()) {
      toast.error('Veuillez entrer une question')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/ai/business-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la requête')
      }

      setBusinessResponse(data.response)
      // Always update the input field with the query used
      setBusinessQuery(query)
      toast.success('Réponse générée avec succès!')
      
      // Speak the response if vocal response is enabled or if called from voice (force = true)
      if (data.response) {
        speakText(data.response, !!queryToProcess) // Force vocal if from voice command
      }
    } catch (error: any) {
      console.error('Error:', error)
      toast.error(error.message || 'Erreur lors de la requête')
    } finally {
      setLoading(false)
    }
  }, [userRole, vocalResponseEnabled, speakText]) // businessQuery removed to prevent infinite loop // Remove businessQuery from dependencies

  // Voice recognition for business queries (when on business-query tab)
  useEffect(() => {
    if (typeof window === 'undefined' || currentFlow !== 'business-query') {
      // Stop recognition if not on business-query tab
      if (businessRecognition) {
        try {
          businessRecognition.stop()
        } catch (e) {
          // Ignore
        }
      }
      setIsListeningBusiness(false)
      return
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) return

    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.lang = 'fr-FR'
    recognitionInstance.continuous = true // Always listening when on business-query tab
    recognitionInstance.interimResults = false

    recognitionInstance.onstart = () => {
      setIsListeningBusiness(true)
    }

    recognitionInstance.onresult = async (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      
      if (!transcript) return

      const lowerTranscript = transcript.toLowerCase()
      
      // Navigation map for "page..." and "ajouter..." commands
      const navigationMap: Array<{ keywords: string[], path: string, label: string }> = [
        { keywords: ['page produits', 'page produit'], path: '/admin/products', label: 'Liste Produits' },
        { keywords: ['page clients', 'page client'], path: '/admin/clients', label: 'Liste Clients' },
        { keywords: ['page services', 'page service'], path: '/admin/services', label: 'Liste Services' },
        { keywords: ['page ventes', 'page vente'], path: '/admin/sales', label: 'Liste Ventes' },
        { keywords: ['page utilisateurs', 'page utilisateur', 'page users', 'page user'], path: '/admin/users', label: 'Liste Utilisateurs' },
        { keywords: ['page pos', 'page point de vente', 'page point vente'], path: '/admin/pos', label: 'Point de Vente' },
        { keywords: ['page rendez-vous', 'page rdv', 'page rendez vous'], path: '/admin/appointments', label: 'Liste RDV' },
        { keywords: ['page stock', 'page stocks'], path: '/admin/stock', label: 'Gestion des Stocks' },
        { keywords: ['ajouter produit', 'ajouter un produit'], path: '/admin/products?action=create', label: 'Ajouter Produit' },
        { keywords: ['ajouter client', 'ajouter un client'], path: '/admin/clients?action=create', label: 'Ajouter Client' },
        { keywords: ['ajouter service', 'ajouter un service'], path: '/admin/services?action=create', label: 'Ajouter Service' },
        { keywords: ['ajouter utilisateur', 'ajouter un utilisateur'], path: '/admin/users?action=create', label: 'Ajouter Utilisateur' },
        { keywords: ['ajouter vente', 'ajouter une vente'], path: '/admin/sales/create', label: 'Nouvelle Vente' },
        { keywords: ['ajouter rdv', 'ajouter un rdv', 'ajouter rendez-vous', 'ajouter un rendez-vous'], path: '/admin/appointments/create', label: 'Nouveau RDV' },
      ]

      // Check for navigation commands first ("page..." or "ajouter...")
      for (const item of navigationMap) {
        for (const keyword of item.keywords) {
          if (lowerTranscript.includes(keyword)) {
            router.push(item.path)
            toast.success(`Navigation vers ${item.label}`)
            return
          }
        }
      }
      
      // Check if it starts with "mon assistant" or try to detect business query
      let query = transcript
      let isBusinessQuery = false

      if (lowerTranscript.startsWith('mon assistant')) {
        query = transcript.replace(/^mon assistant\s*,?\s*/i, '').trim()
        isBusinessQuery = true
      } else if (
        // Try to detect business queries without "mon assistant"
        lowerTranscript.includes('vendu') ||
        lowerTranscript.includes('vente') ||
        lowerTranscript.includes('client') ||
        lowerTranscript.includes('produit') ||
        lowerTranscript.includes('combien') ||
        lowerTranscript.includes('dépensé') ||
        lowerTranscript.includes('depense') ||
        lowerTranscript.includes('revenu') ||
        lowerTranscript.includes('rendez-vous') ||
        lowerTranscript.includes('rdv') ||
        lowerTranscript.includes('meilleur') ||
        lowerTranscript.includes('stock') ||
        lowerTranscript.includes('question') ||
        lowerTranscript.includes('?') ||
        lowerTranscript.includes('quel') ||
        lowerTranscript.includes('quelle') ||
        lowerTranscript.includes('quand') ||
        lowerTranscript.includes('qui') ||
        lowerTranscript.includes('où') ||
        lowerTranscript.includes('ou') ||
        lowerTranscript.includes('comment')
      ) {
        // Looks like a business query
        isBusinessQuery = true
        query = transcript
      }

      if (isBusinessQuery && query) {
        await handleBusinessQuery(query)
      } else {
        // If not detected as business query, show a hint
        toast('Pour poser une question business, commencez par "Mon assistant..." ou posez une question', {
          icon: '💡',
          duration: 3000,
        })
      }
    }

    recognitionInstance.onerror = (event: any) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('Speech recognition error:', event.error)
        // Don't show error toast for continuous recognition to avoid spam
      }
    }

    recognitionInstance.onend = () => {
      // Auto-restart if still on business-query tab
      if (currentFlow === 'business-query') {
        setTimeout(() => {
          try {
            recognitionInstance.start()
          } catch (e) {
            // Ignore - might already be starting
            setIsListeningBusiness(false)
          }
        }, 100)
      } else {
        setIsListeningBusiness(false)
      }
    }

    setBusinessRecognition(recognitionInstance)

    // Start recognition when on business-query tab
    if (currentFlow === 'business-query') {
      try {
        recognitionInstance.start()
      } catch (e) {
        // Ignore - might already be starting
      }
    }

    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop()
        } catch (e) {
          // Ignore
        }
      }
      setIsListeningBusiness(false)
    }
  }, [currentFlow, userRole, handleBusinessQuery]) // Include handleBusinessQuery

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.lang = 'fr-FR'
        recognitionInstance.continuous = false
        recognitionInstance.interimResults = false

        recognitionInstance.onstart = () => {
          setIsListening(true)
          toast.success('Écoute en cours...')
        }

        recognitionInstance.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setVoiceTranscript(transcript)
          handleVoiceCommand(transcript)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          toast.error('Erreur de reconnaissance vocale')
          setIsListening(false)
        }

        recognitionInstance.onend = () => {
          setIsListening(false)
        }

        setRecognition(recognitionInstance)
      }
    }
  }, [])

  const startVoiceNavigation = () => {
    if (recognition) {
      recognition.start()
    } else {
      toast.error('La reconnaissance vocale n\'est pas supportée par votre navigateur')
    }
  }

  const handleVoiceCommand = async (command: string) => {
    // Parse voice command and navigate or execute actions
    const lowerCommand = command.toLowerCase()

    // Navigation commands
    if (lowerCommand.includes('dashboard') || lowerCommand.includes('accueil') || lowerCommand.includes('tableau de bord')) {
      router.push('/')
      toast.success('Navigation vers le tableau de bord')
    } else if (lowerCommand.includes('produits') || lowerCommand.includes('produit')) {
      router.push('/admin/products')
      toast.success('Navigation vers les produits')
    } else if (lowerCommand.includes('clients') || lowerCommand.includes('client')) {
      router.push('/admin/clients')
      toast.success('Navigation vers les clients')
    } else if (lowerCommand.includes('ventes') || lowerCommand.includes('vente')) {
      router.push('/admin/sales')
      toast.success('Navigation vers les ventes')
    } else if (lowerCommand.includes('point de vente') || lowerCommand.includes('pos')) {
      router.push('/admin/pos')
      toast.success('Navigation vers le point de vente')
    } else if (lowerCommand.includes('services')) {
      router.push('/admin/services')
      toast.success('Navigation vers les services')
    } else if (lowerCommand.includes('salon')) {
      router.push('/admin/salon')
      toast.success('Navigation vers le salon')
    } else if (lowerCommand.includes('rendez-vous') || lowerCommand.includes('rdv')) {
      router.push('/admin/appointments')
      toast.success('Navigation vers les rendez-vous')
    } else {
      // For complex commands, use business query API
      setBusinessQuery(command)
      await handleBusinessQuery()
    }
  }

  const handleClientProfileAnalysis = async () => {
    if (!selectedClientId) {
      toast.error('Veuillez entrer un ID client')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/ai/client-profile-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClientId, userRole })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Erreur')
      setClientProfileResult(data.data)
      toast.success('Analyse terminée!')
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'analyse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-blue-600" />
          Assistant IA Gemini
        </h1>
        <p className="text-muted-foreground dark:text-gray-400 mt-2">
          Utilisez l'intelligence artificielle pour améliorer votre workflow
        </p>
      </div>

      <Tabs value={currentFlow || 'recommendation'} onValueChange={(value) => {
        setCurrentFlow(value as FlowType)
        router.push(`/admin/ai-assistant?flow=${value}`)
      }}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendation" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Recommandation
          </TabsTrigger>
          <TabsTrigger value="skin-analysis" className="flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Analyse Peau
          </TabsTrigger>
          <TabsTrigger value="business-query" className="flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Questions Business
          </TabsTrigger>
          <TabsTrigger value="voice-nav" className="flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Navigation Vocale
          </TabsTrigger>
        </TabsList>

        {/* Flow 1: Product Recommendation */}
        <TabsContent value="recommendation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommandation de Produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Je veux un produit gommant pour peau difficile de teint clair, pas agressive"
                  value={recommendationQuery}
                  onChange={(e) => setRecommendationQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleProductRecommendation()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleProductRecommendation} 
                  disabled={loading || !recommendationQuery.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              {recommendationResponse && (
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="pt-6">
                    <p className="whitespace-pre-wrap">{recommendationResponse}</p>
                  </CardContent>
                </Card>
              )}

              {recommendedProduct && (
                <Card>
                  <CardHeader>
                    <CardTitle>Produit Recommandé</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      {recommendedProduct.images && recommendedProduct.images.length > 0 && (
                        <img
                          src={recommendedProduct.images[0]}
                          alt={recommendedProduct.name}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{recommendedProduct.name}</h3>
                        <p className="text-sm text-muted-foreground">{recommendedProduct.description}</p>
                        {recommendedProduct.category && (
                          <Badge className="mt-2">{recommendedProduct.category.name}</Badge>
                        )}
                        <p className="text-lg font-bold mt-2">{recommendedProduct.price.toFixed(0)}f</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow 2: Skin Analysis */}
        <TabsContent value="skin-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de Peau</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                {selectedImage ? (
                  <div className="space-y-4">
                    <img
                      src={selectedImage}
                      alt="Preview"
                      className="max-w-full max-h-64 mx-auto rounded-lg"
                    />
                    <Button variant="outline" onClick={() => setSelectedImage(null)}>
                      Changer l'image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="skin-image-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('skin-image-upload')?.click()}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Prendre une photo ou télécharger
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedImage && (
                <Button
                  onClick={handleSkinAnalysis}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    'Analyser la peau'
                  )}
                </Button>
              )}

              {skinAnalysisResult && (
                <Card className="bg-purple-50 dark:bg-purple-900/20">
                  <CardHeader>
                    <CardTitle>Résultats de l'Analyse</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Sécheresse</p>
                        <p className="text-2xl font-bold">{skinAnalysisResult.secheresse_score}/10</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rougeurs</p>
                        <p className="text-2xl font-bold">{skinAnalysisResult.rougeurs_score}/10</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Éclat</p>
                        <p className="text-2xl font-bold">{skinAnalysisResult.eclat_score}/10</p>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap">{skinAnalysisResult.interpretation_texte}</p>
                  </CardContent>
                </Card>
              )}

              {recommendedProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Produits Recommandés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {recommendedProducts.map((product) => (
                        <Card key={product.id}>
                          <CardContent className="pt-6">
                            <div className="flex gap-4">
                              {product.images && product.images.length > 0 && (
                                <img
                                  src={product.images[0]}
                                  alt={product.name}
                                  className="w-24 h-24 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <h4 className="font-bold">{product.name}</h4>
                                <p className="text-sm text-muted-foreground">{product.description}</p>
                                <p className="font-bold mt-2">{product.price.toFixed(0)}f</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow 3: Business Query */}
        <TabsContent value="business-query" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Questions Business</CardTitle>
                {isListeningBusiness && (
                  <Badge className="bg-green-600 text-white animate-pulse">
                    <Mic className="w-3 h-3 mr-1" />
                    Écoute active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Astuce :</strong> Vous pouvez poser vos questions vocalement en commençant par <strong>"Mon assistant..."</strong> ou simplement parler normalement. 
                  Exemple : "Mon assistant, combien avons-nous vendu aujourd'hui?"
                </p>
              </div>

              {/* Quick Questions - Raccourcis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Questions rapides :</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Combien avons-nous vendu aujourd'hui?")
                      handleBusinessQuery("Combien avons-nous vendu aujourd'hui?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    💰 Ventes aujourd'hui
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Quel est notre meilleur produit?")
                      handleBusinessQuery("Quel est notre meilleur produit?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    ⭐ Meilleur produit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Combien avons-nous dépensé hier et aujourd'hui?")
                      handleBusinessQuery("Combien avons-nous dépensé hier et aujourd'hui?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    💸 Dépenses récentes
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Combien avons-nous vendu cette semaine?")
                      handleBusinessQuery("Combien avons-nous vendu cette semaine?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    📊 Ventes cette semaine
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Y a-t-il un rendez-vous pour ce samedi entre 14h et 16h?")
                      handleBusinessQuery("Y a-t-il un rendez-vous pour ce samedi entre 14h et 16h?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    📅 RDV samedi 14-16h
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Avons-nous encore des gel de douche éclaircissant Dove?")
                      handleBusinessQuery("Avons-nous encore des gel de douche éclaircissant Dove?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    📦 Stock produit
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Quel client a fait le plus d'achats cette semaine?")
                      handleBusinessQuery("Quel client a fait le plus d'achats cette semaine?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    👤 Meilleur client
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Combien de produits sont en stock faible?")
                      handleBusinessQuery("Combien de produits sont en stock faible?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    ⚠️ Stock faible
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusinessQuery("Quels sont les rendez-vous d'aujourd'hui?")
                      handleBusinessQuery("Quels sont les rendez-vous d'aujourd'hui?")
                    }}
                    disabled={loading}
                    className="justify-start text-left h-auto py-2 px-3 whitespace-normal"
                  >
                    📆 RDV aujourd'hui
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Combien avons-nous vendu aujourd'hui? Quel est notre meilleur produit?"
                  value={businessQuery}
                  onChange={(e) => setBusinessQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBusinessQuery()}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleBusinessQuery()} 
                  disabled={loading || !businessQuery.trim()}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>

              {businessResponse && (
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Réponse</CardTitle>
                    {vocalResponseEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => speakText(businessResponse)}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        Lire à voix haute
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="whitespace-pre-wrap">{businessResponse}</p>
                  </CardContent>
                </Card>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-semibold mb-2">Exemples de questions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Combien avons-nous vendu aujourd'hui?</li>
                  <li>Le client X a fait un achat de combien cette semaine?</li>
                  <li>Quel est notre meilleur produit?</li>
                  <li>Avons-nous encore des gel de douche éclaircissant Dove?</li>
                  <li>Combien a-t-on dépensé hier et aujourd'hui?</li>
                  <li>Y a-t-il un rendez-vous pour ce samedi entre 14h et 16h?</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow 4: Voice Navigation */}
        <TabsContent value="voice-nav" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Vocale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-4">
                <Button
                  onClick={startVoiceNavigation}
                  disabled={isListening}
                  size="lg"
                  className={isListening ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isListening ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Écoute en cours...
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Démarrer la reconnaissance vocale
                    </>
                  )}
                </Button>

                {voiceTranscript && (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="font-semibold mb-2">Commande détectée:</p>
                      <p>{voiceTranscript}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Commandes vocales supportées:</p>
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>"Aller au dashboard"</li>
                    <li>"Ouvrir les produits"</li>
                    <li>"Voir les clients"</li>
                    <li>"Point de vente"</li>
                    <li>Et toutes les questions business</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow: Duplicate Check (All Users) */}
        <TabsContent value="duplicate-check" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Détection de Doublons de Produits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Entrez les informations du produit pour vérifier s'il existe déjà dans la base de données
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Nom du produit *</Label>
                  <Input
                    placeholder="Ex: Crème hydratante L'Oréal"
                    value={duplicateCheckProduct?.name || ''}
                    onChange={(e) => setDuplicateCheckProduct(prev => ({...prev || {} as any, name: e.target.value} as any))}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description du produit..."
                    value={duplicateCheckProduct?.description || ''}
                    onChange={(e) => setDuplicateCheckProduct(prev => ({...prev || {} as any, description: e.target.value} as any))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marque</Label>
                    <Input
                      placeholder="Ex: L'Oréal"
                      value={duplicateCheckProduct?.brand || ''}
                      onChange={(e) => setDuplicateCheckProduct(prev => ({...prev || {} as any, brand: e.target.value} as any))}
                    />
                  </div>
                  <div>
                    <Label>Prix</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={duplicateCheckProduct?.price || ''}
                      onChange={(e) => setDuplicateCheckProduct(prev => ({...prev || {} as any, price: parseFloat(e.target.value) || 0} as any))}
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!duplicateCheckProduct?.name) {
                      toast.error('Veuillez entrer au moins le nom du produit')
                      return
                    }
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/product-duplicate-check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productData: duplicateCheckProduct, userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setDuplicateResults(data)
                      toast.success(data.hasDuplicates ? 'Doublons détectés!' : 'Aucun doublon détecté')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de la vérification')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !duplicateCheckProduct?.name}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                  Vérifier les doublons
                </Button>
              </div>

              {duplicateResults && (
                <Card className={duplicateResults.hasDuplicates ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : 'bg-green-50 dark:bg-green-900/20 border-green-200'}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {duplicateResults.hasDuplicates ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <Shield className="w-5 h-5 text-green-600" />
                        )}
                        <h3 className="font-bold">{duplicateResults.message}</h3>
                      </div>
                      {duplicateResults.duplicates && duplicateResults.duplicates.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-semibold">Produits similaires détectés:</p>
                          {duplicateResults.duplicates.map((dup: any, idx: number) => (
                            <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded border">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{dup.productName}</p>
                                  <p className="text-sm text-muted-foreground">{dup.reason}</p>
                                </div>
                                <Badge variant={dup.similarityScore > 85 ? 'destructive' : 'secondary'}>
                                  {dup.similarityScore}% similaire
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow: Price Recommendation (All Users) */}
        <TabsContent value="price-recommendation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recommandation de Prix</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Analysez le prix optimal pour votre produit en fonction du marché et de la marge
              </p>
              <div className="space-y-4">
                <div>
                  <Label>Nom du produit *</Label>
                  <Input
                    placeholder="Ex: Crème hydratante"
                    value={priceRecProduct?.name || ''}
                    onChange={(e) => setPriceRecProduct(prev => ({...prev || {} as any, name: e.target.value} as any))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Coût de revient (FCFA) *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={priceRecProduct?.cost || ''}
                      onChange={(e) => setPriceRecProduct(prev => ({...prev || {} as any, cost: parseFloat(e.target.value) || 0} as any))}
                    />
                  </div>
                  <div>
                    <Label>Prix actuel proposé (FCFA)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={priceRecProduct?.price || ''}
                      onChange={(e) => setPriceRecProduct(prev => ({...prev || {} as any, price: parseFloat(e.target.value) || 0} as any))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Description du produit..."
                    value={priceRecProduct?.description || ''}
                    onChange={(e) => setPriceRecProduct(prev => ({...prev || {} as any, description: e.target.value} as any))}
                    rows={2}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!priceRecProduct?.name || !priceRecProduct?.cost) {
                      toast.error('Veuillez entrer le nom et le coût de revient')
                      return
                    }
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/price-recommendation', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ productData: priceRecProduct, userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setPriceRecResult(data.data)
                      toast.success('Analyse terminée!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de l\'analyse')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !priceRecProduct?.name || !priceRecProduct?.cost}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                  Analyser le prix
                </Button>
              </div>

              {priceRecResult && (
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <h3 className="font-bold mb-2">Prix Recommandé: {priceRecResult.recommendedPrice?.toFixed(0)} FCFA</h3>
                      <p className="text-sm text-muted-foreground mb-2">Marge recommandée: {priceRecResult.recommendedMargin}%</p>
                      {priceRecResult.priceAssessment && (
                        <Badge variant={priceRecResult.priceAssessment === 'high' ? 'destructive' : priceRecResult.priceAssessment === 'low' ? 'secondary' : 'default'}>
                          Prix {priceRecResult.priceAssessment === 'high' ? 'élevé' : priceRecResult.priceAssessment === 'low' ? 'bas' : 'normal'}
                        </Badge>
                      )}
                    </div>
                    {priceRecResult.priceRationale && (
                      <div>
                        <p className="font-semibold mb-1">Explication:</p>
                        <p className="text-sm whitespace-pre-wrap">{priceRecResult.priceRationale}</p>
                      </div>
                    )}
                    {priceRecResult.warnings && priceRecResult.warnings.length > 0 && (
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/40 rounded">
                        <p className="font-semibold mb-1 text-yellow-800 dark:text-yellow-200">Alertes:</p>
                        <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                          {priceRecResult.warnings.map((w: string, idx: number) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {priceRecResult.promotionSuggestions && priceRecResult.promotionSuggestions.length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Suggestions de promotions:</p>
                        <div className="space-y-2">
                          {priceRecResult.promotionSuggestions.map((promo: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <p className="text-sm">{promo.type === 'pourcentage' ? `-${promo.amount}%` : `-${promo.amount} FCFA`} - {promo.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow: Client Profile Analysis (Staff: receptionniste, caissiere, admins) */}
        <TabsContent value="client-profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse de Profil Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canAccessStaffFeatures ? (
                <p className="text-sm text-muted-foreground">Cette fonctionnalité est réservée au personnel (réceptionniste, caissière, admins)</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez un client pour générer une analyse détaillée de son profil et de son comportement d'achat
                  </p>
                  <div>
                    <Label>ID Client *</Label>
                    <Input
                      placeholder="Entrez l'ID du client"
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleClientProfileAnalysis()}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!selectedClientId) {
                        toast.error('Veuillez entrer un ID client')
                        return
                      }
                      setLoading(true)
                      try {
                        const response = await fetch('/api/ai/client-profile-analysis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ clientId: selectedClientId, userRole })
                        })
                        const data = await response.json()
                        if (!response.ok) throw new Error(data.error || 'Erreur')
                        setClientProfileResult(data.data)
                        toast.success('Analyse terminée!')
                      } catch (error: any) {
                        toast.error(error.message || 'Erreur lors de l\'analyse')
                      } finally {
                        setLoading(false)
                      }
                    }}
                    disabled={loading || !selectedClientId}
                    className="w-full"
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserSearch className="w-4 h-4 mr-2" />}
                    Analyser le profil
                  </Button>
                </>
              )}

              {clientProfileResult && (
                <Card className="bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="pt-6 space-y-4">
                    {clientProfileResult.behavioralProfile && (
                      <div>
                        <h3 className="font-bold mb-2">Profil Comportemental</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p><span className="font-semibold">Type:</span> {clientProfileResult.behavioralProfile.clientType}</p>
                          <p><span className="font-semibold">Fidélité:</span> {clientProfileResult.behavioralProfile.loyaltyLevel}</p>
                          <p><span className="font-semibold">Score d'engagement:</span> {clientProfileResult.behavioralProfile.engagementScore}/100</p>
                        </div>
                      </div>
                    )}
                    {clientProfileResult.churnRisk && (
                      <div>
                        <h3 className="font-bold mb-2">Risque de Perte (Churn)</h3>
                        <Badge variant={clientProfileResult.churnRisk.score > 70 ? 'destructive' : clientProfileResult.churnRisk.score > 40 ? 'secondary' : 'default'}>
                          {clientProfileResult.churnRisk.level} ({clientProfileResult.churnRisk.score}/100)
                        </Badge>
                        {clientProfileResult.churnRisk.preventionActions && clientProfileResult.churnRisk.preventionActions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-semibold">Actions préventives:</p>
                            <ul className="list-disc list-inside text-sm">
                              {clientProfileResult.churnRisk.preventionActions.map((action: string, idx: number) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {clientProfileResult.personalizedRecommendations && clientProfileResult.personalizedRecommendations.length > 0 && (
                      <div>
                        <h3 className="font-bold mb-2">Recommandations Personnalisées</h3>
                        <div className="space-y-2">
                          {clientProfileResult.personalizedRecommendations.map((rec: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border">
                              <p className="font-medium">{rec.productName}</p>
                              <p className="text-xs text-muted-foreground">{rec.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {clientProfileResult.recommendations && clientProfileResult.recommendations.length > 0 && (
                      <div>
                        <h3 className="font-bold mb-2">Recommandations pour la Fidélisation</h3>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {clientProfileResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow: Performance Prediction (Admin Only) */}
        {isAdmin && (
          <TabsContent value="performance-prediction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Prédictions de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Période de prédiction</Label>
                  <Select value={predictionPeriod} onValueChange={setPredictionPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois</SelectItem>
                      <SelectItem value="quarter">Ce trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/performance-prediction', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ period: predictionPeriod, userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setPredictionResult(data.data)
                      toast.success('Prédictions générées!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de la prédiction')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Générer les prédictions
                </Button>

                {predictionResult && (
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-6 space-y-4">
                      {predictionResult.predictions && (
                        <div>
                          <h3 className="font-bold mb-2">Prédictions pour {predictionPeriod === 'day' ? 'aujourd\'hui' : predictionPeriod === 'week' ? 'cette semaine' : predictionPeriod === 'month' ? 'ce mois' : 'ce trimestre'}</h3>
                          <div className="space-y-2">
                            {predictionResult.predictions.map((pred: any, idx: number) => (
                              <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-semibold">{pred.metric}</p>
                                <p className="text-sm text-muted-foreground">{pred.value}</p>
                                {pred.confidence && (
                                  <p className="text-xs text-muted-foreground mt-1">Confiance: {pred.confidence}%</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {predictionResult.recommendations && predictionResult.recommendations.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Recommandations</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {predictionResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Flow: Performance Comparison (Admin Only) */}
        {isAdmin && (
          <TabsContent value="performance-comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analyse Comparative de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Période 1 - Début</Label>
                    <Input
                      type="date"
                      value={comparisonPeriod1.start}
                      onChange={(e) => setComparisonPeriod1(prev => ({...prev, start: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Période 1 - Fin</Label>
                    <Input
                      type="date"
                      value={comparisonPeriod1.end}
                      onChange={(e) => setComparisonPeriod1(prev => ({...prev, end: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Période 2 - Début</Label>
                    <Input
                      type="date"
                      value={comparisonPeriod2.start}
                      onChange={(e) => setComparisonPeriod2(prev => ({...prev, start: e.target.value}))}
                    />
                  </div>
                  <div>
                    <Label>Période 2 - Fin</Label>
                    <Input
                      type="date"
                      value={comparisonPeriod2.end}
                      onChange={(e) => setComparisonPeriod2(prev => ({...prev, end: e.target.value}))}
                    />
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    if (!comparisonPeriod1.start || !comparisonPeriod1.end || !comparisonPeriod2.start || !comparisonPeriod2.end) {
                      toast.error('Veuillez remplir toutes les dates')
                      return
                    }
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/performance-comparison', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          comparisonType: 'period',
                          period1: comparisonPeriod1,
                          period2: comparisonPeriod2,
                          userRole
                        })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setComparisonResult(data.data)
                      toast.success('Comparaison terminée!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de la comparaison')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !comparisonPeriod1.start || !comparisonPeriod2.start}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                  Comparer les périodes
                </Button>

                {comparisonResult && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="pt-6 space-y-4">
                      {comparisonResult.comparison && (
                        <div>
                          <h3 className="font-bold mb-2">Résultats de la Comparaison</h3>
                          <div className="space-y-2">
                            {Object.entries(comparisonResult.comparison).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-2 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-semibold">{key}</p>
                                <p className="text-sm">Période 1: {value.period1 || 'N/A'}</p>
                                <p className="text-sm">Période 2: {value.period2 || 'N/A'}</p>
                                {value.change !== undefined && (
                                  <p className={`text-sm font-semibold ${value.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Évolution: {value.change > 0 ? '+' : ''}{value.change}%
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {comparisonResult.insights && comparisonResult.insights.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Insights</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {comparisonResult.insights.map((insight: string, idx: number) => (
                              <li key={idx}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Flow: Smart Alerts (Admin Only) */}
        {isAdmin && (
          <TabsContent value="smart-alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertes Intelligentes Proactives</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Le système détecte automatiquement les anomalies et opportunités dans votre business
                </p>
                <Button
                  onClick={async () => {
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/smart-alerts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setAlertsResult(data.data)
                      toast.success('Alertes générées!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de la génération des alertes')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  Générer les alertes
                </Button>

                {alertsResult && (
                  <Card className="bg-yellow-50 dark:bg-yellow-900/20">
                    <CardContent className="pt-6 space-y-4">
                      {alertsResult.alerts && alertsResult.alerts.length > 0 ? (
                        <div className="space-y-3">
                          {alertsResult.alerts.map((alert: any, idx: number) => (
                            <div key={idx} className={`p-4 rounded border ${alert.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : alert.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200'}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className={`w-4 h-4 ${alert.priority === 'high' ? 'text-red-600' : alert.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                                    <p className="font-semibold">{alert.title}</p>
                                    <Badge variant={alert.priority === 'high' ? 'destructive' : alert.priority === 'medium' ? 'secondary' : 'default'}>
                                      {alert.priority === 'high' ? 'Urgent' : alert.priority === 'medium' ? 'Important' : 'Info'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm mb-2">{alert.message}</p>
                                  {alert.suggestedActions && alert.suggestedActions.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold mb-1">Actions suggérées:</p>
                                      <ul className="list-disc list-inside text-xs space-y-1">
                                        {alert.suggestedActions.map((action: string, aidx: number) => (
                                          <li key={aidx}>{action}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune alerte détectée. Tout va bien! ✅</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Flow: Strategic Decision Assistant (Admin Only) */}
        {isAdmin && (
          <TabsContent value="strategic-decision" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Assistant de Décision Stratégique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Question stratégique *</Label>
                  <Textarea
                    placeholder="Ex: Devrions-nous lancer une promotion sur nos produits hydratants ce mois-ci?"
                    value={strategicQuestion}
                    onChange={(e) => setStrategicQuestion(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!strategicQuestion.trim()) {
                      toast.error('Veuillez entrer une question stratégique')
                      return
                    }
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/strategic-decision-assistant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question: strategicQuestion, userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setStrategicResult(data.data)
                      toast.success('Analyse terminée!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de l\'analyse')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !strategicQuestion.trim()}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
                  Analyser la question
                </Button>

                {strategicResult && (
                  <Card className="bg-purple-50 dark:bg-purple-900/20">
                    <CardContent className="pt-6 space-y-4">
                      {strategicResult.recommendation && (
                        <div>
                          <h3 className="font-bold mb-2">Recommandation</h3>
                          <p className="whitespace-pre-wrap">{strategicResult.recommendation}</p>
                        </div>
                      )}
                      {strategicResult.risks && strategicResult.risks.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Risques Identifiés</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {strategicResult.risks.map((risk: string, idx: number) => (
                              <li key={idx}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategicResult.opportunities && strategicResult.opportunities.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Opportunités</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {strategicResult.opportunities.map((opp: string, idx: number) => (
                              <li key={idx}>{opp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategicResult.actionPlan && strategicResult.actionPlan.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Plan d'Action Suggéré</h3>
                          <ol className="list-decimal list-inside text-sm space-y-1">
                            {strategicResult.actionPlan.map((action: string, idx: number) => (
                              <li key={idx}>{action}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Flow: What-If Scenarios (Admin Only) */}
        {isAdmin && (
          <TabsContent value="what-if" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scénarios "What-If"</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Simulez différents scénarios business pour anticiper les résultats
                </p>
                <div>
                  <Label>Description du scénario *</Label>
                  <Textarea
                    placeholder="Ex: Que se passerait-il si nous augmentions tous nos prix de 10%? Ou si nous lancions une promotion de -20% sur les produits de soin?"
                    value={whatIfScenario}
                    onChange={(e) => setWhatIfScenario(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!whatIfScenario.trim()) {
                      toast.error('Veuillez décrire un scénario')
                      return
                    }
                    setLoading(true)
                    try {
                      const response = await fetch('/api/ai/what-if-scenarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scenario: whatIfScenario, userRole })
                      })
                      const data = await response.json()
                      if (!response.ok) throw new Error(data.error || 'Erreur')
                      setWhatIfResult(data.data)
                      toast.success('Simulation terminée!')
                    } catch (error: any) {
                      toast.error(error.message || 'Erreur lors de la simulation')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !whatIfScenario.trim()}
                  className="w-full"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Simuler le scénario
                </Button>

                {whatIfResult && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="pt-6 space-y-4">
                      {whatIfResult.scenarioDescription && (
                        <div>
                          <h3 className="font-bold mb-2">Scénario Simulé</h3>
                          <p className="text-sm">{whatIfResult.scenarioDescription}</p>
                        </div>
                      )}
                      {whatIfResult.predictedImpact && (
                        <div>
                          <h3 className="font-bold mb-2">Impact Prévu</h3>
                          <div className="space-y-2">
                            {Object.entries(whatIfResult.predictedImpact).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-2 bg-white dark:bg-gray-800 rounded border">
                                <p className="font-semibold text-sm">{key}</p>
                                <p className="text-sm">{typeof value === 'object' ? JSON.stringify(value) : value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {whatIfResult.recommendations && whatIfResult.recommendations.length > 0 && (
                        <div>
                          <h3 className="font-bold mb-2">Recommandations</h3>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {whatIfResult.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

