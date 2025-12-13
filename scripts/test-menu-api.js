/**
 * Test script to check if menu data exists in the database
 * and verify the API endpoint
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
          const value = valueParts.join('=').replace(/^["']|["']$/g, '')
          process.env[key.trim()] = value.trim()
        }
      }
    }
    console.log('✅ Loaded environment variables from .env.local\n')
  } else {
    console.warn('⚠️  .env.local not found. Using system environment variables.\n')
  }
}

loadEnvFile()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testMenuData() {
  console.log('🔍 Testing menu data in database...\n')
  
  const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
  
  try {
    // Test 1: Check if record exists
    console.log('Test 1: Checking if record exists...')
    const { data, error } = await supabase
      .from('dd-menu')
      .select('*')
      .eq('id', MENU_DATA_ID)
      .single()
    
    if (error) {
      console.error('❌ Error:', error.message)
      console.error('   Code:', error.code)
      console.error('   Details:', error.details)
      
      if (error.code === 'PGRST116') {
        console.log('\n⚠️  Record not found! You need to run the migration:')
        console.log('   npm run migrate-menu')
      }
      return
    }
    
    console.log('✅ Record found!')
    console.log('   ID:', data.id)
    console.log('   Created at:', data.created_at)
    console.log('   Updated at:', data.updated_at)
    
    // Test 2: Check data column
    console.log('\nTest 2: Checking data column...')
    if (!data.data) {
      console.log('❌ Data column is null or undefined')
      return
    }
    
    const menuData = data.data
    console.log('   Data type:', typeof menuData)
    console.log('   Is array:', Array.isArray(menuData))
    
    if (Array.isArray(menuData)) {
      console.log('   Array length:', menuData.length)
      
      if (menuData.length === 0) {
        console.log('\n⚠️  Data array is empty! You need to run the migration:')
        console.log('   npm run migrate-menu')
        return
      }
      
      console.log('\n✅ Menu data found!')
      console.log('   Categories:', menuData.length)
      
      // Count subcategories and services
      let subCategoriesCount = 0
      let servicesCount = 0
      
      menuData.forEach(category => {
        if (category.subCategories) {
          subCategoriesCount += category.subCategories.length
          category.subCategories.forEach(sub => {
            if (sub.services) {
              servicesCount += sub.services.length
            }
          })
        }
        if (category.services) {
          servicesCount += category.services.length
        }
      })
      
      console.log('   SubCategories:', subCategoriesCount)
      console.log('   Services:', servicesCount)
      
      // Show first category as sample
      if (menuData.length > 0) {
        console.log('\n📋 Sample category:')
        console.log('   Title:', menuData[0].title)
        console.log('   Subtitle:', menuData[0].subtitle)
        console.log('   Has subCategories:', !!menuData[0].subCategories)
        console.log('   Has services:', !!menuData[0].services)
      }
    } else {
      console.log('❌ Data is not an array')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error(error)
  }
}

testMenuData()

