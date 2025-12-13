/**
 * Quick test script to verify JSON extraction from todo.md
 * Run this before the full migration to check if the JSON is valid
 * 
 * Usage: node scripts/test-json-extraction.js
 */

const fs = require('fs')
const path = require('path')

function extractJsonFromMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Find the "## Existing Data (JSON)" section
    const sectionMarker = '## Existing Data (JSON)'
    const sectionStart = content.indexOf(sectionMarker)
    
    if (sectionStart === -1) {
      throw new Error(`Could not find "${sectionMarker}" section in markdown file`)
    }
    
    // Find the JSON block after the section marker
    const contentAfterSection = content.substring(sectionStart)
    const jsonStart = contentAfterSection.indexOf('```json')
    
    if (jsonStart === -1) {
      throw new Error('Could not find ```json code block after "Existing Data (JSON)" section')
    }
    
    // Find the closing ```
    const jsonEnd = contentAfterSection.indexOf('```', jsonStart + 7)
    
    if (jsonEnd === -1) {
      throw new Error('Could not find closing ``` for JSON code block')
    }
    
    // Extract and parse JSON
    const jsonContent = contentAfterSection.substring(jsonStart + 7, jsonEnd).trim()
    
    const menuData = JSON.parse(jsonContent)
    
    return { menuData, jsonContent }
  } catch (error) {
    console.error('Error extracting JSON from markdown:', error.message)
    throw error
  }
}

// Test the extraction
console.log('🧪 Testing JSON extraction from docs/todo.md...\n')

try {
  const todoMdPath = path.join(process.cwd(), 'docs', 'todo.md')
  
  if (!fs.existsSync(todoMdPath)) {
    console.error(`❌ File not found: ${todoMdPath}`)
    process.exit(1)
  }
  
  const { menuData, jsonContent } = extractJsonFromMarkdown(todoMdPath)
  
  console.log('✅ JSON extraction successful!')
  console.log(`\n📊 Data Summary:`)
  console.log(`   - JSON size: ${(jsonContent.length / 1024).toFixed(2)} KB`)
  console.log(`   - Categories: ${menuData.length}`)
  
  // Count subcategories and services
  let totalSubCategories = 0
  let totalServices = 0
  
  for (const category of menuData) {
    if (category.subCategories) {
      totalSubCategories += category.subCategories.length
      for (const subCategory of category.subCategories) {
        totalServices += subCategory.services?.length || 0
      }
    }
    if (category.services) {
      totalServices += category.services.length
    }
  }
  
  console.log(`   - SubCategories: ${totalSubCategories}`)
  console.log(`   - Services: ${totalServices}`)
  
  // Show category names
  console.log(`\n📋 Categories found:`)
  menuData.forEach((cat, index) => {
    console.log(`   ${index + 1}. ${cat.title} (${cat.subtitle})`)
  })
  
  console.log(`\n✨ JSON is valid and ready for migration!`)
  console.log(`   Run: npm run migrate-menu`)
  
} catch (error) {
  console.error('\n❌ Test failed:', error.message)
  process.exit(1)
}

