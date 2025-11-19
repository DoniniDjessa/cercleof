import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Role-based permissions
const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: ['sales', 'clients', 'products', 'stock', 'finances', 'appointments', 'all'],
  admin: ['sales', 'clients', 'products', 'stock', 'finances', 'appointments', 'all'],
  manager: ['sales', 'clients', 'products', 'appointments'],
  caissiere: ['sales', 'products'],
  employee: ['products']
}

function canAccess(userRole: string, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes('all') || permissions.includes(resource)
}

export async function POST(request: NextRequest) {
  try {
    const { query, userRole } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const context: any = {}

    // Fetch relevant data based on query and permissions
    const lowerQuery = query.toLowerCase()

    // Sales data
    if (canAccess(userRole, 'sales') && (lowerQuery.includes('vendu') || lowerQuery.includes('vente') || lowerQuery.includes('ventes'))) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayEnd = tomorrow.toISOString()

      const { data: todaySales } = await supabase
        .from('dd-ventes')
        .select('total_net, created_at')
        .gte('created_at', todayStart)
        .lt('created_at', todayEnd)
        .eq('status', 'paye')

      const thisWeekStart = new Date(today)
      thisWeekStart.setDate(today.getDate() - today.getDay())
      thisWeekStart.setHours(0, 0, 0, 0)

      const { data: weekSales } = await supabase
        .from('dd-ventes')
        .select('total_net, created_at')
        .gte('created_at', thisWeekStart.toISOString())
        .eq('status', 'paye')

      context.todaySales = todaySales || []
      context.weekSales = weekSales || []
    }

    // Client data
    if (canAccess(userRole, 'clients') && (lowerQuery.includes('client'))) {
      const { data: clients } = await supabase
        .from('dd-clients')
        .select('id, first_name, last_name, total_spent')
        .eq('is_active', true)
        .limit(100)

      context.clients = clients || []

      // Get client sales if query mentions specific client
      const clientMatch = query.match(/client\s+(\w+)/i)
      if (clientMatch) {
        const clientName = clientMatch[1]
        const matchingClient = clients?.find(c => 
          c.first_name?.toLowerCase().includes(clientName.toLowerCase()) ||
          c.last_name?.toLowerCase().includes(clientName.toLowerCase())
        )

        if (matchingClient) {
          const thisWeekStart = new Date()
          thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
          thisWeekStart.setHours(0, 0, 0, 0)

          const { data: clientSales } = await supabase
            .from('dd-ventes')
            .select('total_net, created_at')
            .eq('client_id', matchingClient.id)
            .gte('created_at', thisWeekStart.toISOString())
            .eq('status', 'paye')

          context.clientSales = clientSales || []
          context.currentClient = matchingClient
        }
      }
    }

    // Product data
    if (canAccess(userRole, 'products') && (lowerQuery.includes('produit') || lowerQuery.includes('stock'))) {
      const { data: products } = await supabase
        .from('dd-products')
        .select('id, name, stock_quantity, price')
        .eq('is_active', true)
        .limit(200)

      context.products = products || []

      // Check for specific product
      if (lowerQuery.includes('gel') && lowerQuery.includes('dove')) {
        const doveProducts = products?.filter(p => 
          p.name.toLowerCase().includes('gel') && 
          p.name.toLowerCase().includes('dove') &&
          p.name.toLowerCase().includes('éclaircissant')
        )
        context.specificProducts = doveProducts || []
      }
    }

    // Financial data
    if (canAccess(userRole, 'finances') && (lowerQuery.includes('dépensé') || lowerQuery.includes('dépense'))) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = today.toISOString()
      
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const todayEnd = tomorrow.toISOString()

      const yesterdayStart = new Date(today)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      const yesterdayEnd = today.toISOString()

      const { data: todayExpenses } = await supabase
        .from('dd-depenses')
        .select('montant')
        .gte('date', todayStart)
        .lt('date', todayEnd)

      const { data: yesterdayExpenses } = await supabase
        .from('dd-depenses')
        .select('montant')
        .gte('date', yesterdayStart.toISOString())
        .lt('date', yesterdayEnd)

      context.todayExpenses = todayExpenses || []
      context.yesterdayExpenses = yesterdayExpenses || []
    }

    // Appointment data
    if (canAccess(userRole, 'appointments') && (lowerQuery.includes('rendez-vous') || lowerQuery.includes('rdv'))) {
      // Parse date from query (samedi, 14h-16h)
      const isSaturday = lowerQuery.includes('samedi') || lowerQuery.includes('saturday')
      const timeMatch = lowerQuery.match(/(\d{1,2})h.*(\d{1,2})h/)

      if (isSaturday) {
        const today = new Date()
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7
        const saturday = new Date(today)
        saturday.setDate(today.getDate() + daysUntilSaturday)
        
        let startTime = '14:00'
        let endTime = '16:00'
        
        if (timeMatch) {
          startTime = `${String(timeMatch[1]).padStart(2, '0')}:00`
          endTime = `${String(timeMatch[2]).padStart(2, '0')}:00`
        }

        const startDateTime = new Date(saturday)
        const [startH, startM] = startTime.split(':')
        startDateTime.setHours(parseInt(startH), parseInt(startM), 0, 0)

        const endDateTime = new Date(saturday)
        const [endH, endM] = endTime.split(':')
        endDateTime.setHours(parseInt(endH), parseInt(endM), 0, 0)

        const { data: appointments } = await supabase
          .from('dd-rdv')
          .select('*')
          .gte('date_rdv', startDateTime.toISOString())
          .lte('date_rdv', endDateTime.toISOString())

        context.appointments = appointments || []
      }
    }

    // Best selling products
    if (canAccess(userRole, 'products') && (lowerQuery.includes('meilleur') || lowerQuery.includes('top') || lowerQuery.includes('best'))) {
      const { data: saleItems } = await supabase
        .from('dd-ventes-items')
        .select('product_id, quantite')
        .not('product_id', 'is', null)

      const productSales: Record<string, number> = {}
      saleItems?.forEach((item: any) => {
        if (item.product_id) {
          productSales[item.product_id] = (productSales[item.product_id] || 0) + item.quantite
        }
      })

      const sortedProducts = Object.entries(productSales)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)

      const productIds = sortedProducts.map(([id]) => id)
      if (productIds.length > 0) {
        const { data: topProducts } = await supabase
          .from('dd-products')
          .select('id, name')
          .in('id', productIds)

        context.topProducts = topProducts?.map((p: any) => ({
          ...p,
          sales: productSales[p.id]
        })) || []
      } else {
        context.topProducts = []
      }
    }

    // Initialize Gemini model - using gemini-2.5-flash (latest recommended model)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Tu es un assistant business pour une entreprise de cosmétiques. 
L'utilisateur a le rôle: ${userRole}
Question de l'utilisateur: "${query}"

Données disponibles dans le contexte:
${JSON.stringify(context, null, 2)}

Réponds à la question en français de manière claire et concise. 
Si les données ne sont pas disponibles pour cette question (par manque de permissions ou données inexistantes), explique-le poliment.
Utilise les données du contexte pour fournir des réponses précises avec des chiffres réels.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({
      response: text
    })
  } catch (error: any) {
    console.error('Error in business query:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors du traitement de la requête' },
      { status: 500 }
    )
  }
}

