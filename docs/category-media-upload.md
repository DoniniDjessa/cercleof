# Category and Subcategory Media Upload Feature

This document explains the image and video upload functionality that has been added to categories and subcategories in the admin interface.

## Overview

Categories and subcategories can now have both **images** and **videos** uploaded directly through the admin interface. These media files are stored in Cloudinary and can be used to enhance the visual presentation of categories in the frontend.

## Features

### Supported Media Types

1. **Images**
   - Formats: JPG, PNG, WebP
   - Maximum size: 10MB
   - Automatic compression before upload
   - Optimized for web display (max 1920x1920px, quality 85%)

2. **Videos**
   - Formats: MP4, MOV, AVI
   - Maximum size: 100MB
   - Stored in Cloudinary with automatic optimization

### Upload Methods

- **File Picker**: Click "Choisir une image" or "Choisir une vidéo" to select from device
- **Camera Capture**: Click "Caméra" button to take a photo directly (images only)
- **Preview**: See a preview of the selected media before uploading
- **Remove**: Clear selected media with the remove button
- **Manual URL Input**: For subcategories, you can also manually enter YouTube or Cloudinary video URLs

## Implementation Locations

### 1. Category Management (`/admin/categories`)

**Component**: `components/categories/add-category.tsx`

This component handles creating and editing categories and subcategories in the category management system.

**Features**:
- Works for both product and service categories
- Supports parent categories and subcategories
- Image and video upload via Cloudinary
- Edit mode preserves existing media

**Usage**:
- Navigate to `/admin/categories?type=product` or `/admin/categories?type=service`
- Click "Add Category" or edit an existing category
- Use the media upload section to add images or videos

### 2. Menu Edition (`/admin/menu-edition`)

**Component**: `app/admin/menu-edition/page.tsx` - `SubCategoryForm`

This component handles creating and editing subcategories in the menu data structure.

**Features**:
- Only **title** is required
- Subtitle, description, and media are all optional
- Image and video upload via Cloudinary
- Manual video URL input (YouTube or Cloudinary) as fallback
- Edit mode preserves existing media

**Usage**:
- Navigate to `/admin/menu-edition`
- Click "Add SubCategory" or edit an existing subcategory
- Use the media upload section to add images or videos
- Or manually enter a video URL

## Database Schema

### Fields Added to `dd-categories` Table

```sql
ALTER TABLE "dd-categories" 
ADD COLUMN IF NOT EXISTS image TEXT;

ALTER TABLE "dd-categories" 
ADD COLUMN IF NOT EXISTS video TEXT;
```

- **`image`**: Stores the Cloudinary URL for category images
- **`video`**: Stores the Cloudinary URL for category videos

### Migration File

Run the migration to add these fields:
```sql
-- File: database/migration-add-image-to-categories.sql
```

### Menu Data Structure

For subcategories in the menu data (stored in `dd-menu-data` table):

```typescript
interface SubCategory {
  title: string          // Required
  subtitle?: string     // Optional
  description?: string  // Optional
  video?: string        // Optional (YouTube or Cloudinary URL)
  image?: string        // Optional (Cloudinary URL)
  services: Service[]
}
```

## Component Implementation

### Category Form (`components/categories/add-category.tsx`)

#### Key Functions

**Media Upload Handler**
```typescript
const handleMediaUpload = async (
  file: File | null, 
  type: 'image' | 'video', 
  compress: boolean = true
)
```
- Validates file type and size
- Compresses images automatically
- Creates preview for both images and videos
- Sets appropriate state based on media type

**Cloudinary Upload**
```typescript
const uploadMedia = async (): Promise<{
  imageUrl: string | null, 
  videoUrl: string | null
}>
```
- Uploads image to Cloudinary (if image selected)
- Uploads video to Cloudinary (if video selected)
- Returns URLs for both media types
- Handles errors gracefully

#### State Management

```typescript
const [categoryImage, setCategoryImage] = useState<File | null>(null)
const [categoryVideo, setCategoryVideo] = useState<File | null>(null)
const [mediaPreview, setMediaPreview] = useState<string | null>(null)
const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
const [uploadingMedia, setUploadingMedia] = useState(false)
```

