/**
 * Test the API endpoint directly
 */

const http = require('http')

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/menu',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
}

console.log('🔍 Testing API endpoint: http://localhost:3000/api/menu\n')

const req = http.request(options, (res) => {
  let data = ''

  res.on('data', (chunk) => {
    data += chunk
  })

  res.on('end', () => {
    console.log('Status Code:', res.statusCode)
    console.log('Response Headers:', JSON.stringify(res.headers, null, 2))
    console.log('\nResponse Body:')
    try {
      const json = JSON.parse(data)
      console.log(JSON.stringify(json, null, 2))
      
      if (json.menuData && Array.isArray(json.menuData)) {
        console.log(`\n✅ Menu data array length: ${json.menuData.length}`)
        if (json.menuData.length > 0) {
          console.log(`   First category: ${json.menuData[0].title}`)
        } else {
          console.log('   ⚠️  Array is empty!')
        }
      }
    } catch (e) {
      console.log(data)
    }
  })
})

req.on('error', (error) => {
  console.error('❌ Error:', error.message)
  console.error('\nMake sure the dev server is running: npm run dev')
})

req.end()

