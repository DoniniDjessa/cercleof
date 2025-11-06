# Progressive Web App (PWA) Setup

Your app is now configured as a Progressive Web App (PWA), making it installable on devices!

## What's Been Configured

1. **next-pwa** package installed and configured
2. **Web App Manifest** (`public/manifest.json`) created
3. **PWA metadata** added to the layout
4. **Service Worker** will be automatically generated on build
5. **Offline caching** configured for Supabase and images

## How to Complete the Setup

### 1. Generate App Icons

You need to create app icons for the PWA. Here are your options:

#### Option A: Using PWA Asset Generator (Recommended)
```bash
# Install globally
npm install -g pwa-asset-generator

# Generate icons from your logo (replace logo.png with your logo file)
pwa-asset-generator logo.png public/icons --icon-only --favicon
```

#### Option B: Using Online Tools
1. Visit https://realfavicongenerator.net/
2. Upload your logo
3. Configure settings
4. Download and extract to `public/icons/`

#### Option C: Manual Creation
Create PNG icons with these sizes in `public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

### 2. Build and Test

```bash
# Build the app (this will generate the service worker)
npm run build

# Start the production server
npm start
```

### 3. Test Installation

#### On Desktop (Chrome/Edge):
1. Open the app in your browser
2. Look for the install icon in the address bar
3. Click "Install" to add to desktop

#### On Mobile (Android):
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen" or "Install App"

#### On iOS (Safari):
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

## Features Enabled

- ✅ **Offline Support**: Service worker caches resources
- ✅ **App-like Experience**: Standalone display mode
- ✅ **Fast Loading**: Cached resources load instantly
- ✅ **Installable**: Can be installed on devices
- ✅ **Theme Color**: Pink theme (#ec4899) for status bar
- ✅ **App Shortcuts**: Quick access to POS and Clients

## Configuration Files

- `next.config.ts` - PWA configuration
- `public/manifest.json` - Web app manifest
- `app/layout.tsx` - PWA metadata

## Notes

- Service worker is **disabled in development** mode
- Service worker is **enabled in production** builds
- Icons are required for full PWA functionality
- The app will work without icons, but installation prompts may not appear

## Troubleshooting

### Service Worker Not Registering
- Make sure you're running a production build (`npm run build && npm start`)
- Check browser console for errors
- Verify HTTPS is enabled (required for PWA)

### Icons Not Showing
- Ensure icons are in `public/icons/` directory
- Check icon file names match manifest.json
- Verify icon files are valid PNG images

### Installation Prompt Not Appearing
- Ensure all PWA requirements are met (HTTPS, manifest, service worker)
- Check browser PWA support
- Verify icons are present and valid

