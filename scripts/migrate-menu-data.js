/**
 * Migration script to import menu data from docs/todo.md into dd-menu table
 * 
 * This script extracts the JSON data from the "## Existing Data (JSON)" section
 * in docs/todo.md and saves it to the dd-menu table in Supabase.
 * 
 * Usage:
 *   npm run migrate-menu
 *   OR
 *   node scripts/migrate-menu-data.js
 * 
 * The script automatically loads environment variables from .env.local
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '') // Remove quotes
          process.env[key.trim()] = value.trim()
        }
      }
    }
    console.log('✅ Loaded environment variables from .env.local\n')
  } else {
    console.warn('⚠️  .env.local not found. Using system environment variables.\n')
  }
}

// Load environment variables
loadEnvFile()

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
 * Looks for the "## Existing Data (JSON)" section and extracts the JSON block
 */
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
    console.log(`📄 Extracted ${jsonContent.length} characters of JSON data`)
    
    const menuData = JSON.parse(jsonContent)
    
    return menuData
  } catch (error) {
    console.error('❌ Error extracting JSON from markdown:', error.message)
    if (error instanceof SyntaxError) {
      console.error('   This looks like a JSON parsing error. Check the JSON syntax in todo.md')
    }
    throw error
  }
}

/**
 * Validate menu data structure
 */
function validateMenuData(data) {
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
    console.log(`✅ Successfully parsed ${menuData.length} categories from JSON`)

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

  } catch (error) {
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

