import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { comparisonType, period1, period2, userRole } = await request.json()

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

    // Fetch data for period 1
    const period1Start = period1?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const period1End = period1?.end || new Date().toISOString().split('T')[0]
    
    const period2Start = period2?.start || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const period2End = period2?.end || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: sales1 } = await supabase
      .from('dd-ventes')
      .select('date, total_net, total_brut, status, user_id')
      .eq('status', 'completed')
      .gte('date', period1Start)
      .lte('date', period1End)

    const { data: sales2 } = await supabase
      .from('dd-ventes')
      .select('date, total_net, total_brut, status, user_id')
      .eq('status', 'completed')
      .gte('date', period2Start)
      .lte('date', period2End)

    const { data: expenses1 } = await supabase
      .from('dd-depenses')
      .select('date, amount')
      .gte('date', period1Start)
      .lte('date', period1End)

    const { data: expenses2 } = await supabase
      .from('dd-depenses')
      .select('date, amount')
      .gte('date', period2Start)
      .lte('date', period2End)

    // Calculate metrics for both periods
    const sales1Array = sales1 || []
    const sales2Array = sales2 || []
    const expenses1Array = expenses1 || []
    const expenses2Array = expenses2 || []

    const period1Metrics = {
      totalSales: sales1Array.reduce((sum: number, s: any) => sum + (s.total_net || 0), 0),
      totalExpenses: expenses1Array.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      salesCount: sales1Array.length,
      averageBasket: sales1Array.length > 0 ? (sales1Array.reduce((sum: number, s: any) => sum + (s.total_net || 0), 0) / sales1Array.length) : 0,
      profit: 0
    }
    period1Metrics.profit = period1Metrics.totalSales - period1Metrics.totalExpenses

    const period2Metrics = {
      totalSales: sales2Array.reduce((sum: number, s: any) => sum + (s.total_net || 0), 0),
      totalExpenses: expenses2Array.reduce((sum: number, e: any) => sum + (e.amount || 0), 0),
      salesCount: sales2Array.length,
      averageBasket: sales2Array.length > 0 ? (sales2Array.reduce((sum: number, s: any) => sum + (s.total_net || 0), 0) / sales2Array.length) : 0,
      profit: 0
    }
    period2Metrics.profit = period2Metrics.totalSales - period2Metrics.totalExpenses

    // Calculate changes
    const changes = {
      sales: period1Metrics.totalSales - period2Metrics.totalSales,
      salesPercent: period2Metrics.totalSales > 0 
        ? ((period1Metrics.totalSales - period2Metrics.totalSales) / period2Metrics.totalSales) * 100 
        : 0,
      profit: period1Metrics.profit - period2Metrics.profit,
      profitPercent: period2Metrics.profit > 0 
        ? ((period1Metrics.profit - period2Metrics.profit) / period2Metrics.profit) * 100 
        : 0,
      count: period1Metrics.salesCount - period2Metrics.salesCount,
      countPercent: period2Metrics.salesCount > 0 
        ? ((period1Metrics.salesCount - period2Metrics.salesCount) / period2Metrics.salesCount) * 100 
        : 0,
      averageBasket: period1Metrics.averageBasket - period2Metrics.averageBasket,
      averageBasketPercent: period2Metrics.averageBasket > 0 
        ? ((period1Metrics.averageBasket - period2Metrics.averageBasket) / period2Metrics.averageBasket) * 100 
        : 0
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en analyse comparative de performance pour entreprises de beauté et cosmétiques.

Période 1 (${period1Start} à ${period1End}):
- Ventes totales: ${period1Metrics.totalSales.toFixed(0)} FCFA
- Dépenses totales: ${period1Metrics.totalExpenses.toFixed(0)} FCFA
- Profit: ${period1Metrics.profit.toFixed(0)} FCFA
- Nombre de ventes: ${period1Metrics.salesCount}
- Panier moyen: ${period1Metrics.averageBasket.toFixed(0)} FCFA

Période 2 (${period2Start} à ${period2End}):
- Ventes totales: ${period2Metrics.totalSales.toFixed(0)} FCFA
- Dépenses totales: ${period2Metrics.totalExpenses.toFixed(0)} FCFA
- Profit: ${period2Metrics.profit.toFixed(0)} FCFA
- Nombre de ventes: ${period2Metrics.salesCount}
- Panier moyen: ${period2Metrics.averageBasket.toFixed(0)} FCFA

Changements:
- Ventes: ${changes.sales > 0 ? '+' : ''}${changes.sales.toFixed(0)} FCFA (${changes.salesPercent > 0 ? '+' : ''}${changes.salesPercent.toFixed(1)}%)
- Profit: ${changes.profit > 0 ? '+' : ''}${changes.profit.toFixed(0)} FCFA (${changes.profitPercent > 0 ? '+' : ''}${changes.profitPercent.toFixed(1)}%)
- Nombre de ventes: ${changes.count > 0 ? '+' : ''}${changes.count} (${changes.countPercent > 0 ? '+' : ''}${changes.countPercent.toFixed(1)}%)
- Panier moyen: ${changes.averageBasket > 0 ? '+' : ''}${changes.averageBasket.toFixed(0)} FCFA (${changes.averageBasketPercent > 0 ? '+' : ''}${changes.averageBasketPercent.toFixed(1)}%)

Type de comparaison: ${comparisonType || 'periods'}

Tâches:
1. Compare les performances entre les deux périodes
2. Identifie les facteurs de changement (améliorations, déclins)
3. Analyse les causes probables des variations
4. Fait un benchmarking intelligent (comparaison avec standards du secteur si possible)
5. Propose des suggestions d'amélioration concrètes
6. Identifie les points forts et faibles

Réponds au format JSON strict suivant (sans markdown):
{
  "comparison": {
    "overallTrend": "improving|declining|stable",
    "keyChanges": [
      {
        "metric": "sales|profit|count|averageBasket",
        "change": "increase|decrease|stable",
        "magnitude": "significant|moderate|minor",
        "description": "Description du changement"
      }
    ]
  },
  "factors": [
    {
      "factor": "Description du facteur identifié",
      "impact": "positive|negative|neutral",
      "evidence": "Preuve ou indicateur"
    }
  ],
  "causes": [
    "Cause probable 1",
    "Cause probable 2",
    "Cause probable 3"
  ],
  "benchmarking": {
    "industryAverage": "Si disponible, moyenne du secteur",
    "position": "above|at|below",
    "notes": "Notes sur le benchmarking"
  },
  "strengths": [
    "Point fort identifié 1",
    "Point fort identifié 2"
  ],
  "weaknesses": [
    "Point faible identifié 1",
    "Point faible identifié 2"
  ],
  "improvementSuggestions": [
    {
      "suggestion": "Suggestion d'amélioration",
      "priority": "High|Medium|Low",
      "expectedImpact": "Description de l'impact attendu"
    }
  ],
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
        parsedResponse = {
          comparison: {
            overallTrend: changes.profit > 0 ? 'improving' : changes.profit < 0 ? 'declining' : 'stable',
            keyChanges: []
          },
          factors: [],
          causes: [],
          benchmarking: {},
          strengths: [],
          weaknesses: [],
          improvementSuggestions: [],
          insights: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        comparison: {
          overallTrend: changes.profit > 0 ? 'improving' : changes.profit < 0 ? 'declining' : 'stable',
          keyChanges: []
        },
        factors: [],
        causes: [],
        benchmarking: {},
        strengths: [],
        weaknesses: [],
        improvementSuggestions: [],
        insights: []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...parsedResponse,
        metrics: {
          period1: period1Metrics,
          period2: period2Metrics,
          changes
        },
        periods: {
          period1: { start: period1Start, end: period1End },
          period2: { start: period2Start, end: period2End }
        }
      }
    })
  } catch (error: any) {
    console.error('Error in performance comparison:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'analyse comparative' },
      { status: 500 }
    )
  }
}

