'use client'

import { ServiceDetails } from "@/components/services/service-details"
import { use } from 'react'

interface ServiceDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ServiceDetailsPage({ params }: ServiceDetailsPageProps) {
  const { id } = use(params)
  return <ServiceDetails serviceId={id} />
}
