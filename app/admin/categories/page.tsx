'use client'

import { useSearchParams } from 'next/navigation'
import { AddCategory } from '@/components/categories/add-category'
import { CategoriesList } from '@/components/categories/categories-list'

export default function CategoriesPage() {
  const searchParams = useSearchParams()
  const categoryType = (searchParams.get('type') as 'product' | 'service') || 'product'
  const action = searchParams.get('action')

  const showCreateForm = action === 'create'

  return (
    <>
      {showCreateForm ? (
        <AddCategory 
          categoryType={categoryType}
          onCategoryCreated={() => {
            // Redirect back to list
            window.history.replaceState({}, '', `/admin/categories?type=${categoryType}`)
          }}
        />
      ) : (
        <CategoriesList categoryType={categoryType} />
      )}
    </>
  )
}
