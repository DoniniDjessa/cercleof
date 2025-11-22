import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { question, context, userRole } = await request.json()

    if (!['admin', 'superadmin', 'manager'].includes(userRole?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch comprehensive business data
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch key metrics
    const { data: recentSales } = await supabase
      .from('dd-ventes')
      .select('date, total_net, total_brut, status')
      .eq('status', 'completed')
      .gte('date', last30Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const { data: expenses } = await supabase
      .from('dd-depenses')
      .select('date, amount')
      .gte('date', last30Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const { data: products } = await supabase
      .from('dd-products')
      .select('id, name, stock_quantity, price, cost, status')
      .eq('is_active', true)
      .limit(50)

    const { data: clients } = await supabase
      .from('dd-clients')
      .select('id, first_name, last_name, created_at')
      .gte('created_at', last30Days.toISOString())
      .limit(50)

    // Calculate key metrics
    const totalSales = recentSales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
    const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const profit = totalSales - totalExpenses
    const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0
    const salesCount = recentSales?.length || 0
    const averageBasket = salesCount > 0 ? totalSales / salesCount : 0
    const newClients = clients?.length || 0
    const lowStockCount = products?.filter(p => (p.stock_quantity || 0) <= 10).length || 0

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en aide à la décision stratégique pour entreprises de beauté et cosmétiques.

Question stratégique de l'utilisateur:
"${question}"

Contexte fourni:
${context || 'Aucun contexte supplémentaire'}

Données actuelles de l'entreprise (30 derniers jours):
- Ventes totales: ${totalSales.toFixed(0)} FCFA
- Dépenses totales: ${totalExpenses.toFixed(0)} FCFA
- Profit: ${profit.toFixed(0)} FCFA
- Marge bénéficiaire: ${profitMargin.toFixed(1)}%
- Nombre de ventes: ${salesCount}
- Panier moyen: ${averageBasket.toFixed(0)} FCFA
- Nouveaux clients: ${newClients}
- Produits en stock faible: ${lowStockCount}

Nombre total de produits actifs: ${products?.length || 0}

Tâches:
1. Analyse la question stratégique dans le contexte des données actuelles
2. Identifie les risques et opportunités liés à la décision
3. Propose des scénarios multiples avec leurs implications
4. Fournis des recommandations basées sur les données disponibles
5. Identifie les facteurs clés à considérer
6. Suggère un plan d'action concret avec étapes

Réponds au format JSON strict suivant (sans markdown):
{
  "analysis": {
    "question": "${question}",
    "context": "Analyse du contexte de la question",
    "keyFactors": [
      "Facteur clé 1",
      "Facteur clé 2",
      "Facteur clé 3"
    ]
  },
  "scenarios": [
    {
      "name": "Scénario 1",
      "description": "Description du scénario",
      "pros": ["Avantage 1", "Avantage 2"],
      "cons": ["Inconvénient 1", "Inconvénient 2"],
      "probability": "High|Medium|Low",
      "expectedImpact": "Description de l'impact attendu"
    }
  ],
  "risks": [
    {
      "risk": "Description du risque",
      "severity": "High|Medium|Low",
      "mitigation": "Suggestion de mitigation"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Description de l'opportunité",
      "potentialImpact": "Description de l'impact potentiel",
      "action": "Action recommandée"
    }
  ],
  "recommendations": [
    {
      "recommendation": "Recommandation détaillée",
      "priority": "High|Medium|Low",
      "reasoning": "Raisonnement derrière la recommandation",
      "expectedOutcome": "Résultat attendu"
    }
  ],
  "actionPlan": {
    "steps": [
      {
        "step": 1,
        "action": "Action à entreprendre",
        "timeline": "Délai suggéré",
        "owner": "Responsable suggéré",
        "successCriteria": "Critère de succès"
      }
    ],
    "timeline": "Timeline globale",
    "resourcesNeeded": ["Ressource 1", "Ressource 2"]
  },
  "dataConsiderations": [
    "Considération basée sur les données 1",
    "Considération basée sur les données 2"
  ],
  "insights": [
    "Insight stratégique 1",
    "Insight stratégique 2",
    "Insight stratégique 3"
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
          analysis: {
            question: question,
            context: 'Analyse du contexte de la question',
            keyFactors: []
          },
          scenarios: [],
          risks: [],
          opportunities: [],
          recommendations: [],
          actionPlan: {
            steps: [],
            timeline: 'À définir',
            resourcesNeeded: []
          },
          dataConsiderations: [],
          insights: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        analysis: {
          question: question,
          context: 'Analyse du contexte de la question',
          keyFactors: []
        },
        scenarios: [],
        risks: [],
        opportunities: [],
        recommendations: [],
        actionPlan: {
          steps: [],
          timeline: 'À définir',
          resourcesNeeded: []
        },
        dataConsiderations: [],
        insights: []
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse
    })
  } catch (error: any) {
    console.error('Error in strategic decision assistant:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'analyse stratégique' },
      { status: 500 }
    )
  }
}

