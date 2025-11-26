"use client"

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart } from 'lucide-react'
import { LoyaltyCardsList } from '@/components/loyalty/loyalty-cards-list'

export default function LoyaltyPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  
  // Check if user is receptionist (restricted access)
  const isReceptionist = Boolean(authUser?.role && authUser.role === 'receptionniste')
  
  // Show access denied for receptionist
  if (authUser && isReceptionist) {
    return (
      <div className="p-4">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Accès Interdit
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Vous n'avez pas l'autorisation d'accéder à cette page.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Cette section est réservée aux administrateurs et managers.
              </p>
            </div>
            <Button 
              onClick={() => router.push('/admin')} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <LoyaltyCardsList />
    </div>
  )
}
