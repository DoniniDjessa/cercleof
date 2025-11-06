/**
 * Product utility functions for website and general product management
 */

import { supabase } from './supabase'

export interface WebsiteProduct {
  id: string
  name: string
  description?: string
  sku: string
  barcode: string
  price: number
  images: string[]
  category: {
    id: string
    name: string
  }
  brand?: string
  stock_quantity: number
  show_to_website: boolean
  created_at: string
}

/**
 * Fetch products that are marked to show on website
 */
export async function getWebsiteProducts(): Promise<WebsiteProduct[]> {
  try {
    // Fetch products first
    const { data: productsData, error } = await supabase
      .from('dd-products')
      .select('id, name, description, sku, barcode, price, images, brand, stock_quantity, show_to_website, created_at, category_id')
      .eq('show_to_website', true)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!productsData || productsData.length === 0) {
      return []
    }

    // Fetch categories separately
    const categoryIds = productsData
      .map(p => p.category_id)
      .filter((id): id is string => !!id)

    const categoriesMap = new Map<string, { id: string; name: string }>()
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from('dd-categories')
        .select('id, name')
        .in('id', categoryIds)
      
      categories?.forEach(cat => {
        categoriesMap.set(cat.id, { id: cat.id, name: cat.name })
      })
    }

    // Map categories to products
    return productsData.map(product => ({
      ...product,
      category: product.category_id ? categoriesMap.get(product.category_id) : undefined
    })) as WebsiteProduct[]
  } catch (error) {
    console.error('Error fetching website products:', error)
    return []
  }
}

/**
 * Fetch products by category for website
 */
export async function getWebsiteProductsByCategory(categoryId: string): Promise<WebsiteProduct[]> {
  try {
    // Fetch products first
    const { data: productsData, error } = await supabase
      .from('dd-products')
      .select('id, name, description, sku, barcode, price, images, brand, stock_quantity, show_to_website, created_at, category_id')
      .eq('category_id', categoryId)
      .eq('show_to_website', true)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!productsData || productsData.length === 0) {
      return []
    }

    // Fetch category
    const { data: category } = await supabase
      .from('dd-categories')
      .select('id, name')
      .eq('id', categoryId)
      .single()

    // Map category to products
    return productsData.map(product => ({
      ...product,
      category: category ? { id: category.id, name: category.name } : undefined
    })) as WebsiteProduct[]
  } catch (error) {
    console.error('Error fetching website products by category:', error)
    return []
  }
}

/**
 * Check if a product should be displayed on website
 */
export function shouldShowOnWebsite(product: {
  show_to_website: boolean
  is_active: boolean
  status: string
  stock_quantity: number
}): boolean {
  return (
    product.show_to_website &&
    product.is_active &&
    product.status === 'active' &&
    product.stock_quantity > 0
  )
}

/**
 * Format product price for display
 */
export function formatProductPrice(price: number, currency: string = 'f'): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price) + (currency === 'f' ? 'f' : '')
}

/**
 * Get product availability status
 */
export function getProductAvailability(stockQuantity: number): {
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  message: string
} {
  if (stockQuantity === 0) {
    return {
      status: 'out-of-stock',
      message: 'Rupture de stock'
    }
  } else if (stockQuantity < 10) {
    return {
      status: 'low-stock',
      message: 'Stock faible'
    }
  } else {
    return {
      status: 'in-stock',
      message: 'En stock'
    }
  }
}
