'use client'

import { useSearchParams } from 'next/navigation'
import { AddStock } from '@/components/stock/add-stock'
import { StockList } from '@/components/stock/stock-list'

export default function StockPage() {
  const searchParams = useSearchParams()
  const action = searchParams.get('action')

  const showCreateForm = action === 'create'

  return (
    <>
      {showCreateForm ? (
        <AddStock 
          onStockCreated={() => {
            // Redirect back to list
            window.history.replaceState({}, '', '/admin/stock')
          }}
        />
      ) : (
        <StockList />
      )}
    </>
  )
}
