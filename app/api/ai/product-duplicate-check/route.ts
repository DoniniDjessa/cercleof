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

    // Fetch existing products for comparison
    const { data: existingProducts } = await supabase
      .from('dd-products')
      .select('id, name, description, brand, images, price')
      .eq('is_active', true)
      .limit(1000)

    if (!existingProducts || existingProducts.length === 0) {
      return NextResponse.json({
        duplicates: [],
        message: 'Aucun produit existant pour comparaison'
      })
    }

    // Prepare context for Gemini
    const productsContext = existingProducts.map((p: any) => ({
      id: p.id,
      name: p.name || '',
      description: p.description || '',
      brand: p.brand || '',
      price: p.price || 0
    }))

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en détection de doublons de produits cosmétiques.

Produit à vérifier:
- Nom: "${productData.name || ''}"
- Description: "${productData.description || ''}"
- Marque: "${productData.brand || ''}"
- Prix: ${productData.price || 0}

Produits existants dans la base de données:
${JSON.stringify(productsContext, null, 2)}

Tâches:
1. Compare le nouveau produit avec les produits existants
2. Détecte les doublons probables (même produit sous différents noms ou variations)
3. Analyse sémantique des noms et descriptions pour trouver des similarités
4. Calcule un score de similarité de 0 à 100 pour chaque produit similaire
5. Identifie les produits qui pourraient être le même (score > 70)

Réponds au format JSON strict suivant (sans markdown):
{
  "duplicates": [
    {
      "productId": "id du produit",
      "productName": "nom du produit",
      "similarityScore": 85,
      "reason": "Explication de la similarité"
    }
  ],
  "hasDuplicates": true/false,
  "message": "Message d'analyse"
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
        parsedResponse = { duplicates: [], hasDuplicates: false, message: 'Aucun doublon détecté' }
      }
    } catch (e) {
      parsedResponse = { duplicates: [], hasDuplicates: false, message: 'Erreur lors de l\'analyse' }
    }

    return NextResponse.json({
      duplicates: parsedResponse.duplicates || [],
      hasDuplicates: parsedResponse.hasDuplicates || false,
      message: parsedResponse.message || 'Analyse terminée'
    })
  } catch (error: any) {
    console.error('Error in duplicate check:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la détection de doublons' },
      { status: 500 }
    )
  }
}

