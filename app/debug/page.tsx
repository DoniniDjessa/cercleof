"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function DebugPage() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [userTableStatus, setUserTableStatus] = useState<string>('Testing...')
  const [sessionStatus, setSessionStatus] = useState<string>('Testing...')

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection
        const { data, error } = await supabase.from('dd-users').select('count').limit(1)
        if (error) {
          setConnectionStatus(`❌ Error: ${error.message}`)
        } else {
          setConnectionStatus('✅ Database connection successful')
        }
      } catch (err) {
        setConnectionStatus(`❌ Connection failed: ${err}`)
      }

      // Test user table
      try {
        const { data, error } = await supabase.from('dd-users').select('id').limit(1)
        if (error) {
          setUserTableStatus(`❌ dd-users table error: ${error.message}`)
        } else {
          setUserTableStatus('✅ dd-users table accessible')
        }
      } catch (err) {
        setUserTableStatus(`❌ dd-users table failed: ${err}`)
      }

      // Test session
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          setSessionStatus(`❌ Session error: ${error.message}`)
        } else {
          setSessionStatus(`✅ Session: ${session ? 'Logged in' : 'Not logged in'}`)
        }
      } catch (err) {
        setSessionStatus(`❌ Session failed: ${err}`)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Database Connection</h2>
          <p>{connectionStatus}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">dd-users Table</h2>
          <p>{userTableStatus}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Authentication Session</h2>
          <p>{sessionStatus}</p>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Environment Variables</h2>
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
          <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
        </div>
      </div>
    </div>
  )
}