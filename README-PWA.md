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

The app includes a script to automatically generate all required icons from your logo (`public/cbmin.png`).

#### Using the Built-in Script (Recommended)
```bash
# Generate all icons from cbmin.png
node scripts/generate-icons.js
```

This script will generate:
- PWA icons in `public/icons/` (72x72 to 512x512)
- Favicons in `public/` and `app/`
- Apple touch icon for iOS
- All icons for Next.js App Router in `app/`

#### Alternative: Using PWA Asset Generator
```bash
# Install globally
npm install -g pwa-asset-generator

# Generate icons from your logo
pwa-asset-generator public/cbmin.png public/icons --icon-only --favicon
```

#### Alternative: Using Online Tools
1. Visit https://realfavicongenerator.net/
2. Upload your logo (`public/cbmin.png`)
3. Configure settings
4. Download and extract to `public/icons/`

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

### Icons Not Showing / Old Logo Still Appearing
If you see the old Vercel logo after updating icons:

1. **Regenerate icons**:
   ```bash
   node scripts/generate-icons.js
   ```

2. **Rebuild the app** (to update service worker):
   ```bash
   npm run build
   npm start
   ```

3. **Clear PWA cache**:
   - **Chrome/Edge Desktop**: 
     - Open DevTools (F12)
     - Go to Application tab
     - Click "Clear storage" → "Clear site data"
     - Or uninstall and reinstall the PWA
   
   - **Mobile (Android)**:
     - Settings → Apps → [Your App] → Clear Cache
     - Or uninstall and reinstall the app
   
   - **iOS (Safari)**:
     - Settings → Safari → Clear History and Website Data
     - Or delete and re-add to home screen

4. **Force service worker update**:
   - The service worker is configured with `skipWaiting: true` and uses `NetworkFirst` for icons
   - Wait a few minutes or restart the browser
   - The new cache name (`pwa-assets-v2`) will force a refresh

### Installation Prompt Not Appearing
- Ensure all PWA requirements are met (HTTPS, manifest, service worker)
- Check browser PWA support
- Verify icons are present and valid
- Run `npm run build` to generate the service worker (required for production)

