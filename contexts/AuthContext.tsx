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

// Function to clean up app-specific data from localStorage
const cleanupAppData = async () => {
  if (typeof window === 'undefined') return
  
  try {
    console.log('AuthContext: Cleaning up app data...')
    
    // Get Supabase URL to identify app-specific keys
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      const url = new URL(supabaseUrl)
      const host = url.hostname
      
      // Remove all localStorage keys related to Supabase/auth for this app
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          // Remove Supabase auth tokens and session data
          if (
            key.includes('supabase') ||
            key.includes('auth-token') ||
            key.includes('sb-') ||
            key.includes(host)
          ) {
            keysToRemove.push(key)
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        console.log('AuthContext: Removed localStorage key:', key)
      })
    }
    
    // Clean sessionStorage too (app-specific)
    const sessionKeysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && (key.includes('supabase') || key.includes('auth-token') || key.includes('sb-'))) {
        sessionKeysToRemove.push(key)
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      console.log('AuthContext: Removed sessionStorage key:', key)
    })
    
    console.log('AuthContext: App data cleanup complete')
  } catch (error) {
    console.error('AuthContext: Error cleaning up app data:', error)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthContext: Getting initial session...')
        const { session, error } = await auth.getSession()
        console.log('AuthContext: Session result:', { session: !!session, error })
        
        if (error) {
          console.error('AuthContext: Error getting session:', error)
          setSession(null)
          setUser(null)
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
          // Redirect to login on error
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          return
        }

        if (!session || !session.user) {
          console.log('AuthContext: No session found, redirecting to login...')
          setSession(null)
          setUser(null)
          setLoading(false)
          if (timeoutId) clearTimeout(timeoutId)
          // Force redirect to login
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
              window.location.replace('/login')
            }
          }
          return
        }
        
        if (session?.user) {
          try {
            // Check if user exists in our dd-users table with a shorter timeout (2 seconds)
            const checkPromise = checkUserExists(session.user.id)
            const timeoutPromise = new Promise<boolean>((resolve) => 
              setTimeout(() => {
                console.log('AuthContext: User check timeout (2s), user not verifiable')
                resolve(false)
              }, 2000) // 2 second timeout for faster disconnection
            )
            
            const userExists = await Promise.race([checkPromise, timeoutPromise])
            
            if (!userExists) {
              console.log('AuthContext: User not found in dd-users or timeout, disconnecting immediately...')
              // Clear state immediately
              setSession(null)
              setUser(null)
              setLoading(false)
              if (timeoutId) clearTimeout(timeoutId)
              
              // Force redirect immediately
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname
                if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
                  window.location.replace('/login')
                }
              }
              
              // Clean up in background
              cleanupAppData().catch(err => console.error('Error cleaning up:', err))
              auth.signOut().catch(err => console.error('Error signing out:', err))
              return
            }
          } catch (checkError) {
            console.error('AuthContext: Error checking user existence:', checkError)
            // On error, disconnect to be safe
            console.log('AuthContext: Error during check, disconnecting...')
            // Clear state immediately
            setSession(null)
            setUser(null)
            setLoading(false)
            if (timeoutId) clearTimeout(timeoutId)
            
            // Force redirect immediately
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname
              if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
                window.location.replace('/login')
              }
            }
            
            // Clean up in background
            cleanupAppData().catch(err => console.error('Error cleaning up:', err))
            auth.signOut().catch(err => console.error('Error signing out:', err))
            return
          }
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        if (timeoutId) clearTimeout(timeoutId)
      } catch (error) {
        console.error('AuthContext: Error getting session:', error)
        setSession(null)
        setUser(null)
        setLoading(false)
        if (timeoutId) clearTimeout(timeoutId)
        // Redirect to login on error
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    getInitialSession()
    
    // Add a timeout to prevent infinite loading (reduced to 5 seconds for faster response)
    timeoutId = setTimeout(async () => {
      console.log('AuthContext: Timeout reached (5s), checking session and user status...')
      
      // Re-check session after timeout
      try {
        const { session: currentSession } = await auth.getSession()
        
        // If no session after timeout, user is not verifiable - disconnect immediately
        if (!currentSession || !currentSession.user) {
          console.log('AuthContext: No session after timeout, disconnecting immediately...')
          // Clear state immediately
          setSession(null)
          setUser(null)
          setLoading(false)
          
          // Force redirect immediately
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
              window.location.replace('/login')
            }
          }
          
          // Clean up in background
          cleanupAppData().catch(err => console.error('Error cleaning up:', err))
          auth.signOut().catch(err => console.error('Error signing out:', err))
          return
        }
        
        // Always verify user exists in dd-users, even if we have a session
        if (currentSession.user) {
          try {
            // Quick check with 2 second timeout
            const checkPromise = checkUserExists(currentSession.user.id)
            const timeoutPromise = new Promise<boolean>((resolve) => 
              setTimeout(() => {
                console.log('AuthContext: User check timeout in timeout handler, user not verifiable')
                resolve(false)
              }, 2000)
            )
            const userExists = await Promise.race([checkPromise, timeoutPromise])
            
            // If user doesn't exist, disconnect immediately
            if (!userExists) {
              console.log('AuthContext: User not found in dd-users after timeout - disconnecting immediately...')
              // Clear state immediately
              setSession(null)
              setUser(null)
              setLoading(false)
              
              // Force redirect immediately
              if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname
                if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
                  window.location.replace('/login')
                }
              }
              
              // Clean up in background
              cleanupAppData().catch(err => console.error('Error cleaning up:', err))
              auth.signOut().catch(err => console.error('Error signing out:', err))
              return
            }
          } catch (checkError) {
            console.error('AuthContext: Error checking user after timeout:', checkError)
            // If check fails, disconnect to be safe
            // Clear state immediately
            setSession(null)
            setUser(null)
            setLoading(false)
            
            // Force redirect immediately
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname
              if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
                window.location.replace('/login')
              }
            }
            
            // Clean up in background
            cleanupAppData().catch(err => console.error('Error cleaning up:', err))
            auth.signOut().catch(err => console.error('Error signing out:', err))
            return
          }
        }
        
        // If we reach here, we have a valid session and verified user - just stop loading
        console.log('AuthContext: Valid session and verified user found after timeout, stopping loading...')
        setLoading(false)
      } catch (timeoutError) {
        console.error('AuthContext: Error checking session after timeout:', timeoutError)
        // On error, disconnect to be safe
        // Clear state immediately
        setSession(null)
        setUser(null)
        setLoading(false)
        
        // Force redirect immediately
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
            window.location.replace('/login')
          }
        }
        
        // Clean up in background
        cleanupAppData().catch(err => console.error('Error cleaning up:', err))
        auth.signOut().catch(err => console.error('Error signing out:', err))
      }
    }, 5000) // 5 second timeout (reduced from 10s for faster response)

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
        try {
          // Check if user exists in our dd-users table with timeout
          const checkPromise = checkUserExists(session.user.id)
          const timeoutPromise = new Promise<boolean>((resolve) => 
            setTimeout(() => {
              console.log('AuthContext: User check timeout in onAuthStateChange, user not verifiable')
              resolve(false)
            }, 2000) // 2 second timeout
          )
          
          const userExists = await Promise.race([checkPromise, timeoutPromise])
          
          if (!userExists) {
            console.log('AuthContext: User not found in dd-users (SIGNED_IN), disconnecting immediately...')
            // Clear state immediately
            setSession(null)
            setUser(null)
            setLoading(false)
            
            // Force redirect immediately (don't wait for cleanup)
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname
              if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
                // Redirect immediately without waiting
                window.location.replace('/login')
              }
            }
            
            // Clean up in background
            cleanupAppData().catch(err => console.error('Error cleaning up:', err))
            auth.signOut().catch(err => console.error('Error signing out:', err))
            return
          }
        } catch (checkError) {
          console.error('AuthContext: Error checking user in onAuthStateChange:', checkError)
          // On error, disconnect to be safe
          console.log('AuthContext: Error during check in onAuthStateChange, disconnecting...')
          // Clear state immediately
          setSession(null)
          setUser(null)
          setLoading(false)
          
          // Force redirect immediately
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname
            if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/setup') {
              window.location.replace('/login')
            }
          }
          
          // Clean up in background
          cleanupAppData().catch(err => console.error('Error cleaning up:', err))
          auth.signOut().catch(err => console.error('Error signing out:', err))
          return
        }
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
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
      console.log('AuthContext: signOut called')
      // Immediately clear local state
      setSession(null)
      setUser(null)
      
      // Clean up app data
      await cleanupAppData()
      
      // Sign out from Supabase (even if user is null)
      try {
        const { error } = await auth.signOut()
        if (error) {
          console.error('Error signing out from Supabase:', error)
        }
      } catch (signOutError) {
        console.error('Exception signing out from Supabase:', signOutError)
      }
      
      // Always redirect to login page, even if signOut fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, clear local state and redirect
      setSession(null)
      setUser(null)
      await cleanupAppData()
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
