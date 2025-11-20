'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Sparkles, MessageSquare, Camera, BarChart, Mic, Loader2, Send, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useVoiceNavigation } from '@/contexts/VoiceNavigationContext'
import toast from 'react-hot-toast'

type FlowType = 'recommendation' | 'skin-analysis' | 'business-query' | 'voice-nav' | null

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

  // Early return if user is not admin
  if (roleChecked && userRole && !['admin', 'superadmin', 'manager'].includes(userRole.toLowerCase())) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accès restreint</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Cette fonctionnalité est réservée aux administrateurs.</p>
            <Button onClick={() => router.push('/admin/pos')} className="mt-4">
              Retour au Point de Vente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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

  // Keep ref in sync with state
  useEffect(() => {
    businessQueryRef.current = businessQuery
  }, [businessQuery])

  // Flow 4: Voice Navigation
  const [isListening, setIsListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')

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

  // Check if user is admin - restrict access to admins only
  useEffect(() => {
    if (userRole && !['admin', 'superadmin', 'manager'].includes(userRole.toLowerCase())) {
      toast.error('Accès restreint : Cette fonctionnalité est réservée aux administrateurs')
      router.push('/admin/pos')
    }
  }, [userRole, router])

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

  // Flow 3: Business Query
  const [vocalResponseEnabled, setVocalResponseEnabled] = useState(false)

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

  // Flow 4: Voice Navigation
  const [recognition, setRecognition] = useState<any>(null)

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
      </Tabs>
    </div>
  )
}

