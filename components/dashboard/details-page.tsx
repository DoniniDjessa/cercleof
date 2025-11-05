'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, MessageSquare } from 'lucide-react'

interface DetailsPageProps {
  userRole?: string
}

export function DetailsPage({ userRole }: DetailsPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Détails & Requêtes</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Posez vos questions et obtenez des informations détaillées</p>
      </div>

      {/* Placeholder */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Page en développement
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Cette page permettra aux utilisateurs de poser des questions et d'obtenir des informations détaillées sur toutes les données du système.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

