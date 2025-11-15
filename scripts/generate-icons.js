const fs = require('fs');
const path = require('path');

// This script requires sharp package to resize images
// Run: npm install sharp --save-dev
// Then: node scripts/generate-icons.js

const sharp = require('sharp');

const inputFile = path.join(__dirname, '../public/cbmin.png');
const outputDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');
const appDir = path.join(__dirname, '../app');

// Create icons directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const faviconSizes = [16, 32, 48];

async function generateIcons() {
  try {
    console.log('Generating icons from cbmin.png...');
    
    // Generate PWA icons
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
    
    // Generate favicon.ico (multi-size ICO file)
    console.log('\nGenerating favicon.ico...');
    const faviconSizes = [16, 32, 48];
    const icoBuffers = [];
    
    for (const size of faviconSizes) {
      const buffer = await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();
      icoBuffers.push({ size, buffer });
    }
    
    // Create favicon.ico using the largest size (48x48) as fallback
    // Note: Sharp doesn't create ICO files directly, so we'll use PNG
    // Next.js will handle the ICO conversion, but we'll create PNG favicons
    const favicon32 = await sharp(inputFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Generated favicon-32x32.png');
    
    // Generate apple-touch-icon (180x180 for iOS)
    const appleIcon = await sharp(inputFile)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');
    
    // Generate favicon.ico as PNG (Next.js will use it)
    // Most modern browsers accept PNG for favicon
    const faviconICO = await sharp(inputFile)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico');
    
    // Generate app/icon.png for Next.js 13+ App Router
    // This is the main icon used by Next.js
    const appIcon = await sharp(inputFile)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(appDir, 'icon.png'));
    console.log('✓ Generated app/icon.png');
    
    // Generate app/favicon.ico for Next.js 13+ App Router
    const appFavicon = await sharp(inputFile)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(appDir, 'favicon.ico'));
    console.log('✓ Generated app/favicon.ico');
    
    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    console.log('\nNote: This script requires the "sharp" package.');
    console.log('Install it with: npm install sharp --save-dev');
  }
}

generateIcons();

