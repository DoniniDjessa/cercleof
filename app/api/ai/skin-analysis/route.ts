import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { image, userRole } = await request.json()

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Convert base64 image
    const base64Data = image.split(',')[1] || image
    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: 'image/jpeg'
      }
    }

    // Initialize Gemini model - using gemini-2.5-flash (supports images and multimodal)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Analyse cette image de peau et détecte les signes de sécheresse, de rougeurs et de manque d'éclat. 
Fournis un score de 1 à 10 pour chaque catégorie où 10 signifie très sévère.

Réponds UNIQUEMENT au format JSON suivant (pas de texte avant ou après):
{
  "secheresse_score": <nombre entre 1 et 10>,
  "rougeurs_score": <nombre entre 1 et 10>,
  "eclat_score": <nombre entre 1 et 10>,
  "interpretation_texte": "Une interprétation détaillée en français expliquant les résultats"
}`

    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    let analysis
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'analyse de la réponse de l\'IA' },
        { status: 500 }
      )
    }

    // Fetch products for recommendation based on analysis
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Recommend products based on scores
    let recommendedProducts: any[] = []

    if (analysis.secheresse_score >= 7) {
      // Need hydration products
      const { data: hydrationProducts } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:dd-categories(name)
        `)
        .eq('is_active', true)
        .eq('status', 'active')
        .ilike('name', '%hydratant%')
        .limit(3)

      if (hydrationProducts) {
        recommendedProducts.push(...hydrationProducts)
      }
    }

    if (analysis.rougeurs_score >= 6) {
      // Need soothing products
      const { data: soothingProducts } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:dd-categories(name)
        `)
        .eq('is_active', true)
        .eq('status', 'active')
        .or('name.ilike.%apaisant%,name.ilike.%calmant%,name.ilike.%sensible%')
        .limit(3)

      if (soothingProducts) {
        recommendedProducts.push(...soothingProducts)
      }
    }

    if (analysis.eclat_score >= 6) {
      // Need brightening products
      const { data: brighteningProducts } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:dd-categories(name)
        `)
        .eq('is_active', true)
        .eq('status', 'active')
        .or('name.ilike.%eclaircissant%,name.ilike.%eclat%,name.ilike.%illuminant%')
        .limit(3)

      if (brighteningProducts) {
        recommendedProducts.push(...brighteningProducts)
      }
    }

    // Remove duplicates
    const uniqueProducts = recommendedProducts.filter((product, index, self) =>
      index === self.findIndex((p) => p.id === product.id)
    )

    // If no products found, get general products
    if (uniqueProducts.length === 0) {
      const { data: generalProducts } = await supabase
        .from('dd-products')
        .select(`
          *,
          category:dd-categories(name)
        `)
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(5)

      if (generalProducts) {
        recommendedProducts = generalProducts
      }
    }

    return NextResponse.json({
      analysis,
      recommendedProducts: uniqueProducts.length > 0 ? uniqueProducts.slice(0, 6) : recommendedProducts.slice(0, 6)
    })
  } catch (error: any) {
    console.error('Error in skin analysis:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de l\'analyse de la peau' },
      { status: 500 }
    )
  }
}

