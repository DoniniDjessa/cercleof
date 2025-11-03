/**
 * Code generation utilities for SKU, barcodes, and batch codes
 */

// Category prefixes for SKU generation - will be dynamically determined
const DEFAULT_PREFIXES: Record<string, string> = {
  'cheveux': 'CHE',
  'soins': 'SOI', 
  'maquillage': 'MAQ',
  'parfum': 'PAR',
  'accessoires': 'ACC',
  'outils': 'OUT',
  'produits': 'PRO',
  'services': 'SER'
}

/**
 * Generate SKU based on category and product name
 * Format: CAT-ABR-XXX (e.g., CHE-SHA-742)
 */
export function generateSKU(categoryName: string, productName: string): string {
  // Get category prefix
  const categoryPrefix = getCategoryPrefix(categoryName)
  
  // Generate abbreviation from product name (first 3 letters)
  const productAbbr = productName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 3)
    .padEnd(3, 'X')
  
  // Generate random 3-digit number
  const randomNumber = Math.floor(Math.random() * 900) + 100
  
  return `${categoryPrefix}-${productAbbr}-${randomNumber}`
}

/**
 * Generate SKU with custom category prefix
 * Format: CAT-ABR-XXX (e.g., CHE-SHA-742)
 */
export function generateSKUWithPrefix(categoryPrefix: string, productName: string): string {
  // Generate abbreviation from product name (first 3 letters)
  const productAbbr = productName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 3)
    .padEnd(3, 'X')
  
  // Generate random 3-digit number
  const randomNumber = Math.floor(Math.random() * 900) + 100
  
  return `${categoryPrefix}-${productAbbr}-${randomNumber}`
}

/**
 * Generate barcode (13 digits)
 * Format: YYYYMMDDHHMMSS (timestamp-based)
 */
export function generateBarcode(): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const second = now.getSeconds().toString().padStart(2, '0')
  const millisecond = now.getMilliseconds().toString().padStart(3, '0')
  
  return `${year}${month}${day}${hour}${minute}${second}${millisecond}`.substring(0, 13)
}

/**
 * Generate stock reference
 * Format: STK-YYYYMMDD-XXX (e.g., STK-20251020-04F)
 */
export function generateStockRef(): string {
  const now = new Date()
  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  
  // Generate random 3-character suffix (2 digits + 1 letter)
  const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0')
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  
  return `STK-${year}${month}${day}-${randomNum}${randomLetter}`
}

/**
 * Generate batch code
 * Format: STOCK_REF-PRODUCT_SKU_SUFFIX (e.g., STK-20251020-04F-742A)
 */
export function generateBatchCode(stockRef: string, productSKU: string): string {
  // Extract the last 3 characters from SKU and add a random letter
  const skuSuffix = productSKU.split('-').pop() || '000'
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26))
  
  return `${stockRef}-${skuSuffix}${randomLetter}`
}

/**
 * Get category prefix for SKU generation
 */
function getCategoryPrefix(categoryName: string): string {
  const normalizedName = categoryName.toLowerCase()
  
  // Check for exact matches first
  if (DEFAULT_PREFIXES[normalizedName]) {
    return DEFAULT_PREFIXES[normalizedName]
  }
  
  // Check for partial matches
  for (const [key, prefix] of Object.entries(DEFAULT_PREFIXES)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return prefix
    }
  }
  
  // Generate prefix from category name (first 3 letters)
  const generatedPrefix = normalizedName
    .replace(/[^a-z]/g, '')
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X')
  
  return generatedPrefix
}

/**
 * Validate SKU format
 */
export function validateSKU(sku: string): boolean {
  const skuRegex = /^[A-Z]{3}-[A-Z]{3}-\d{3}$/
  return skuRegex.test(sku)
}

/**
 * Validate barcode format (13 digits)
 */
export function validateBarcode(barcode: string): boolean {
  const barcodeRegex = /^\d{13}$/
  return barcodeRegex.test(barcode)
}

/**
 * Validate stock reference format
 */
export function validateStockRef(stockRef: string): boolean {
  const stockRefRegex = /^STK-\d{8}-\d{2}[A-Z]$/
  return stockRefRegex.test(stockRef)
}

/**
 * Validate batch code format
 */
export function validateBatchCode(batchCode: string): boolean {
  const batchCodeRegex = /^STK-\d{8}-\d{2}[A-Z]-\d{3}[A-Z]$/
  return batchCodeRegex.test(batchCode)
}
