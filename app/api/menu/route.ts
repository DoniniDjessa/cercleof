import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Public API - no authentication required
// Returns all menu data including videos and images
// Uses service role key server-side to bypass RLS

export async function GET() {
  try {
    // Use service role key to bypass RLS (server-side only, not exposed to client)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
    
    console.log('Fetching menu data with ID:', MENU_DATA_ID)
    
    const { data, error } = await supabase
      .from('dd-menu')
      .select('*')
      .eq('id', MENU_DATA_ID)
      .single()

    if (error) {
      console.error('Error fetching menu data:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      
      // If record doesn't exist, return empty array
      if (error.code === 'PGRST116') {
        console.log('Record not found - returning empty array')
        return NextResponse.json({
          menuData: [],
          lastUpdated: null,
          success: true,
          message: 'No menu data found in database'
        })
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch menu data', 
          details: error.message,
          code: error.code,
          success: false
        },
        { status: 500 }
      )
    }

    console.log('Menu data fetched successfully')
    console.log('Data exists:', !!data)
    console.log('Data.data type:', typeof data?.data)
    console.log('Data.data is array:', Array.isArray(data?.data))
    console.log('Data.data length:', Array.isArray(data?.data) ? data.data.length : 'N/A')

    // Return all menu data including videos and images
    return NextResponse.json({
      menuData: data?.data || [],
      lastUpdated: data?.updated_at || null,
      success: true
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  } catch (error: any) {
    console.error('Unexpected error fetching menu data:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        success: false
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

