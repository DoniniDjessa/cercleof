import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { period, userRole } = await request.json()

    if (!['admin', 'superadmin', 'manager'].includes(userRole?.toLowerCase())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    

    // Fetch historical sales data (last 3-6 months)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 6)

    const { data: historicalSales } = await supabase
      .from('dd-ventes')
      .select('date, total_net, total_brut, status')
      .eq('status', 'completed')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Fetch expenses
    const { data: expenses } = await supabase
      .from('dd-depenses')
      .select('date, amount')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Calculate monthly aggregates
    const monthlyData: Record<string, { sales: number; expenses: number; count: number }> = {}
    
    historicalSales?.forEach((sale: any) => {
      const month = sale.date.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, expenses: 0, count: 0 }
      }
      monthlyData[month].sales += sale.total_net || 0
      monthlyData[month].count += 1
    })

    expenses?.forEach((expense: any) => {
      const month = expense.date.substring(0, 7)
      if (!monthlyData[month]) {
        monthlyData[month] = { sales: 0, expenses: 0, count: 0 }
      }
      monthlyData[month].expenses += expense.amount || 0
    })

    const monthlyArray = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        sales: data.sales,
        expenses: data.expenses,
        profit: data.sales - data.expenses,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate trends
    const last3Months = monthlyArray.slice(-3)
    const avgSales = last3Months.reduce((sum, m) => sum + m.sales, 0) / last3Months.length
    const avgProfit = last3Months.reduce((sum, m) => sum + m.profit, 0) / last3Months.length
    const avgCount = last3Months.reduce((sum, m) => sum + m.count, 0) / last3Months.length

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en prédictions de performance pour entreprises de beauté et cosmétiques.

Données historiques (6 derniers mois):
${JSON.stringify(monthlyArray, null, 2)}

Moyennes des 3 derniers mois:
- Ventes moyennes: ${avgSales.toFixed(0)} FCFA
- Profit moyen: ${avgProfit.toFixed(0)} FCFA
- Nombre moyen de ventes: ${avgCount.toFixed(0)}

Période de prédiction demandée: ${period || 'mensuel'}

Tâches:
1. Analyse les tendances historiques (croissance, stagnation, déclin)
2. Détecte les tendances saisonnières si présentes
3. Prédit les performances pour la période suivante (${period || 'mensuel'})
4. Calcule des intervalles de confiance (scénario optimiste, réaliste, pessimiste)
5. Identifie les facteurs de risque et opportunités
6. Recommande des stratégies proactives pour améliorer les performances

Réponds au format JSON strict suivant (sans markdown):
{
  "predictions": {
    "${period || 'mensuel'}": {
      "realistic": {
        "sales": 500000,
        "profit": 250000,
        "count": 120
      },
      "optimistic": {
        "sales": 600000,
        "profit": 300000,
        "count": 140
      },
      "pessimistic": {
        "sales": 400000,
        "profit": 200000,
        "count": 100
      }
    }
  },
  "trends": {
    "direction": "growing|stable|declining",
    "strength": "strong|moderate|weak",
    "description": "Description de la tendance"
  },
  "seasonalPatterns": [
    {
      "period": "Période (ex: Décembre, Janvier)",
      "expectedImpact": "Description de l'impact saisonnier"
    }
  ],
  "confidenceLevel": 85,
  "riskFactors": [
    {
      "factor": "Description du facteur de risque",
      "impact": "High|Medium|Low",
      "mitigation": "Suggestion de mitigation"
    }
  ],
  "opportunities": [
    {
      "opportunity": "Description de l'opportunité",
      "potentialImpact": "Description de l'impact potentiel",
      "recommendedAction": "Action recommandée"
    }
  ],
  "strategicRecommendations": [
    "Recommandation stratégique 1",
    "Recommandation stratégique 2",
    "Recommandation stratégique 3"
  ],
  "insights": [
    "Insight 1 sur les données",
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
        // Fallback predictions based on averages
        parsedResponse = {
          predictions: {
            [period || 'mensuel']: {
              realistic: {
                sales: Math.round(avgSales),
                profit: Math.round(avgProfit),
                count: Math.round(avgCount)
              },
              optimistic: {
                sales: Math.round(avgSales * 1.2),
                profit: Math.round(avgProfit * 1.2),
                count: Math.round(avgCount * 1.15)
              },
              pessimistic: {
                sales: Math.round(avgSales * 0.8),
                profit: Math.round(avgProfit * 0.8),
                count: Math.round(avgCount * 0.85)
              }
            }
          },
          trends: {
            direction: 'stable',
            strength: 'moderate',
            description: 'Tendance stable basée sur les moyennes récentes'
          },
          seasonalPatterns: [],
          confidenceLevel: 70,
          riskFactors: [],
          opportunities: [],
          strategicRecommendations: [],
          insights: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        predictions: {
          [period || 'mensuel']: {
            realistic: { sales: Math.round(avgSales), profit: Math.round(avgProfit), count: Math.round(avgCount) },
            optimistic: { sales: Math.round(avgSales * 1.2), profit: Math.round(avgProfit * 1.2), count: Math.round(avgCount * 1.15) },
            pessimistic: { sales: Math.round(avgSales * 0.8), profit: Math.round(avgProfit * 0.8), count: Math.round(avgCount * 0.85) }
          }
        },
        trends: { direction: 'stable', strength: 'moderate', description: 'Tendance stable' },
        seasonalPatterns: [],
        confidenceLevel: 70,
        riskFactors: [],
        opportunities: [],
        strategicRecommendations: [],
        insights: []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...parsedResponse,
        historicalData: monthlyArray,
        currentAverages: {
          sales: avgSales,
          profit: avgProfit,
          count: avgCount
        }
      }
    })
  } catch (error: any) {
    console.error('Error in performance prediction:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la prédiction de performance' },
      { status: 500 }
    )
  }
}

