# Frontend Menu Data Fetching Guide

This document explains how to fetch menu data for use in the frontend application.

## ⚠️ Important: Public REST API Available

**The menu data is available via a public REST API** - no authentication required, no Supabase client needed. Simply fetch from the API endpoint.

## Recommended Method: REST API Endpoint

**Use this method** - it's the simplest and most reliable:

```typescript
// Fetch menu data from the public API
async function fetchMenuData() {
  try {
    const response = await fetch('/api/menu')
    const result = await response.json()
    
    if (!result.success) {
      console.error('Error fetching menu data:', result.error)
      return []
    }
    
    // The menu data is in result.menuData
    return result.menuData as MenuCategory[]
  } catch (error) {
    console.error('Error fetching menu data:', error)
    return []
  }
}
```

**Response Structure**:
```typescript
{
  menuData: MenuCategory[],  // ← Your menu array with all data (videos, images, etc.)
  lastUpdated: string | null,
  success: boolean
}
```

**Features**:
- ✅ No authentication required
- ✅ No Supabase client needed
- ✅ Returns all data including videos and images
- ✅ CORS enabled (can be called from any frontend)
- ✅ Cached for performance
- ✅ Error handling included

**API Endpoint**: `GET /api/menu`

---

## Alternative Method: Direct Supabase Query

If you prefer to query Supabase directly (not recommended, use the API instead):

## Table Structure

The menu data is stored in a single table: `dd-menu`

### Table Schema

```sql
CREATE TABLE "dd-menu" (
  id UUID PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES "dd-users"(id),
  updated_by UUID REFERENCES "dd-users"(id)
);
```

### Data Structure

The `data` column contains a JSONB array following this structure (see `docs/todo.md` for full schema):

```typescript
type MenuData = MenuCategory[]

interface MenuCategory {
  title: string
  subtitle: string
  video: string  // YouTube Shorts URL
  subCategories?: SubCategory[]
  services?: Service[]
}

interface SubCategory {
  title: string
  subtitle: string
  description?: string
  video: string  // YouTube Shorts URL
  services: Service[]
}

interface Service {
  title: string
  description: string
  image?: string
  heroMedia?: MediaItem
  fallbackVideo?: string
  price?: string
  duration?: string
  tags?: string[]
  media?: MediaItem[]
  galleryMedia?: GalleryMediaItem[]
}

interface MediaItem {
  type: "image" | "video"
  src: string
  label?: string
}

interface GalleryMediaItem {
  type: "image" | "video"
  src: string
}
```

## Fetching Menu Data

### ⚠️ Critical Information

**IMPORTANT**: The menu data is stored in a **JSONB column** called `data`. When you query the table, you get a row with multiple columns, and the actual menu array is in the `data` column.

**Response Structure**:
```typescript
{
  id: "00000000-0000-0000-0000-000000000001",
  data: MenuCategory[],  // ← THIS is your menu data array
  created_at: "...",
  updated_at: "...",
  created_by: "...",
  updated_by: "..."
}
```

**After querying, you must access `data.data` to get the menu array:**
```typescript
const { data, error } = await supabase
  .from('dd-menu')
  .select('*')
  .eq('id', MENU_DATA_ID)
  .single()

// The menu array is in data.data, not just data!
const menuArray = data.data as MenuCategory[]
```

### Singleton Pattern

The menu data uses a **singleton pattern** with a fixed UUID:
- **Menu Data ID**: `00000000-0000-0000-0000-000000000001`

There is only **one record** in the table, and it contains all menu data.

### How We Fetch in the Backoffice (Reference Implementation)

This is the exact flow used in the menu edition page (`app/admin/menu-edition/page.tsx`):

