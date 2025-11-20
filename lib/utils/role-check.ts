import { supabase } from '@/lib/supabase'

/**
 * Check if a user has admin role (admin, superadmin, or manager)
 */
export async function isAdmin(userId: string | undefined | null): Promise<boolean> {
  if (!userId) return false

  try {
    const { data, error } = await supabase
      .from('dd-users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()

    if (error || !data) return false

    const role = data.role?.toLowerCase()
    return role === 'admin' || role === 'superadmin' || role === 'manager'
  } catch (error) {
    console.error('Error checking admin role:', error)
    return false
  }
}

/**
 * Get user role from database
 */
export async function getUserRole(userId: string | undefined | null): Promise<string | null> {
  if (!userId) return null

  try {
    const { data, error } = await supabase
      .from('dd-users')
      .select('role')
      .eq('auth_user_id', userId)
      .single()

    if (error || !data) return null

    return data.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}

