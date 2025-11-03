'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { auth } from '@/lib/auth'
import { AuthLoader } from '@/components/ui/beauty-loader'
import { createClient } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>
  signIn: (emailOrPseudo: string, password: string) => Promise<{ data: any; error: any }>
  signOut: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('AuthContext: Timeout reached, stopping loading...')
      setLoading(false)
    }, 10000) // 10 second timeout

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session...')
        const { session, error } = await auth.getSession()
        console.log('AuthContext: Session result:', { session: !!session, error })
        
        if (session?.user) {
          try {
            // Check if user exists in our dd-users table
            const userExists = await checkUserExists(session.user.id)
            if (!userExists) {
              console.log('AuthContext: User not found in dd-users, redirecting to login...')
              setSession(null)
              setUser(null)
              setLoading(false)
              clearTimeout(timeoutId)
              await auth.signOut()
              // Redirect to login page
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
              return
            }
          } catch (checkError) {
            console.error('AuthContext: Error checking user existence:', checkError)
            // Continue with session even if check fails
          }
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        clearTimeout(timeoutId)
      } catch (error) {
        console.error('AuthContext: Error getting session:', error)
        setLoading(false)
        clearTimeout(timeoutId)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state change:', event, !!session)
      
      // Handle sign out event
      if (event === 'SIGNED_OUT' || !session) {
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }
      
      if (session?.user) {
        // Check if user exists in our dd-users table
        const userExists = await checkUserExists(session.user.id)
        if (!userExists) {
          console.log('AuthContext: User not found in dd-users, redirecting to login...')
          setSession(null)
          setUser(null)
          setLoading(false)
          await auth.signOut()
          // Redirect to login page
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return
        }
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const checkUserExists = async (userId: string): Promise<boolean> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dd-users')
        .select('id, pseudo, email')
        .eq('auth_user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No rows found - user doesn't exist in our system
        return false
      }
      
      if (error) {
        console.error('AuthContext: Error checking user existence:', error)
        return false
      }
      
      // User exists but check if they have pseudo or email
      if (data && !data.pseudo && !data.email) {
        console.log('AuthContext: User exists but has no pseudo or email')
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('AuthContext: Error checking user existence:', error)
      return false
    }
  }

  const signUp = async (email: string, password: string) => {
    const result = await auth.signUp(email, password)
    
    // If sign up is successful, try to link with existing profile
    if (result.data?.user && !result.error) {
      try {
        const supabase = createClient()
        const { error: linkError } = await supabase
          .from('dd-users')
          .update({ 
            auth_user_id: result.data.user.id,
            is_active: true 
          })
          .eq('email', email)
          .is('auth_user_id', null)

        if (linkError) {
          console.log('No existing profile found to link, user will need to complete setup')
        } else {
          console.log('Successfully linked existing profile with auth user')
        }
      } catch (error) {
        console.error('Error linking profile:', error)
      }
    }
    
    return result
  }

  const signIn = async (emailOrPseudo: string, password: string) => {
    return await auth.signIn(emailOrPseudo, password)
  }

  const signOut = async () => {
    try {
      // Immediately clear local state
      setSession(null)
      setUser(null)
      
      // Sign out from Supabase
      const { error } = await auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
        return { error }
      }
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, clear local state
      setSession(null)
      setUser(null)
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return { error }
    }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  if (loading) {
    return <AuthLoader />
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
