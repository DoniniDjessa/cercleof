import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, pseudo, first_name, last_name, phone, role, created_by } = body

    // Create a Supabase client with service role key for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if user already exists in dd-users
    const { data: existingProfile, error: checkError } = await supabase
      .from('dd-users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User with this email already exists in the system' },
        { status: 400 }
      )
    }

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authError) {
      return NextResponse.json(
        { error: 'Failed to create auth user: ' + authError.message },
        { status: 400 }
      )
    }

    // Create user profile
    const { data: newUser, error: profileError } = await supabase
      .from('dd-users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        pseudo,
        first_name,
        last_name,
        phone: phone || null,
        role,
        salary: 0,
        hire_date: null,
        created_by: created_by || null,
        is_active: true
      })
      .select()
      .single()

    if (profileError) {
      // If profile creation fails, try to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Failed to create user profile: ' + profileError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'User created successfully!'
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
