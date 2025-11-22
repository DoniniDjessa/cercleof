import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { clientId, userRole } = await request.json()

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('dd-clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch purchase history
    const { data: sales } = await supabase
      .from('dd-ventes')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(50)

    // Fetch sale items separately
    const saleIds = sales?.map(s => s.id) || []
    const { data: saleItems } = saleIds.length > 0 ? await supabase
      .from('dd-ventes-items')
      .select(`
        *,
        product:dd-products(id, name, category_id, price),
        service:dd-services(id, name, category_id, price)
      `)
      .in('vente_id', saleIds)
      : { data: null }

    // Fetch appointments/services
    const { data: appointments } = await supabase
      .from('dd-appointments')
      .select('*')
      .eq('client_id', clientId)
      .order('date_rdv', { ascending: false })
      .limit(30)

    // Fetch salon services
    const { data: salonServices } = await supabase
      .from('dd-salon')
      .select('*')
      .eq('client_id', clientId)
      .order('date_service', { ascending: false })
      .limit(30)

    // Calculate statistics
    const salesArray = sales || []
    const totalSpent = salesArray.reduce((sum: number, sale: any) => sum + (sale.total_net || 0), 0)
    const totalVisits = salesArray.length + (appointments?.length || 0) + (salonServices?.length || 0)
    const averageBasket = salesArray.length > 0 ? totalSpent / salesArray.length : 0

    // Extract preferences
    const purchasedProducts = saleItems?.filter((item: any) => item.product) || []
    
    const categoriesPurchased = new Set(
      purchasedProducts.map((item: any) => item.product?.category_id).filter(Boolean)
    )

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en analyse de profils clients pour salons de beauté et instituts.

Profil client:
- Nom: ${client.first_name} ${client.last_name}
- Email: ${client.email || 'N/A'}
- Téléphone: ${client.phone || 'N/A'}
- Type de peau: ${client.skin_type || 'Non spécifié'}
- Allergies: ${client.allergies || 'Aucune'}
- Date de création: ${client.created_at || 'N/A'}

Historique d'achats:
- Nombre total de visites: ${totalVisits}
- Montant total dépensé: ${totalSpent} FCFA
- Panier moyen: ${averageBasket.toFixed(0)} FCFA
- Nombre de ventes: ${salesArray.length}

Dernières ventes (${Math.min(5, salesArray.length)}):
${JSON.stringify(salesArray.slice(0, 5).map((s: any) => ({
  date: s.date,
  total: s.total_net,
  items: saleItems?.filter((i: any) => i.vente_id === s.id).map((i: any) => ({
    product: i.product?.name,
    service: i.service?.name,
    quantity: i.quantity,
    price: i.price
  })) || []
})), null, 2)}

Tâches:
1. Génère un profil comportemental du client (type de client, habitudes d'achat)
2. Identifie les préférences et besoins (catégories préférées, types de produits/services)
3. Propose des suggestions de produits personnalisés basées sur l'historique
4. Prédit les besoins futurs possibles
5. Évalue le risque de perte de client (churn risk) avec score 0-100
6. Donne des recommandations pour la fidélisation

Réponds au format JSON strict suivant (sans markdown):
{
  "behavioralProfile": {
    "clientType": "VIP|Regular|Occasional|New",
    "purchasePattern": "Description du pattern d'achat",
    "loyaltyLevel": "High|Medium|Low",
    "engagementScore": 85
  },
  "preferences": {
    "favoriteCategories": ["Catégorie 1", "Catégorie 2"],
    "preferredProductTypes": ["Type 1", "Type 2"],
    "spendingBehavior": "Description du comportement de dépense"
  },
  "personalizedRecommendations": [
    {
      "productName": "Nom du produit",
      "reason": "Pourquoi recommander ce produit",
      "category": "Catégorie"
    }
  ],
  "futureNeeds": [
    {
      "need": "Description du besoin",
      "timing": "Quand ce besoin pourrait survenir",
      "confidence": "High|Medium|Low"
    }
  ],
  "churnRisk": {
    "score": 25,
    "level": "Low|Medium|High",
    "factors": ["Facteur 1", "Facteur 2"],
    "preventionActions": ["Action 1", "Action 2"]
  },
  "insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ],
  "recommendations": [
    "Recommandation 1 pour fidéliser le client",
    "Recommandation 2",
    "Recommandation 3"
  ]
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    let parsedResponse
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = {
          behavioralProfile: {
            clientType: totalSpent > 100000 ? 'VIP' : totalVisits > 10 ? 'Regular' : 'Occasional',
            purchasePattern: 'Client avec historique d\'achats réguliers',
            loyaltyLevel: totalVisits > 5 ? 'High' : 'Medium',
            engagementScore: Math.min(100, totalVisits * 10)
          },
          preferences: {
            favoriteCategories: [],
            preferredProductTypes: [],
            spendingBehavior: `Panier moyen de ${averageBasket.toFixed(0)} FCFA`
          },
          personalizedRecommendations: [],
          futureNeeds: [],
          churnRisk: {
            score: totalVisits > 5 ? 20 : 50,
            level: totalVisits > 5 ? 'Low' : 'Medium',
            factors: [],
            preventionActions: []
          },
          insights: [],
          recommendations: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        behavioralProfile: {
          clientType: 'Regular',
          purchasePattern: 'Client avec historique d\'achats',
          loyaltyLevel: 'Medium',
          engagementScore: 50
        },
        preferences: {},
        personalizedRecommendations: [],
        futureNeeds: [],
        churnRisk: { score: 50, level: 'Medium', factors: [], preventionActions: [] },
        insights: [],
        recommendations: []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...parsedResponse,
        statistics: {
          totalSpent,
          totalVisits,
          averageBasket,
          lastVisitDate: sales?.[0]?.date || appointments?.[0]?.date_rdv || null
        }
      }
    })
  } catch (error: any) {
    console.error('Error in client profile analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'analyse du profil client' },
      { status: 500 }
    )
  }
}

