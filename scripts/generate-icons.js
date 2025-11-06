const fs = require('fs');
const path = require('path');

// This script requires sharp package to resize images
// Run: npm install sharp --save-dev
// Then: node scripts/generate-icons.js

const sharp = require('sharp');

const inputFile = path.join(__dirname, '../public/cbmin.png');
const outputDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  try {
    console.log('Generating icons from cbmin.png...');
    
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon-${size}x${size}.png`);
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputFile);
      console.log(`✓ Generated icon-${size}x${size}.png`);
    }
    
    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    console.log('\nNote: This script requires the "sharp" package.');
    console.log('Install it with: npm install sharp --save-dev');
  }
}

generateIcons();

