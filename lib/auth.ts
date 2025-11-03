import { createClient } from './supabase'
import { User, Session } from '@supabase/supabase-js'

export interface AuthUser extends User {}

export interface AuthSession extends Session {}

export const auth = {
  // Sign up with email and password
  async signUp(email: string, password: string) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with email or pseudo and password
  async signIn(emailOrPseudo: string, password: string) {
    const supabase = createClient()
    // Try to sign in with email first
    let { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrPseudo,
      password,
    })

    if (error && error.message.includes('Invalid login credentials')) {
      // If email fails, try to find user by pseudo and then sign in with email
      const { data: userProfile, error: profileError } = await supabase
        .from('dd-users')
        .select('email')
        .eq('pseudo', emailOrPseudo)
        .single()

      if (profileError || !userProfile) {
        return { data: null, error: new Error('Invalid login credentials') }
      }

      // Sign in with the found email
      return supabase.auth.signInWithPassword({
        email: userProfile.email,
        password,
      })
    }

    return { data, error }
  },

  // Sign out
  async signOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  async getSession() {
    const supabase = createClient()
    console.log('Auth: Getting session...')
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log('Auth: Session result:', { session: !!session, error })
    return { session, error }
  },

  // Get current user
  async getUser() {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    const supabase = createClient()
    return supabase.auth.onAuthStateChange(callback)
  }
}
