'use client'

import { useSearchParams, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { AddStockItems } from '@/components/stock/add-stock-items'
import { StockItemsList } from '@/components/stock/stock-items-list'
import { supabase } from '@/lib/supabase'

export default function StockItemsPage() {
  const searchParams = useSearchParams()
  const params = useParams()
  const stockId = params.id as string
  const action = searchParams.get('action')
  
  const [stock, setStock] = useState<{id: string, name: string, stock_ref: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (stockId) {
      fetchStock()
    }
  }, [stockId])

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('dd-stocks')
        .select('id, name, stock_ref')
        .eq('id', stockId)
        .single()

      if (error) throw error
      setStock(data)
    } catch (error) {
      console.error('Error fetching stock:', error)
    } finally {
      setLoading(false)
    }
  }

  const showAddForm = action === 'add'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!stock) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Stock non trouvé</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {showAddForm ? (
        <AddStockItems 
          stockId={stock.id}
          stockRef={stock.stock_ref}
          onStockItemsAdded={() => {
            // Redirect back to list
            window.history.replaceState({}, '', `/admin/stock/${stockId}/items`)
          }}
        />
      ) : (
        <StockItemsList stockId={stockId} stockName={stock.name} stockRef={stock.stock_ref} />
      )}
    </>
  )
}
