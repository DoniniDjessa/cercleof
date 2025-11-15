"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CategoriesList } from "@/components/categories/categories-list"
import { AddCategory } from "@/components/categories/add-category"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Scissors } from "lucide-react"

export default function CategoriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'product' | 'service'>('service')
  const [showForm, setShowForm] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const type = searchParams.get('type')
    const action = searchParams.get('action')
    const id = searchParams.get('id')
    
    if (type === 'product' || type === 'service') {
      setActiveTab(type)
    }
    
    if (action === 'create' || action === 'edit') {
      setShowForm(true)
      setCategoryId(action === 'edit' && id ? id : null)
    } else {
      setShowForm(false)
      setCategoryId(null)
    }
  }, [searchParams])

  if (showForm) {
    return <AddCategory 
      onCategoryCreated={() => {
        router.push(`/admin/categories?type=${activeTab}`)
        setShowForm(false)
        setCategoryId(null)
      }} 
      categoryType={activeTab}
      categoryId={categoryId}
    />
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-white">Gestion des Catégories</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Gérez les catégories et sous-catégories pour vos produits et services
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'product' | 'service')
        router.push(`/admin/categories?type=${value}`)
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="service" className="flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="product" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Produits
          </TabsTrigger>
        </TabsList>
        <TabsContent value="service" className="mt-6">
          <CategoriesList categoryType="service" />
        </TabsContent>
        <TabsContent value="product" className="mt-6">
          <CategoriesList categoryType="product" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