```typescript
import { supabase } from '@/lib/supabase'

// The supabase client is created using createBrowserClient from @supabase/ssr
// See lib/supabase.ts for the exact implementation

async function fetchMenuData() {
  try {
    // Use singleton ID pattern - fixed ID for menu data
    const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
    
    const { data, error } = await supabase
      .from('dd-menu')
      .select('*')
      .eq('id', MENU_DATA_ID)
      .single()

    // Handle case where record doesn't exist
    if (error && error.code === 'PGRST116') {
      // Record doesn't exist - create it with empty data
      const { data: newData, error: insertError } = await supabase
        .from('dd-menu')
        .insert({
          id: MENU_DATA_ID,
          data: []
        })
        .select()
        .single()

      if (insertError) {
        // Table might not exist - fallback to localStorage
        const localData = localStorage.getItem('menu_data')
        if (localData) {
          return JSON.parse(localData) as MenuCategory[]
        }
        return []
      }

      return []
    }

    // Handle other errors
    if (error) {
      console.error('Error fetching menu data:', error)
      // Fallback to localStorage
      const localData = localStorage.getItem('menu_data')
      if (localData) {
        return JSON.parse(localData) as MenuCategory[]
      }
      return []
    }

    // Return the data from the 'data' column
    if (data && data.data) {
      return data.data as MenuCategory[]
    }
    
    return []
  } catch (error) {
    console.error('Error fetching menu data:', error)
    // Fallback to localStorage
    const localData = localStorage.getItem('menu_data')
    if (localData) {
      return JSON.parse(localData) as MenuCategory[]
    }
    return []
  }
}
```

### Supabase Client Setup

The backoffice uses this client setup (from `lib/supabase.ts`):

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export const supabase = createClient()
```

**Note for Frontend**: You can use the same setup - no authentication is required. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is sufficient to read menu data. You don't need to sign in users or check for admin roles.

### Method 1: Using Supabase Client (Recommended - Same as Backoffice)

**No authentication required** - this works for all users (public/anonymous access):

```typescript
import { createClient } from '@supabase/supabase-js'
// OR use createBrowserClient from @supabase/ssr for Next.js
import { createBrowserClient } from '@supabase/ssr'

