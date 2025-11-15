'use client'

import { DeliveryDetails } from '@/components/deliveries/delivery-details'
import { useParams } from 'next/navigation'

export default function DeliveryDetailsPage() {
  const params = useParams()
  const idParam = params?.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam

  if (!id) {
    return null
  }

  return <DeliveryDetails deliveryId={id} />
}

