import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { scenario, parameters, userRole } = await request.json()

    if (!['admin', 'superadmin', 'manager'].includes(userRole?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    if (!scenario) {
      return NextResponse.json(
        { error: 'Scenario description is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch current baseline data
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch baseline metrics
    const { data: baselineSales } = await supabase
      .from('dd-ventes')
      .select('date, total_net, total_brut, reduction, status')
      .eq('status', 'completed')
      .gte('date', last30Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const { data: baselineExpenses } = await supabase
      .from('dd-depenses')
      .select('date, amount')
      .gte('date', last30Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const { data: products } = await supabase
      .from('dd-products')
      .select('id, name, price, cost, stock_quantity')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(50)

    // Calculate baseline metrics
    const baselineTotalSales = baselineSales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
    const baselineTotalExpenses = baselineExpenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0
    const baselineProfit = baselineTotalSales - baselineTotalExpenses
    const baselineSalesCount = baselineSales?.length || 0
    const baselineAverageBasket = baselineSalesCount > 0 ? baselineTotalSales / baselineSalesCount : 0
    const baselineDiscount = baselineSales?.reduce((sum, s) => sum + (s.reduction || 0), 0) || 0

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en simulation de scénarios business pour entreprises de beauté et cosmétiques.

Scénario "What-If" à simuler:
"${scenario}"

Paramètres fournis:
${JSON.stringify(parameters || {}, null, 2)}

Situation actuelle (baseline - 30 derniers jours):
- Ventes totales: ${baselineTotalSales.toFixed(0)} FCFA
- Dépenses totales: ${baselineTotalExpenses.toFixed(0)} FCFA
- Profit: ${baselineProfit.toFixed(0)} FCFA
- Nombre de ventes: ${baselineSalesCount}
- Panier moyen: ${baselineAverageBasket.toFixed(0)} FCFA
- Réductions totales: ${baselineDiscount.toFixed(0)} FCFA
- Nombre de produits actifs: ${products?.length || 0}

Tâches:
1. Simule le scénario décrit avec les paramètres fournis
2. Calcule les impacts prévus sur les métriques clés (ventes, profit, clients, etc.)
3. Compare avec la situation actuelle (baseline)
4. Identifie les risques et opportunités
5. Estime la probabilité de succès
6. Propose des variations du scénario (optimiste, réaliste, pessimiste)
7. Recommande des indicateurs de suivi (KPIs)

Réponds au format JSON strict suivant (sans markdown):
{
  "scenario": {
    "name": "${scenario}",
    "description": "Description du scénario",
    "parameters": ${JSON.stringify(parameters || {})}
  },
  "simulations": {
    "realistic": {
      "projectedSales": 550000,
      "projectedExpenses": 300000,
      "projectedProfit": 250000,
      "projectedSalesCount": 125,
      "projectedAverageBasket": 4400,
      "projectedNewClients": 15,
      "changes": {
        "salesChange": 10000,
        "salesPercentChange": 2.0,
        "profitChange": 5000,
        "profitPercentChange": 2.5
      }
    },
    "optimistic": {
      "projectedSales": 600000,
      "projectedExpenses": 300000,
      "projectedProfit": 300000,
      "projectedSalesCount": 140,
      "projectedAverageBasket": 4285,
      "projectedNewClients": 20,
      "changes": {
        "salesChange": 60000,
        "salesPercentChange": 11.0,
        "profitChange": 55000,
        "profitPercentChange": 22.0
      }
    },
    "pessimistic": {
      "projectedSales": 480000,
      "projectedExpenses": 310000,
      "projectedProfit": 170000,
      "projectedSalesCount": 110,
      "projectedAverageBasket": 4363,
      "projectedNewClients": 10,
      "changes": {
        "salesChange": -40000,
        "salesPercentChange": -7.7,
        "profitChange": -30000,
        "profitPercentChange": -15.0
      }
    }
  },
  "baseline": {
    "totalSales": ${baselineTotalSales.toFixed(0)},
    "totalExpenses": ${baselineTotalExpenses.toFixed(0)},
    "profit": ${baselineProfit.toFixed(0)},
    "salesCount": ${baselineSalesCount},
    "averageBasket": ${baselineAverageBasket.toFixed(0)}
  },
  "impacts": {
    "financial": {
      "revenueImpact": "Description de l'impact sur les revenus",
      "costImpact": "Description de l'impact sur les coûts",
      "profitImpact": "Description de l'impact sur le profit"
    },
    "operational": {
      "inventoryImpact": "Description de l'impact sur l'inventaire",
      "staffImpact": "Description de l'impact sur le personnel",
      "processImpact": "Description de l'impact sur les processus"
    },
    "market": {
      "customerImpact": "Description de l'impact sur les clients",
      "competitionImpact": "Description de l'impact sur la concurrence",
      "marketPositionImpact": "Description de l'impact sur la position marché"
    }
  },
  "risks": [
    {
      "risk": "Description du risque",
      "probability": "High|Medium|Low",
      "impact": "High|Medium|Low",
      "mitigation": "Suggestion de mitigation"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Description de l'opportunité",
      "probability": "High|Medium|Low",
      "impact": "High|Medium|Low",
      "action": "Action recommandée"
    }
  ],
  "successProbability": 75,
  "recommendations": [
    {
      "recommendation": "Recommandation détaillée",
      "priority": "High|Medium|Low",
      "reasoning": "Raisonnement"
    }
  ],
  "kpis": [
    {
      "kpi": "KPI à suivre",
      "baseline": "Valeur baseline",
      "target": "Valeur cible",
      "frequency": "daily|weekly|monthly"
    }
  ],
  "timeline": {
    "implementation": "Durée d'implémentation",
    "expectedResults": "Délai pour voir les résultats",
    "reviewPoints": ["Point de revue 1", "Point de revue 2"]
  },
  "insights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
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
        // Fallback simulation
        const projectedSales = baselineTotalSales * 1.1 // 10% increase
        const projectedProfit = baselineProfit * 1.15
        
        parsedResponse = {
          scenario: {
            name: scenario,
            description: 'Simulation du scénario',
            parameters: parameters || {}
          },
          simulations: {
            realistic: {
              projectedSales: Math.round(projectedSales),
              projectedExpenses: Math.round(baselineTotalExpenses),
              projectedProfit: Math.round(projectedProfit),
              projectedSalesCount: Math.round(baselineSalesCount * 1.05),
              projectedAverageBasket: Math.round(baselineAverageBasket),
              changes: {
                salesChange: Math.round(projectedSales - baselineTotalSales),
                salesPercentChange: 10.0,
                profitChange: Math.round(projectedProfit - baselineProfit),
                profitPercentChange: 15.0
              }
            },
            optimistic: {
              projectedSales: Math.round(projectedSales * 1.2),
              projectedExpenses: Math.round(baselineTotalExpenses),
              projectedProfit: Math.round(projectedProfit * 1.3),
              projectedSalesCount: Math.round(baselineSalesCount * 1.15),
              projectedAverageBasket: Math.round(baselineAverageBasket * 1.05),
              changes: {
                salesChange: Math.round(projectedSales * 1.2 - baselineTotalSales),
                salesPercentChange: 20.0,
                profitChange: Math.round(projectedProfit * 1.3 - baselineProfit),
                profitPercentChange: 30.0
              }
            },
            pessimistic: {
              projectedSales: Math.round(projectedSales * 0.85),
              projectedExpenses: Math.round(baselineTotalExpenses * 1.05),
              projectedProfit: Math.round(projectedProfit * 0.75),
              projectedSalesCount: Math.round(baselineSalesCount * 0.9),
              projectedAverageBasket: Math.round(baselineAverageBasket * 0.95),
              changes: {
                salesChange: Math.round(projectedSales * 0.85 - baselineTotalSales),
                salesPercentChange: -5.0,
                profitChange: Math.round(projectedProfit * 0.75 - baselineProfit),
                profitPercentChange: -10.0
              }
            }
          },
          baseline: {
            totalSales: baselineTotalSales,
            totalExpenses: baselineTotalExpenses,
            profit: baselineProfit,
            salesCount: baselineSalesCount,
            averageBasket: baselineAverageBasket
          },
          impacts: {},
          risks: [],
          opportunities: [],
          successProbability: 70,
          recommendations: [],
          kpis: [],
          timeline: {},
          insights: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        scenario: { name: scenario, description: '', parameters: {} },
        simulations: {
          realistic: {},
          optimistic: {},
          pessimistic: {}
        },
        baseline: {
          totalSales: baselineTotalSales,
          totalExpenses: baselineTotalExpenses,
          profit: baselineProfit,
          salesCount: baselineSalesCount,
          averageBasket: baselineAverageBasket
        },
        impacts: {},
        risks: [],
        opportunities: [],
        successProbability: 70,
        recommendations: [],
        kpis: [],
        timeline: {},
        insights: []
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse
    })
  } catch (error: any) {
    console.error('Error in what-if scenarios:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la simulation du scénario' },
      { status: 500 }
    )
  }
}

