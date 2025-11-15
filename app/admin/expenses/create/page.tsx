"use client"

import { AddExpense } from "@/components/financial/add-expense"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

export default function CreateExpensePage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCurrentUserRole = async () => {
      if (!authUser) {
        setLoading(false)
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('dd-users')
          .select('role')
          .eq('auth_user_id', authUser.id)
          .single()

        if (error) throw error

        const role = data?.role || ''
        setIsAdmin(role === 'admin' || role === 'superadmin')
      } catch (error) {
        console.error('Error fetching user role:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUserRole()
  }, [authUser])

  if (loading) {
    return <div className="p-4">Chargement...</div>
  }

  return (
    <AddExpense 
      onExpenseCreated={() => {
        router.push('/admin/expenses')
      }} 
      expenseType="main"
      isAdmin={isAdmin}
    />
  )
}