// Option A: Using @supabase/supabase-js
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Option B: Using @supabase/ssr (recommended for Next.js)
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Fetch menu data - NO AUTHENTICATION NEEDED
async function fetchMenuData() {
  const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
  
  const { data, error } = await supabase
    .from('dd-menu')
    .select('*')  // Select all columns, or use .select('data') for just the data column
    .eq('id', MENU_DATA_ID)
    .single()

  if (error) {
    console.error('Error fetching menu data:', error)
    return null
  }

  // ⚠️ IMPORTANT: The menu data is in the 'data' column
  // So you access it as data.data (first 'data' is Supabase response, second 'data' is the column name)
  return data.data as MenuCategory[]
}
```

### Method 2: Using Next.js API Route

Create an API route: `app/api/menu/route.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
  
  try {
    const { data, error } = await supabase
      .from('dd-menu')
      .select('data, updated_at')
      .eq('id', MENU_DATA_ID)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch menu data', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      menuData: data.data,
      lastUpdated: data.updated_at
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
```

Then fetch from frontend:

```typescript
async function fetchMenuData() {
  const response = await fetch('/api/menu')
  const result = await response.json()
  
  if (!response.ok) {
    console.error('Error:', result.error)
    return null
  }
  
  return result.menuData as MenuCategory[]
}
```

### Method 3: Fetch from External Frontend (CORS Enabled)

If your frontend is on a different domain, you can still use the API:

```typescript
// Replace with your actual API URL
const API_BASE_URL = 'https://your-domain.com'

async function fetchMenuData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/menu`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await response.json()
    
    if (!result.success) {
      console.error('Error fetching menu data:', result.error)
      return []
    }
    
    return result.menuData as MenuCategory[]
  } catch (error) {
    console.error('Error fetching menu data:', error)
    return []
  }
}
```

**Note**: The API has CORS enabled, so it can be called from any frontend domain.

## Key Points from Backoffice Implementation

1. **Query**: Uses `.select('*')` to get all columns, then accesses `data.data` to get the menu array
   - ⚠️ **CRITICAL**: The Supabase response has a `data` property, and inside that object, there's another `data` property (the column name) that contains the menu array
   - So it's: `response.data.data` → `MenuCategory[]`

2. **Error Handling**: Handles `PGRST116` error code (record not found) by creating an empty record

3. **Fallback**: Falls back to `localStorage.getItem('menu_data')` if database fetch fails

4. **Response Structure**: 
   ```typescript
   // Supabase returns:
   {
     data: {
       id: "...",
       data: MenuCategory[],  // ← Your menu array is here
       created_at: "...",
       updated_at: "..."
     },
     error: null
   }
   
   // So you access it as: response.data.data
   ```

5. **Common Mistake**: Don't use `data` directly - use `data.data` because:
   - `data` = the Supabase response wrapper
   - `data.data` = the `data` column from the database row
   - `data.data` = your `MenuCategory[]` array

## Data Processing

### Processing Video URLs

The video URLs may have an `@` prefix that should be removed:

```typescript
function processVideoUrl(url: string): string {
  return url.startsWith('@') ? url.substring(1) : url
}
```

## Caching Strategy

### Option 1: Client-Side Caching

```typescript
// Cache menu data in localStorage or state management
const CACHE_KEY = 'menu_data_cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

async function fetchMenuDataWithCache() {
  // Check cache
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_DURATION) {
      return data
    }
  }

  // Fetch fresh data
  const data = await fetchMenuData()
  
  // Update cache
  if (data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }))
  }

  return data
}
```

### Option 2: Server-Side Caching (Next.js)

```typescript
// app/api/menu/route.ts with revalidation
export const revalidate = 300 // Revalidate every 5 minutes

export async function GET() {
  // ... fetch logic
}
```

## Error Handling

```typescript
async function fetchMenuDataSafe() {
  try {
    const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'
    
    const { data, error } = await supabase
      .from('dd-menu')
      .select('*')  // Select all columns (or use 'data' to select just the data column)
      .eq('id', MENU_DATA_ID)
      .single()

    if (error) {
      // Handle specific error codes
      if (error.code === 'PGRST116') {
        console.warn('Menu data not found, returning empty array')
        return []
      }
      throw error
    }

    // ⚠️ IMPORTANT: Validate and access the data column
    // data = Supabase response wrapper
    // data.data = the 'data' column from the database row
    if (!Array.isArray(data?.data)) {
      console.error('Invalid menu data structure')
      return []
    }

    return data.data as MenuCategory[]
  } catch (error: any) {
    console.error('Error fetching menu data:', error)
    
    // Fallback to empty array or cached data
    return []
  }
}
```

## Real-time Updates (Optional)

If you want to listen for real-time changes:

```typescript
import { RealtimeChannel } from '@supabase/supabase-js'

const MENU_DATA_ID = '00000000-0000-0000-0000-000000000001'

// Subscribe to changes
const channel: RealtimeChannel = supabase
  .channel('menu-data-changes')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'dd-menu',
      filter: `id=eq.${MENU_DATA_ID}`
    },
    (payload) => {
      console.log('Menu data updated!', payload)
      // Refresh your menu data
      fetchMenuData()
    }
  )
  .subscribe()

// Cleanup
// channel.unsubscribe()
```

## TypeScript Types

Create a types file: `types/menu.ts`

```typescript
export interface MediaItem {
  type: "image" | "video"
  src: string
  label?: string
}

export interface GalleryMediaItem {
  type: "image" | "video"
  src: string
}

export interface Service {
  title: string
  description: string
  image?: string
  heroMedia?: MediaItem
  fallbackVideo?: string
  price?: string
  duration?: string
  tags?: string[]
  media?: MediaItem[]
  galleryMedia?: GalleryMediaItem[]
}

export interface SubCategory {
  title: string
  subtitle: string
  description?: string
  video: string
  services: Service[]
}

export interface MenuCategory {
  title: string
  subtitle: string
  video: string
  subCategories?: SubCategory[]
  services?: Service[]
}

export type MenuData = MenuCategory[]
```

## Important Notes

1. **Single Record**: The table contains only one record with the fixed ID `00000000-0000-0000-0000-000000000001`

2. **JSONB Structure**: The `data` column is JSONB, so you get the full array structure directly

3. **Video URLs**: All video URLs should be YouTube Shorts format (vertical 9:16). The `@` prefix is supported and will be automatically removed during processing

4. **Hierarchy Rules**: 
   - A category can have EITHER `services` OR `subCategories`, never both
   - SubCategories always have a `services` array

5. **Optional Fields**: Many fields are optional (marked with `?`). Always check for existence before using them

6. **RLS Policies**: The table has Row Level Security enabled, but **read access is public** - anyone can fetch menu data without authentication. Only write/update operations require admin roles.

## Testing

```typescript
// Test function to verify data structure
function validateMenuData(data: any): data is MenuCategory[] {
  if (!Array.isArray(data)) return false
  
  return data.every(category => {
    return (
      typeof category.title === 'string' &&
      typeof category.subtitle === 'string' &&
      typeof category.video === 'string' &&
      (!category.services || Array.isArray(category.services)) &&
      (!category.subCategories || Array.isArray(category.subCategories))
    )
  })
}

// Usage
const menuData = await fetchMenuData()
if (validateMenuData(menuData)) {
  // TypeScript now knows menuData is MenuCategory[]
  console.log('Valid menu data:', menuData)
} else {
  console.error('Invalid menu data structure')
}
```

## Migration from Static Data

If you're migrating from static JSON files:

```typescript
// Old way (static import)
import menuData from '@/data/menu.json'

// New way (from database)
const menuData = await fetchMenuData()
```

## Troubleshooting

### Issue: "Cannot read property 'data' of undefined"

**Problem**: You're trying to access `data.data` but `data` is undefined.

**Solution**: Check for errors first:
```typescript
const { data, error } = await supabase
  .from('dd-menu')
  .select('*')
  .eq('id', MENU_DATA_ID)
  .single()

if (error) {
  console.error('Error:', error)
  return []
}

// Now safe to access data.data
return data?.data || []
```

### Issue: "data.data is not an array"

**Problem**: The `data` column might be null or not properly formatted.

**Solution**: Validate the structure:
```typescript
if (data && data.data && Array.isArray(data.data)) {
  return data.data as MenuCategory[]
}
return []
```

### Issue: "PGRST116 - No rows returned"

**Problem**: The record doesn't exist in the database.

**Solution**: Handle this error code (as shown in the reference implementation):
```typescript
if (error && error.code === 'PGRST116') {
  // Record doesn't exist - return empty array or create it
  return []
}
```

### Issue: "RLS policy violation"

**Problem**: Your Supabase client doesn't have the right permissions.

**Solution**: 
- Make sure you're using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service role key on frontend)
- **Menu data is publicly readable** - you don't need authentication to fetch it
- If you're getting RLS errors, check that the database policy allows public read access
- Verify your Supabase client is properly initialized with the correct URL and anon key
- You should NOT need to sign in users or check for roles to fetch menu data

### Issue: "Getting null or undefined"

**Problem**: You might be accessing the wrong property.

**Solution**: Remember the structure:
```typescript
// Supabase response structure:
{
  data: {           // ← This is the row from the database
    id: "...",
    data: [...],    // ← This is your MenuCategory[] array
    updated_at: "..."
  },
  error: null
}

// So you need: response.data.data
```

### Debugging Tips

1. **Log the full response**:
```typescript
const { data, error } = await supabase
  .from('dd-menu')
  .select('*')
  .eq('id', MENU_DATA_ID)
  .single()

console.log('Full response:', { data, error })
console.log('Menu data:', data?.data)
```

2. **Check the table directly in Supabase Dashboard**:
   - Go to Table Editor → `dd-menu`
   - Verify the record with ID `00000000-0000-0000-0000-000000000001` exists
   - Check that the `data` column contains a valid JSON array

3. **Test with a simple query**:
```typescript
// Test if you can query the table at all
const { data, error } = await supabase
  .from('dd-menu')
  .select('id, updated_at')
  .eq('id', MENU_DATA_ID)
  .single()

console.log('Test query result:', { data, error })
```

## Support

For questions or issues:
- Check `docs/todo.md` for the complete schema documentation
- Review the menu edition page at `/admin/menu-edition` to see the data structure
- Check the reference implementation in `app/admin/menu-edition/page.tsx` (lines 120-187)
- Contact the backend team for database-related issues

