"use client"

import { AddDelivery } from "@/components/deliveries/add-delivery"
import { useRouter } from "next/navigation"

export default function CreateDeliveryPage() {
  const router = useRouter()

  return (
    <AddDelivery 
      onDeliveryCreated={() => {
        router.push('/admin/deliveries')
      }} 
    />
  )
}

