import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { userRole } = await request.json()

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

    // Fetch current data for analysis
    const now = new Date()
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Fetch products with low stock
    const { data: lowStockProducts } = await supabase
      .from('dd-products')
      .select('id, name, stock_quantity, price')
      .eq('is_active', true)
      .eq('status', 'active')
      .lte('stock_quantity', 10)
      .limit(20)

    // Fetch recent sales
    const { data: recentSales } = await supabase
      .from('dd-ventes')
      .select('date, total_net, status')
      .eq('status', 'completed')
      .gte('date', last7Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Fetch sales from previous period for comparison
    const { data: previousSales } = await supabase
      .from('dd-ventes')
      .select('date, total_net, status')
      .eq('status', 'completed')
      .gte('date', new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lt('date', last7Days.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Calculate metrics
    const recentTotal = recentSales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
    const previousTotal = previousSales?.reduce((sum, s) => sum + (s.total_net || 0), 0) || 0
    const recentCount = recentSales?.length || 0
    const previousCount = previousSales?.length || 0
    const salesChange = previousTotal > 0 ? ((recentTotal - previousTotal) / previousTotal) * 100 : 0
    const countChange = previousCount > 0 ? ((recentCount - previousCount) / previousCount) * 100 : 0

    // Fetch products with no sales in last 30 days
    const { data: products } = await supabase
      .from('dd-products')
      .select('id, name, stock_quantity, price, created_at')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(50)

    const { data: allSalesItems } = await supabase
      .from('dd-ventes-items')
      .select('product_id')
      .gte('created_at', last30Days.toISOString())

    const soldProductIds = new Set(allSalesItems?.map((item: any) => item.product_id) || [])
    const unsoldProducts = products?.filter((p: any) => !soldProductIds.has(p.id)) || []

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en détection d'alertes proactives pour entreprises de beauté et cosmétiques.

Analyse les données suivantes et détecte les anomalies et opportunités:

Produits en stock faible (${lowStockProducts?.length || 0}):
${JSON.stringify(lowStockProducts?.slice(0, 10).map((p: any) => ({
  name: p.name,
  stock: p.stock_quantity,
  price: p.price
})), null, 2)}

Produits sans ventes (30 derniers jours, ${unsoldProducts?.length || 0}):
${JSON.stringify(unsoldProducts?.slice(0, 10).map((p: any) => ({
  name: p.name,
  stock: p.stock_quantity,
  price: p.price
})), null, 2)}

Performances des ventes:
- 7 derniers jours: ${recentTotal.toFixed(0)} FCFA (${recentCount} ventes)
- 7 jours précédents: ${previousTotal.toFixed(0)} FCFA (${previousCount} ventes)
- Variation des ventes: ${salesChange > 0 ? '+' : ''}${salesChange.toFixed(1)}%
- Variation du nombre de ventes: ${countChange > 0 ? '+' : ''}${countChange.toFixed(1)}%

Tâches:
1. Détecte les anomalies (stock faible, ventes en baisse, produits dormants, etc.)
2. Identifie les opportunités (produits populaires, tendances, etc.)
3. Priorise les alertes par importance (High, Medium, Low)
4. Suggère des actions préventives pour chaque alerte
5. Génère un résumé quotidien des alertes importantes

Réponds au format JSON strict suivant (sans markdown):
{
  "alerts": [
    {
      "type": "low_stock|sales_decline|unsold_product|opportunity|anomaly",
      "severity": "High|Medium|Low",
      "priority": 1,
      "title": "Titre de l'alerte",
      "description": "Description détaillée de l'alerte",
      "affectedItems": ["Item 1", "Item 2"],
      "preventiveActions": [
        {
          "action": "Action recommandée",
          "urgency": "Immediate|Soon|Later",
          "expectedImpact": "Description de l'impact"
        }
      ],
      "data": {
        "currentValue": "Valeur actuelle",
        "threshold": "Seuil ou valeur de référence",
        "trend": "increasing|decreasing|stable"
      }
    }
  ],
  "opportunities": [
    {
      "type": "promotion|restock|upsell|marketing",
      "title": "Titre de l'opportunité",
      "description": "Description de l'opportunité",
      "potentialImpact": "Description de l'impact potentiel",
      "recommendedAction": "Action recommandée",
      "priority": "High|Medium|Low"
    }
  ],
  "dailySummary": {
    "criticalAlerts": 2,
    "importantAlerts": 5,
    "summary": "Résumé quotidien des alertes importantes",
    "recommendedFocus": "Points sur lesquels se concentrer aujourd'hui"
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
        // Fallback alerts based on data
        const alerts: any[] = []
        
        if (lowStockProducts && lowStockProducts.length > 0) {
          alerts.push({
            type: 'low_stock',
            severity: lowStockProducts.length > 5 ? 'High' : 'Medium',
            priority: 1,
            title: `Stock faible pour ${lowStockProducts.length} produit(s)`,
            description: `${lowStockProducts.length} produit(s) ont un stock inférieur ou égal à 10 unités`,
            affectedItems: lowStockProducts.slice(0, 5).map((p: any) => p.name),
            preventiveActions: [{
              action: 'Réapprovisionner les produits en stock faible',
              urgency: 'Soon',
              expectedImpact: 'Évite les ruptures de stock'
            }],
            data: {
              currentValue: `${lowStockProducts.length} produits`,
              threshold: '10 unités',
              trend: 'decreasing'
            }
          })
        }

        if (salesChange < -20) {
          alerts.push({
            type: 'sales_decline',
            severity: 'High',
            priority: 2,
            title: 'Baisse significative des ventes',
            description: `Les ventes ont baissé de ${Math.abs(salesChange).toFixed(1)}% par rapport à la période précédente`,
            affectedItems: [],
            preventiveActions: [{
              action: 'Analyser les causes de la baisse et mettre en place des actions correctives',
              urgency: 'Immediate',
              expectedImpact: 'Stabilise ou améliore les ventes'
            }],
            data: {
              currentValue: `${salesChange.toFixed(1)}%`,
              threshold: '-20%',
              trend: 'decreasing'
            }
          })
        }

        if (unsoldProducts && unsoldProducts.length > 0) {
          alerts.push({
            type: 'unsold_product',
            severity: 'Medium',
            priority: 3,
            title: `Produits sans ventes (30 jours)`,
            description: `${unsoldProducts.length} produit(s) n'ont pas été vendus dans les 30 derniers jours`,
            affectedItems: unsoldProducts.slice(0, 5).map((p: any) => p.name),
            preventiveActions: [{
              action: 'Envisager des promotions ou mettre en avant ces produits',
              urgency: 'Soon',
              expectedImpact: 'Augmente les ventes et réduit les stocks dormants'
            }],
            data: {
              currentValue: `${unsoldProducts.length} produits`,
              threshold: '0 ventes',
              trend: 'stable'
            }
          })
        }

        parsedResponse = {
          alerts,
          opportunities: [],
          dailySummary: {
            criticalAlerts: alerts.filter(a => a.severity === 'High').length,
            importantAlerts: alerts.length,
            summary: `${alerts.length} alerte(s) détectée(s)`,
            recommendedFocus: alerts.length > 0 ? alerts[0].title : 'Aucune alerte critique'
          },
          insights: []
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      parsedResponse = {
        alerts: [],
        opportunities: [],
        dailySummary: {
          criticalAlerts: 0,
          importantAlerts: 0,
          summary: 'Aucune alerte détectée',
          recommendedFocus: 'Surveiller les métriques clés'
        },
        insights: []
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse
    })
  } catch (error: any) {
    console.error('Error in smart alerts:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération des alertes' },
      { status: 500 }
    )
  }
}

