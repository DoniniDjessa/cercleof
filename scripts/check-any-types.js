#!/usr/bin/env node

/**
 * Script to check for 'any' types in TypeScript files
 * Run with: node scripts/check-any-types.js
 * Or add to package.json: "check-types": "node scripts/check-any-types.js"
 */

const fs = require('fs')
const path = require('path')

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /scripts\/check-any-types\./,
]

const ALLOWED_ANY_PATTERNS = [
  /:\s*any\[\]/, // Array<any> is sometimes acceptable
  /Record<string,\s*any>/, // Record<string, any> is sometimes acceptable
  /as any/, // Type assertions are sometimes necessary
  /any\s*\|\s*/, // Union with any
  /\|\s*any/, // Union with any (reverse)
  /:\s*any\s*\{/g, // Object types with any (we'll check these manually)
]

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
}

function isAllowedAny(line) {
  return ALLOWED_ANY_PATTERNS.some(pattern => pattern.test(line))
}

function checkFile(filePath) {
  const warnings = []
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Skip if line is a comment
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return
      }
      
      // Skip if it's inside a string
      const quoteCount = (line.match(/"/g) || []).length
      if (quoteCount % 2 !== 0) {
        return
      }
      
      // Check for 'any' type annotations
      const anyPattern = /:\s*any(?:\s|;|,|\)|\[|>|$|\{)/g
      let match
      
      while ((match = anyPattern.exec(line)) !== null) {
        // Skip if it's an allowed pattern
        if (isAllowedAny(line)) {
          continue
        }
        
        // Skip if it's in a comment
        const commentIndex = line.indexOf('//')
        if (commentIndex !== -1 && commentIndex < match.index) {
          continue
        }
        
        warnings.push({
          file: filePath,
          line: index + 1,
          column: match.index + 1,
          content: trimmedLine.substring(0, 100), // First 100 chars
        })
      }
    })
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error)
  }
  
  return warnings
}

function scanDirectory(dir, warnings = []) {
  try {
    const entries = fs.readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry)
      
      if (shouldIgnoreFile(fullPath)) {
        continue
      }
      
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, warnings)
      } else if (stat.isFile() && (path.extname(fullPath) === '.ts' || path.extname(fullPath) === '.tsx')) {
        const fileWarnings = checkFile(fullPath)
        warnings.push(...fileWarnings)
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error)
  }
  
  return warnings
}

function main() {
  console.log('🔍 Checking for "any" types in TypeScript files...\n')
  
  const rootDir = process.cwd()
  const appDir = path.join(rootDir, 'app')
  const componentsDir = path.join(rootDir, 'components')
  
  let allWarnings = []
  
  // Scan app directory
  if (fs.existsSync(appDir) && fs.statSync(appDir).isDirectory()) {
    allWarnings = scanDirectory(appDir, allWarnings)
  }
  
  // Scan components directory
  if (fs.existsSync(componentsDir) && fs.statSync(componentsDir).isDirectory()) {
    allWarnings = scanDirectory(componentsDir, allWarnings)
  }
  
  if (allWarnings.length === 0) {
    console.log('✅ No "any" types found! Great job!')
    process.exit(0)
  }
  
  console.log(`⚠️  Found ${allWarnings.length} "any" type(s):\n`)
  
  // Group by file
  const warningsByFile = new Map()
  allWarnings.forEach(warning => {
    const relativePath = warning.file.replace(rootDir + path.sep, '').replace(/\\/g, '/')
    if (!warningsByFile.has(relativePath)) {
      warningsByFile.set(relativePath, [])
    }
    warningsByFile.get(relativePath).push(warning)
  })
  
  // Display warnings grouped by file
  warningsByFile.forEach((warnings, file) => {
    console.log(`📄 ${file}`)
    warnings.forEach(warning => {
      console.log(`   Line ${warning.line}, Column ${warning.column}: ${warning.content}`)
    })
    console.log()
  })
  
  console.log(`\n💡 Tip: Replace 'any' with specific types like string, number, object, or create interfaces/types.`)
  console.log(`   For complex objects, use Record<string, unknown> or define an interface.\n`)
  
  // Exit with code 0 to not block build (it's a warning)
  process.exit(0)
}

main()

