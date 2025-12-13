/**
 * Migration script to import menu data from docs/todo.md into dd-menu table
 * 
 * Usage:
 *   npx tsx scripts/migrate-menu-data.ts
 * 
 * Or with Node:
 *   node --loader ts-node/esm scripts/migrate-menu-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Singleton ID for menu data
const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Extract JSON from markdown file
 */
function extractJsonFromMarkdown(filePath: string): any[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // Find the JSON block between ```json and ```
    const jsonStart = content.indexOf('```json')
    const jsonEnd = content.indexOf('```', jsonStart + 7)
    
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('Could not find JSON block in markdown file')
    }
    
    const jsonContent = content.substring(jsonStart + 7, jsonEnd).trim()
    const menuData = JSON.parse(jsonContent)
    
    return menuData
  } catch (error) {
    console.error('Error extracting JSON from markdown:', error)
    throw error
  }
}

/**
 * Validate menu data structure
 */
function validateMenuData(data: any[]): boolean {
  if (!Array.isArray(data)) {
    console.error('Error: Menu data must be an array')
    return false
  }

  for (const category of data) {
    if (!category.title || !category.subtitle || !category.video) {
      console.error('Error: Category missing required fields (title, subtitle, video)')
      return false
    }

    // Check that category has either services OR subCategories, not both
    const hasServices = category.services && category.services.length > 0
    const hasSubCategories = category.subCategories && category.subCategories.length > 0

    if (hasServices && hasSubCategories) {
      console.error(`Error: Category "${category.title}" cannot have both services and subcategories`)
      return false
    }

    // Validate subcategories if they exist
    if (hasSubCategories) {
      for (const subCategory of category.subCategories) {
        if (!subCategory.title || !subCategory.subtitle || !subCategory.video) {
          console.error(`Error: SubCategory in "${category.title}" missing required fields`)
          return false
        }
        if (!subCategory.services || !Array.isArray(subCategory.services)) {
          console.error(`Error: SubCategory "${subCategory.title}" must have services array`)
          return false
        }
      }
    }

    // Validate services if they exist
    if (hasServices) {
      for (const service of category.services) {
        if (!service.title || !service.description) {
          console.error(`Error: Service in "${category.title}" missing required fields (title, description)`)
          return false
        }
      }
    }
  }

  return true
}

/**
 * Main migration function
 */
async function migrateMenuData() {
  console.log('🚀 Starting menu data migration...\n')

  try {
    // Read and parse JSON from todo.md
    const todoMdPath = path.join(process.cwd(), 'docs', 'todo.md')
    console.log(`📖 Reading menu data from: ${todoMdPath}`)
    
    if (!fs.existsSync(todoMdPath)) {
      throw new Error(`File not found: ${todoMdPath}`)
    }

    const menuData = extractJsonFromMarkdown(todoMdPath)
    console.log(`✅ Extracted ${menuData.length} categories from todo.md`)

    // Validate the data
    console.log('🔍 Validating menu data structure...')
    if (!validateMenuData(menuData)) {
      throw new Error('Menu data validation failed')
    }
    console.log('✅ Menu data validation passed\n')

    // Check if table exists and record exists
    console.log('🔍 Checking if dd-menu table exists...')
    const { data: existing, error: checkError } = await supabase
      .from('dd-menu')
      .select('id')
      .eq('id', MENU_DATA_ID)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      // Other errors might mean table doesn't exist
      console.warn(`⚠️  Warning: ${checkError.message}`)
      console.warn('   Make sure you have run: database/create-menu-data-table.sql\n')
    }

    // Insert or update menu data
    console.log('💾 Saving menu data to dd-menu table...')
    const { data: savedData, error: saveError } = await supabase
      .from('dd-menu')
      .upsert({
        id: MENU_DATA_ID,
        data: menuData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single()

    if (saveError) {
      throw saveError
    }

    console.log('✅ Menu data saved successfully!')
    console.log(`\n📊 Summary:`)
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
    console.log(`\n✨ Migration completed successfully!`)

  } catch (error: any) {
    console.error('\n❌ Migration failed:')
    console.error(error.message)
    if (error.code) {
      console.error(`   Error code: ${error.code}`)
    }
    if (error.hint) {
      console.error(`   Hint: ${error.hint}`)
    }
    process.exit(1)
  }
}

// Run migration
migrateMenuData()