### SubCategory Form (`app/admin/menu-edition/page.tsx`)

#### Key Functions

Similar to the category form, with additional support for:
- Manual video URL input
- Only title validation (subtitle, description, media are optional)

#### State Management

```typescript
const [subCategoryImage, setSubCategoryImage] = useState<File | null>(null)
const [subCategoryVideo, setSubCategoryVideo] = useState<File | null>(null)
const [mediaPreview, setMediaPreview] = useState<string | null>(null)
const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
const [uploadingMedia, setUploadingMedia] = useState(false)
```

## API Integration

### Cloudinary Upload Endpoint

**Endpoint**: `/api/upload/cloudinary`

**Method**: `POST`

**Request Body** (FormData):
```javascript
{
  file: File,           // The media file
  type: 'image' | 'video',  // Media type
  folder: 'categories'   // Cloudinary folder
}
```

**Response**:
```json
{
  "url": "https://res.cloudinary.com/...",
  "public_id": "...",
  "width": 1920,
  "height": 1080,
  "format": "jpg",
  "bytes": 123456,
  "resource_type": "image"
}
```

## Usage in Frontend

### Displaying Category Media

When displaying categories in the frontend, you can access the media URLs from the category object:

```typescript
interface Category {
  id: string
  name: string
  description?: string
  type: 'product' | 'service'
  parent_id?: string
  image?: string      // Cloudinary URL for image
  video?: string      // Cloudinary URL for video
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### Displaying SubCategory Media (Menu Data)

```typescript
interface SubCategory {
  title: string
  subtitle?: string
  description?: string
  video?: string      // YouTube or Cloudinary URL
  image?: string      // Cloudinary URL
  services: Service[]
}
```

### Priority Rules for Display

When displaying category/subcategory media, follow this priority:

1. **If `image` exists**: Display the image
2. **If `video` exists and no image**: Display the video
3. **If neither exists**: Use a default placeholder

### Example Implementation

```typescript
function CategoryCard({ category }: { category: Category }) {
  const getMediaElement = () => {
    if (category.image) {
      return (
        <img 
          src={category.image} 
          alt={category.name}
          className="category-image"
        />
      )
    }
    
    if (category.video) {
      return (
        <video 
          src={category.video} 
          controls
          className="category-video"
        />
      )
    }
    
    return <div className="category-placeholder">No media</div>
  }
  
  return (
    <div className="category-card">
      {getMediaElement()}
      <h3>{category.name}</h3>
    </div>
  )
}
```

## Cloudinary Configuration

### Folder Structure

Media files are organized in Cloudinary as follows:
```
categories/
  ├── [category-id]-[timestamp].jpg
  ├── [category-id]-[timestamp].mp4
  └── ...
