"use client"

import { AddPromotion } from "@/components/promotions/add-promotion"
import { useRouter } from "next/navigation"

export default function CreatePromotionPage() {
  const router = useRouter()

  return (
    <AddPromotion 
      onPromotionCreated={() => {
        router.push('/admin/promotions')
      }}
      onCancel={() => {
        router.push('/admin/promotions')
      }}
    />
  )
}

