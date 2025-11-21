#!/usr/bin/env node

/**
 * Script to automatically fix common 'any' type patterns
 * Run with: node scripts/fix-common-any-types.js
 * 
 * This script provides suggestions and can help fix simple cases
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const commonFixes = [
  {
    pattern: /:\s*any\s*\[\]/g,
    replacement: ': unknown[]',
    description: 'Replace any[] with unknown[]'
  },
  {
    pattern: /Record<string,\s*any>/g,
    replacement: 'Record<string, unknown>',
    description: 'Replace Record<string, any> with Record<string, unknown>'
  },
  {
    pattern: /:\s*any\s*$/gm,
    replacement: ': unknown',
    description: 'Replace : any with : unknown (simple cases)'
  }
]

function findTypeScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        findTypeScriptFiles(filePath, fileList)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!file.includes('check-any-types') && !file.includes('fix-common-any-types')) {
        fileList.push(filePath)
      }
    }
  })
  
  return fileList
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8')
  let modified = false
  const originalContent = content
  
  commonFixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      content = content.replace(fix.pattern, fix.replacement)
      modified = content !== originalContent
    }
  })
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  }
  
  return false
}

function main() {
  console.log('🔧 Fixing common "any" type patterns...\n')
  
  const rootDir = process.cwd()
  const appDir = path.join(rootDir, 'app')
  const componentsDir = path.join(rootDir, 'components')
  
  const files = []
  if (fs.existsSync(appDir)) {
    findTypeScriptFiles(appDir, files)
  }
  if (fs.existsSync(componentsDir)) {
    findTypeScriptFiles(componentsDir, files)
  }
  
  let fixedCount = 0
  const fixedFiles = []
  
  files.forEach(file => {
    if (fixFile(file)) {
      fixedCount++
      fixedFiles.push(path.relative(rootDir, file))
    }
  })
  
  if (fixedCount > 0) {
    console.log(`✅ Fixed ${fixedCount} file(s):\n`)
    fixedFiles.forEach(file => {
      console.log(`   - ${file}`)
    })
    console.log('\n💡 Please review the changes and test your application.')
  } else {
    console.log('ℹ️  No common patterns found to fix automatically.')
    console.log('   Please manually review "any" types and replace them with specific types.')
  }
}

main()

