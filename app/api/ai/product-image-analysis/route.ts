import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    // Check if Gemini API key is available
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not set')
      return NextResponse.json(
        { error: 'Configuration error: GEMINI_API_KEY is missing' },
        { status: 500 }
      )
    }

    const { imageBase64, userRole } = await request.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      )
    }

    // Validate base64 format
    if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      )
    }

    // Fetch available categories for matching
    let categoriesContext = ''
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: categories, error: categoriesError } = await supabase
        .from('dd-categories')
        .select('id, name, parent_id')
        .eq('type', 'product')
        .eq('is_active', true)

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      } else if (Array.isArray(categories)) {
        categoriesContext = categories.map((c: any) => c.name).join(', ')
      }
    } catch (supabaseError) {
      console.error('Error initializing Supabase:', supabaseError)
      // Continue without categories context
    }

    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant expert en cosmétiques et produits de beauté. 
Analyse cette image de produit cosmétique et extrais TOUTES les informations visibles sur l'emballage.

Instructions détaillées:
1. NOM DU PRODUIT: Identifie le nom complet du produit tel qu'écrit sur l'emballage (marque + nom exact du produit)
2. MARQUE: Identifie la marque/brand si visible
3. DESCRIPTION COMPLÈTE ET DÉTAILLÉE: 
   - Extrais TOUS les textes descriptifs visibles sur l'emballage
   - Inclus les ingrédients principaux/actifs mentionnés (ex: Alpha Arbutine, Collagène, etc.)
   - Inclus les indications d'utilisation et les promesses du produit
   - Inclus les bénéfices détaillés et comment le produit fonctionne
   - Inclus le mode d'emploi si visible
   - Rédige une description complète et professionnelle qui explique:
     * Ce que fait le produit (ex: "Ce gommage corporel revitalisant est conçu pour...")
     * Les ingrédients clés et leurs actions (ex: "Sa formule contient l'actif éclaircissant Alpha Arbutine 3 Plus...")
     * Comment il fonctionne (ex: "En exfoliant, il prépare la peau à mieux absorber ces actifs...")
     * Les résultats attendus (ex: "laissant la peau non seulement plus lisse et rafraîchie, mais aussi visiblement plus lumineuse...")
   - La description doit faire au minimum 2-3 paragraphes et être très détaillée
   - Sois exhaustif et inclus TOUT ce qui est lisible sur l'emballage
4. TRANCHE PRINCIPALE: Identifie la catégorie principale parmi: "Soin du visage", "Soin du corps", "Soin des cheveux", "Hygiène", "Solaire", "Parfum", "Maquillage". Si plusieurs sont possibles, choisis la plus appropriée.
5. FORME: Identifie la forme/texture du produit parmi: "Crème", "Gel", "Lotion", "Sérum", "Huile", "Masque", "Mousse", "Tonique", "Eau micellaire", "Gommage / Exfoliant", "Lait", "Beurre", "Baume", "Shampoing", "Après-shampoing", "Spray", "Crème coiffante", "Gel / Cire coiffante", "Huile de massage", "Bain moussant / Sels de bain", "Contour des yeux". Si plusieurs formes sont visibles, choisis la principale.
6. BÉNÉFICES: Identifie TOUS les bénéfices/propriétés mentionnés parmi: "Hydratant", "Nourrissant", "Purifiant", "Anti-âge", "Éclaircissant", "Apaisant", "Matifiant", "Réparateur", "Anti-taches", "Démaquillant", "Raffermissant", "Exfoliant", "Régénérant", "Anti-vergetures", "Nettoyant", "Anti-chute", "Lissant", "Volume", "Brillance", "Anti-frisottis". Liste TOUS ceux qui sont visibles ou déduits de la description.
7. TYPES DE PEAU: Identifie les types de peau ciblés si mentionnés: "Peau normale", "Peau sèche", "Peau grasse", "Peau mixte", "Peau sensible", "Peau mature", "Peau déshydratée", "Peau sujette à l'acné", "Peau hyperpigmentée"
8. CATÉGORIE: Identifie la catégorie exacte (parmi: ${categoriesContext || 'Hygiène, Soin du visage, Soin du corps, Soin des cheveux, Solaire'})
9. SKU: Extrais le SKU, code produit ou référence si visible
10. VOLUME: Identifie le volume/poids si visible (ex: '200ml', '50g', '100ml')

