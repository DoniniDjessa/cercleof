"use client"

import { AddRevenue } from "@/components/financial/add-revenue"
import { useRouter } from "next/navigation"

export default function CreateRevenuePage() {
  const router = useRouter()

  return (
    <AddRevenue 
      onRevenueCreated={() => {
        router.push('/admin/revenues')
      }} 
    />
  )
}

