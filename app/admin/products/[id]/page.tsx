'use client'

import { ProductsDetails } from '@/components/products/products-details'
import { use } from 'react'

interface ProductDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { id } = use(params)
  return <ProductsDetails productId={id} />
}