Réponds AU FORMAT JSON STRICT suivant (ne mets pas de markdown, juste du JSON pur):
{
  "name": "Nom exact du produit tel qu'écrit sur l'emballage",
  "brand": "Nom de la marque",
  "description": "DESCRIPTION COMPLÈTE ET DÉTAILLÉE EN 2-3 PARAGRAPHES - Explique ce que fait le produit, ses ingrédients clés et leurs actions, comment il fonctionne, et les résultats attendus. Inclus tous les textes descriptifs visibles sur l'emballage. Sois très exhaustif et professionnel.",
  "tranchePrincipale": "Tranche principale (parmi: Soin du visage, Soin du corps, Soin des cheveux, Hygiène, Solaire, Parfum, Maquillage) - chaîne vide si non identifiable",
  "form": "Forme du produit (parmi: Crème, Gel, Lotion, Sérum, Huile, Masque, Mousse, Tonique, Eau micellaire, Gommage / Exfoliant, Lait, Beurre, Baume, Shampoing, Après-shampoing, Spray, Crème coiffante, Gel / Cire coiffante, Huile de massage, Bain moussant / Sels de bain, Contour des yeux) - chaîne vide si non identifiable",
  "benefits": ["Bénéfice 1", "Bénéfice 2", etc. - liste TOUS les bénéfices visibles ou déduits, tableau vide si aucun],
  "category": "Nom de la catégorie la plus appropriée (doit correspondre à: ${categoriesContext || 'Hygiène, Soin du visage, Soin du corps, Soin des cheveux, Solaire'})",
  "skinTypes": ["Peau normale", "Peau sèche", etc. - tableau vide si non mentionné],
  "sku": "SKU ou code si visible - chaîne vide si non visible",
  "volume": "Volume/poids si visible (ex: '200ml', '50g') - chaîne vide si non visible"
}

IMPORTANT: 
- La description DOIT être très complète, détaillée, en 2-3 paragraphes minimum, expliquant ce que fait le produit, ses ingrédients, comment il fonctionne et les résultats
- Si une information n'est pas visible, utilise une chaîne vide "" ou un tableau vide []
- Le nom doit être aussi précis que possible
- La tranche principale et la forme doivent correspondre EXACTEMENT aux valeurs listées ci-dessus
- Les bénéfices doivent être extraits depuis le texte visible ou déduits de la description du produit`

    // Convert base64 to the format expected by Gemini
    let base64Data: string
    let mimeType: string = 'jpeg'

    try {
      // Remove data URL prefix if present
      if (imageBase64.includes(',')) {
        const parts = imageBase64.split(',')
        base64Data = parts[1]
        const mimeMatch = parts[0].match(/data:image\/(png|jpeg|jpg|webp)/)
        if (mimeMatch) {
          mimeType = mimeMatch[1] === 'jpg' ? 'jpeg' : mimeMatch[1]
        }
      } else {
        // Assume it's already base64 without prefix
        base64Data = imageBase64
      }

      // Validate base64 data
      if (!base64Data || base64Data.length < 100) {
        return NextResponse.json(
          { error: 'Invalid base64 image data' },
          { status: 400 }
        )
      }
    } catch (parseError) {
      console.error('Error parsing base64 image:', parseError)
      return NextResponse.json(
        { error: 'Error processing image data' },
        { status: 400 }
      )
    }

    // Call Gemini API
    let result
    try {
      result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: `image/${mimeType}`,
          },
        },
        { text: prompt },
      ])
    } catch (geminiError: any) {
      console.error('Gemini API error:', geminiError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de l\'appel à l\'API Gemini',
          details: geminiError.message || 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Get response from Gemini
    let text: string
    try {
      const response = await result.response
      text = response.text()
    } catch (responseError: any) {
      console.error('Error getting Gemini response:', responseError)
      return NextResponse.json(
        { 
          error: 'Erreur lors de la récupération de la réponse Gemini',
          details: responseError.message || 'Unknown error'
        },
        { status: 500 }
      )
    }

    // Parse JSON from response (may be wrapped in markdown code blocks)
    let parsedResponse
    try {
      // Remove markdown code blocks if present
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        console.warn('No JSON found in Gemini response, using defaults')
        parsedResponse = {
          name: '',
          brand: '',
          description: '',
          tranchePrincipale: '',
          form: '',
          benefits: [],
          category: '',
          skinTypes: [],
          sku: '',
          volume: '',
        }
      }
    } catch (parseError: any) {
      console.error('Error parsing Gemini response:', parseError)
      console.error('Response text:', text.substring(0, 500))
      parsedResponse = {
        name: '',
        brand: '',
        description: '',
        tranchePrincipale: '',
        form: '',
        benefits: [],
        category: '',
        skinTypes: [],
        sku: '',
        volume: '',
      }
    }

    return NextResponse.json({
      success: true,
      data: parsedResponse,
    })
  } catch (error: any) {
    console.error('Error in product image analysis:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Erreur lors de l\'analyse de l\'image',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

