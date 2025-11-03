'use client'

import { ProductsDetails } from '@/components/products/products-details'

interface ProductDetailsPageProps {
  params: {
    id: string
  }
}

export default function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  return <ProductsDetails productId={params.id} />
}
