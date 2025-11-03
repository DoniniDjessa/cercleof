import { ServiceDetails } from "@/components/services/service-details"

interface ServiceDetailsPageProps {
  params: {
    id: string
  }
}

export default function ServiceDetailsPage({ params }: ServiceDetailsPageProps) {
  return <ServiceDetails serviceId={params.id} />
}
