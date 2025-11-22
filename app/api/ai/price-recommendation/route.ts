import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { productData, userRole } = await request.json()

    if (!productData) {
      return NextResponse.json(
        { error: 'Product data is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch similar products for price comparison
    const { data: similarProducts } = await supabase
      .from('dd-products')
      .select('id, name, price, cost, category_id, brand')
      .eq('is_active', true)
      .eq('status', 'active')
      .limit(50)

    // Get category info if available
    let categoryInfo = null
    if (productData.category_id) {
      const { data: category } = await supabase
        .from('dd-categories')
        .select('id, name')
        .eq('id', productData.category_id)
        .single()
      categoryInfo = category
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const similarProductsContext = (similarProducts || [])
      .filter((p: any) => {
        // Filter by category if available
        if (productData.category_id && p.category_id) {
          return p.category_id === productData.category_id
        }
        // Or filter by brand
        if (productData.brand && p.brand) {
          return p.brand.toLowerCase() === productData.brand.toLowerCase()
        }
        return true
      })
      .slice(0, 10)
      .map((p: any) => ({
        name: p.name || '',
        price: p.price || 0,
        cost: p.cost || 0,
        brand: p.brand || ''
      }))

    const prompt = `Tu es un assistant expert en stratégie de prix pour produits cosmétiques et de beauté.

Produit à analyser:
- Nom: "${productData.name || ''}"
- Description: "${productData.description || ''}"
- Marque: "${productData.brand || ''}"
- Catégorie: "${categoryInfo?.name || 'Non spécifiée'}"
- Coût de revient: ${productData.cost || 0} FCFA
- Prix actuel proposé: ${productData.price || 0} FCFA

Produits similaires dans la base:
${JSON.stringify(similarProductsContext, null, 2)}

Tâches:
1. Analyse les prix similaires dans la base de données
2. Calcule un prix recommandé basé sur:
   - La marge cible standard (50-70% pour cosmétiques)
   - Les prix du marché (produits similaires)
   - Le positionnement du produit
3. Détecte si le prix proposé est anormalement bas ou élevé
4. Recommande des promotions potentielles si approprié
5. Calcule la marge pour le prix recommandé

Réponds au format JSON strict suivant (sans markdown):
{
  "recommendedPrice": 5000,
  "currentPrice": ${productData.price || 0},
  "cost": ${productData.cost || 0},
  "recommendedMargin": 65,
  "marketAveragePrice": 5500,
  "priceAssessment": "normal|low|high",
  "priceRationale": "Explication détaillée du prix recommandé",
  "promotionSuggestions": [
    {
      "type": "pourcentage|fixe",
      "amount": 10,
      "reason": "Raison de la promotion suggérée"
    }
  ],
  "warnings": ["Liste des alertes si prix anormal"],
  "comparisonData": {
    "similarProductsCount": ${similarProductsContext.length},
    "averagePrice": 5500,
    "minPrice": 4000,
    "maxPrice": 7000
  }
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
        // Fallback calculation
        const cost = productData.cost || 0
        const recommendedMargin = 0.65
        parsedResponse = {
          recommendedPrice: Math.round(cost * (1 + recommendedMargin)),
          currentPrice: productData.price || 0,
          cost: cost,
          recommendedMargin: 65,
          priceAssessment: 'normal',
          priceRationale: 'Prix calculé avec marge standard de 65%',
          promotionSuggestions: [],
          warnings: [],
          comparisonData: {
            similarProductsCount: similarProductsContext.length,
            averagePrice: 0,
            minPrice: 0,
            maxPrice: 0
          }
        }
      }
    } catch (e) {
      console.error('Error parsing AI response:', e)
      // Fallback calculation
      const cost = productData.cost || 0
      parsedResponse = {
        recommendedPrice: Math.round(cost * 1.65),
        currentPrice: productData.price || 0,
        cost: cost,
        recommendedMargin: 65,
        priceAssessment: 'normal',
        priceRationale: 'Prix calculé avec marge standard de 65%',
        promotionSuggestions: [],
        warnings: [],
        comparisonData: {
          similarProductsCount: similarProductsContext.length,
          averagePrice: 0,
          minPrice: 0,
          maxPrice: 0
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse
    })
  } catch (error: any) {
    console.error('Error in price recommendation:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la recommandation de prix' },
      { status: 500 }
    )
  }
}

