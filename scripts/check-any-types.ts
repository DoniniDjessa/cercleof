#!/usr/bin/env ts-node

/**
 * Script to check for 'any' types in TypeScript files
 * Run with: npx ts-node scripts/check-any-types.ts
 * Or add to package.json: "check-types": "ts-node scripts/check-any-types.ts"
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

interface AnyTypeWarning {
  file: string
  line: number
  column: number
  content: string
}

const IGNORE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /scripts\/check-any-types\.ts$/, // Ignore this script itself
]

const ALLOWED_ANY_PATTERNS = [
  /:\s*any\[\]/, // Array<any> is sometimes acceptable
  /Record<string,\s*any>/, // Record<string, any> is sometimes acceptable
  /as any/, // Type assertions are sometimes necessary
  /any\s*\|\s*/, // Union with any
  /\|\s*any/, // Union with any (reverse)
]

function shouldIgnoreFile(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
}

function isAllowedAny(line: string): boolean {
  return ALLOWED_ANY_PATTERNS.some(pattern => pattern.test(line))
}

function checkFile(filePath: string): AnyTypeWarning[] {
  const warnings: AnyTypeWarning[] = []
  
  try {
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Check for 'any' type annotations (but not in strings or comments)
      const anyPattern = /:\s*any(?:\s|;|,|\)|\[|>|$)/g
      let match: RegExpExecArray | null
      
      // Skip if line is a comment
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return
      }
      
      // Skip if it's inside a string
      const inString = (line.match(/"/g) || []).length % 2 !== 0
      if (inString) {
        return
      }
      
      while ((match = anyPattern.exec(line)) !== null) {
        const fullMatch = match[0]
        const lineContent = line.trim()
        
        // Skip if it's an allowed pattern
        if (isAllowedAny(line)) {
          continue
        }
        
        // Skip if it's in a comment
        if (lineContent.includes('//') && lineContent.indexOf('//') < match.index) {
          continue
        }
        
        warnings.push({
          file: filePath,
          line: index + 1,
          column: match.index + 1,
          content: lineContent.substring(0, 100), // First 100 chars
        })
      }
    })
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error)
  }
  
  return warnings
}

function scanDirectory(dir: string, warnings: AnyTypeWarning[] = []): AnyTypeWarning[] {
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      
      if (shouldIgnoreFile(fullPath)) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath, warnings)
      } else if (stat.isFile() && extname(fullPath) === '.ts' || extname(fullPath) === '.tsx') {
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
  const srcDir = join(rootDir, 'app')
  const componentsDir = join(rootDir, 'components')
  
  let allWarnings: AnyTypeWarning[] = []
  
  // Scan app directory
  if (statSync(srcDir).isDirectory()) {
    allWarnings = scanDirectory(srcDir, allWarnings)
  }
  
  // Scan components directory
  if (statSync(componentsDir).isDirectory()) {
    allWarnings = scanDirectory(componentsDir, allWarnings)
  }
  
  if (allWarnings.length === 0) {
    console.log('✅ No "any" types found! Great job!')
    process.exit(0)
  }
  
  console.log(`⚠️  Found ${allWarnings.length} "any" type(s):\n`)
  
  // Group by file
  const warningsByFile = new Map<string, AnyTypeWarning[]>()
  allWarnings.forEach(warning => {
    const relativePath = warning.file.replace(rootDir + '\\', '').replace(rootDir + '/', '')
    if (!warningsByFile.has(relativePath)) {
      warningsByFile.set(relativePath, [])
    }
    warningsByFile.get(relativePath)!.push(warning)
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
  
  process.exit(1)
}

main()

