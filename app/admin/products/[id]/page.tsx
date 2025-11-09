'use client'

import { ProductsDetails } from '@/components/products/products-details'
import { useParams } from 'next/navigation'

export default function ProductDetailsPage() {
  const params = useParams()
  const idParam = params?.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam

  if (!id) {
    return null
  }

  return <ProductsDetails productId={id} />
}
