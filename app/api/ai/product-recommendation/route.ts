import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { query, userRole } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // Fetch all products from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: products, error } = await supabase
      .from('dd-products')
      .select(`
        *,
        category:dd-categories(name)
      `)
      .eq('is_active', true)
      .eq('status', 'active')

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des produits' },
        { status: 500 }
      )
    }

    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Aucun produit trouvé' },
        { status: 404 }
      )
    }

    // Create products context for Gemini
    const productsContext = products.map((p: any) => ({
      name: p.name || '',
      description: p.description || '',
      price: p.price || 0,
      category: (p.category as any)?.name || '',
      images: p.images || []
    }))

    // Initialize Gemini model - using gemini-2.5-flash (latest recommended model)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en cosmétiques et soins de la peau. 
L'utilisateur demande: "${query}"

Voici les produits disponibles dans notre base de données:
${JSON.stringify(productsContext, null, 2)}

Tâches:
1. Analyse la demande de l'utilisateur
2. Recommande le produit le plus approprié de notre base de données
3. Si aucun produit ne correspond exactement, suggère le produit le plus proche
4. Fournis une explication claire en français

Réponds au format JSON suivant:
{
  "response": "Ton explication textuelle détaillée de la recommandation",
  "productName": "Nom exact du produit recommandé (doit correspondre exactement à un nom dans la base de données)"
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let parsedResponse
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = { response: text, productName: null }
      }
    } catch (e) {
      parsedResponse = { response: text, productName: null }
    }

    // Find the recommended product
    let recommendedProduct = null
    if (parsedResponse.productName && Array.isArray(products)) {
      recommendedProduct = products.find(
        (p: any) => p.name?.toLowerCase().trim() === parsedResponse.productName.toLowerCase().trim()
      )
    }

    return NextResponse.json({
      response: parsedResponse.response,
      product: recommendedProduct || null
    })
  } catch (error: any) {
    console.error('Error in product recommendation:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération de la recommandation' },
      { status: 500 }
    )
  }
}