```

### Environment Variables

Ensure these are set in `.env.local`:
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## User Experience

### Upload Flow

1. User navigates to category/subcategory creation/edit page
2. User clicks "Choisir une image" or "Choisir une vidéo" (or "Image"/"Vidéo" for subcategories)
3. File picker opens (or camera for images)
4. User selects/takes media
5. Preview appears immediately
6. User fills in other category/subcategory details
7. On form submission:
   - Media uploads to Cloudinary
   - Category/subcategory data saves to database with media URLs
   - Success message displayed

### Edit Mode

- Existing images/videos are loaded and displayed in preview
- User can replace existing media by selecting new files
- If no new media selected, existing media URLs are preserved
- User can remove media using the remove button

### Validation Rules

#### Categories (`/admin/categories`)
- **Name**: Required
- **Description**: Optional
- **Image/Video**: Optional
- **Parent Category**: Optional (for service categories)

#### SubCategories (`/admin/menu-edition`)
- **Title**: Required
- **Subtitle**: Optional
- **Description**: Optional
- **Image/Video**: Optional
- **Video URL**: Optional (can be manually entered)

## Error Handling

The components handle various error scenarios:

- **Invalid file type**: Shows error toast
- **File too large**: Shows error with size limit
- **Upload failure**: Shows error, prevents form submission
- **Network errors**: Gracefully handled with user feedback
- **Missing required fields**: Shows validation error

## Technical Details

### Image Compression

Images are automatically compressed before upload using the `compressImage` utility:
- Maximum dimensions: 1920x1920px
- Quality: 85%
- Format: JPEG with progressive encoding
- Maximum file size: 2MB after compression

### Video Handling

Videos are uploaded as-is to Cloudinary:
- Cloudinary handles video optimization automatically
- No client-side compression for videos
- Supports common video formats

### Preview Generation

- Uses `FileReader` API to create data URLs for preview
- Preview shows immediately after file selection
- No server round-trip needed for preview

## Testing Checklist

When testing the feature:

### Category Management (`/admin/categories`)
- [ ] Upload image to new category
- [ ] Upload video to new category
- [ ] Upload image to existing category (edit mode)
- [ ] Upload video to existing category (edit mode)
- [ ] Replace existing image with new image
- [ ] Replace existing video with new video
- [ ] Remove media from category
- [ ] Test with large files (near size limits)
- [ ] Test with invalid file types
- [ ] Test camera capture (mobile devices)
- [ ] Verify Cloudinary folder structure
- [ ] Verify database stores URLs correctly

### Menu Edition (`/admin/menu-edition`)
- [ ] Create subcategory with only title (no subtitle, description, or media)
- [ ] Upload image to new subcategory
- [ ] Upload video to new subcategory
- [ ] Upload image to existing subcategory (edit mode)
- [ ] Upload video to existing subcategory (edit mode)
- [ ] Replace existing image with new image
- [ ] Replace existing video with new video
- [ ] Remove media from subcategory
- [ ] Enter manual video URL (YouTube)
- [ ] Enter manual video URL (Cloudinary)
- [ ] Test with large files (near size limits)
- [ ] Test with invalid file types
- [ ] Test camera capture (mobile devices)
- [ ] Verify Cloudinary folder structure
- [ ] Verify menu data stores URLs correctly

## Differences Between Category and SubCategory Forms

### Category Form (`/admin/categories`)
- Used for managing product/service categories
- Stores data in `dd-categories` table
- Name is required
- Parent category selection available for service categories
- Full image/video upload support

### SubCategory Form (`/admin/menu-edition`)
- Used for managing menu data subcategories
- Stores data in `dd-menu-data` table (JSON structure)
- Only title is required
- Subtitle, description, and media are optional
- Supports both upload and manual URL input for videos
- Part of the menu editing interface

## Future Enhancements

Potential improvements for future iterations:

1. **Multiple Images**: Support for image galleries
2. **Video Thumbnails**: Auto-generate thumbnails for videos
3. **Media Library**: Browse and reuse previously uploaded media
4. **Drag & Drop**: Drag and drop files for upload
5. **Progress Indicator**: Show upload progress for large files
6. **Media Cropping**: Built-in image cropping tool
7. **Format Conversion**: Automatic format optimization
8. **Bulk Upload**: Upload multiple media files at once

## Related Documentation

- [Frontend Menu Media Priority](./frontend-menu-media-priority.md) - How to prioritize media in menu display
- [Cloudinary Upload API](../app/api/upload/cloudinary/route.ts) - Upload endpoint implementation
- [Menu Data Structure](./frontend-menu-data-fetch.md) - Menu data structure documentation

## Support

For issues or questions:
1. Check Cloudinary dashboard for upload status
2. Verify environment variables are set correctly
3. Check browser console for errors
4. Verify database migration has been run
5. Check that both category and subcategory forms have upload buttons visible

## Summary

The media upload feature is now fully implemented for both:
- **Categories** in the category management system (`/admin/categories`)
- **SubCategories** in the menu edition system (`/admin/menu-edition`)

Both support:
- Image uploads (with automatic compression)
- Video uploads
- Camera capture for images
- Preview before submission
- Edit mode with media preservation
- Remove functionality

The only difference is that subcategories in menu edition also support manual video URL input and have more relaxed validation (only title required).

---

**Last Updated**: [Current Date]
**Version**: 2.0.0
