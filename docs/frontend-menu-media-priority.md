# Frontend Menu Media Priority Guide

This document explains how to handle media (images and videos) in the menu data, with priority given to Cloudinary uploads over external links.

## Media Storage Strategy

The menu data can contain media from two sources:
1. **Cloudinary Uploads** (Priority) - Images and videos uploaded directly through the admin interface
2. **External Links** - YouTube, Pinterest, or Cloudinary links entered manually

## Priority Rules

### For Service Cover Images

**IMPORTANT**: Always prioritize Cloudinary URLs over external links (Pinterest, YouTube).

When displaying a service's cover image (e.g., for "soins de corps" service with 4 images/videos), use this priority order:

1. **First Cloudinary image from `galleryMedia`** (if exists and type is 'image' and URL is from Cloudinary)
   - This is the most common case: if a service has multiple images/videos in `galleryMedia`, use the **first Cloudinary image** as the cover
2. **Service `image` field** (if exists and is a Cloudinary URL)
3. **First Cloudinary image from `media` array** (if exists and type is 'image' and URL is from Cloudinary)
4. **Fallback to external links**: Service `image` field (even if Pinterest)
5. **Fallback**: First image from `media` array (even if external link)
6. **Final fallback**: Use a default placeholder

### For Service Videos

When displaying a service's video, use this priority order:

1. **First Cloudinary video from `galleryMedia`** (if exists and type is 'video')
2. **Service `fallbackVideo` field** (if exists)
3. **First video from `media` array** (if exists and type is 'video')
4. **Service `heroMedia`** (if exists and type is 'video')

### For Category Videos

When displaying a category video, use this priority order:

1. **Category `video` field** (if it's a Cloudinary URL - starts with `res.cloudinary.com`)
2. **Category `video` field** (if it's a YouTube URL)

## Implementation Example

### TypeScript Helper Functions

```typescript
/**
 * Check if a URL is from Cloudinary
 */
function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com')
}

/**
 * Get service cover image with priority
 * For services like "soins de corps" with 4 images/videos in galleryMedia,
 * use the first Cloudinary image as the cover
 */
function getServiceCoverImage(service: Service): string | null {
  // Priority 1: First Cloudinary image from galleryMedia
  // This is the most common case - galleryMedia often contains Cloudinary uploads
  if (service.galleryMedia && service.galleryMedia.length > 0) {
    const cloudinaryImage = service.galleryMedia.find(
      item => item.type === 'image' && isCloudinaryUrl(item.src)
    )
    if (cloudinaryImage) {
      return cloudinaryImage.src
    }
  }

  // Priority 2: Service image field (if Cloudinary)
  if (service.image && isCloudinaryUrl(service.image)) {
    return service.image
  }

  // Priority 3: First Cloudinary image from media array
  if (service.media) {
    const cloudinaryMediaImage = service.media.find(
      item => item.type === 'image' && isCloudinaryUrl(item.src)
    )
    if (cloudinaryMediaImage) {
      return cloudinaryMediaImage.src
    }
  }

  // Fallback 1: Use service.image even if not Cloudinary (Pinterest link)
  if (service.image) {
    return service.image
  }

  // Fallback 2: Use first image from media array (even if external link)
  if (service.media) {
    const firstImage = service.media.find(item => item.type === 'image')
    if (firstImage) {
      return firstImage.src
    }
  }

  // Fallback 3: Use first image from galleryMedia (even if external link)
  if (service.galleryMedia) {
    const firstImage = service.galleryMedia.find(item => item.type === 'image')
    if (firstImage) {
      return firstImage.src
    }
  }

  return null
}

/**
 * Get service video with priority
 */
function getServiceVideo(service: Service): string | null {
  // Priority 1: First Cloudinary video from galleryMedia
  if (service.galleryMedia) {
    const cloudinaryVideo = service.galleryMedia.find(
      item => item.type === 'video' && isCloudinaryUrl(item.src)
    )
    if (cloudinaryVideo) {
      return cloudinaryVideo.src
    }
  }

  // Priority 2: Fallback video (if Cloudinary)
  if (service.fallbackVideo && isCloudinaryUrl(service.fallbackVideo)) {
    return service.fallbackVideo
  }

  // Priority 3: First video from media array (if Cloudinary)
  if (service.media) {
    const cloudinaryMediaVideo = service.media.find(
      item => item.type === 'video' && isCloudinaryUrl(item.src)
    )
    if (cloudinaryMediaVideo) {
      return cloudinaryMediaVideo.src
    }
  }

  // Fallback: Use heroMedia if it's a video
  if (service.heroMedia && service.heroMedia.type === 'video') {
    return service.heroMedia.src
  }

  // Fallback: Use fallbackVideo even if not Cloudinary
  if (service.fallbackVideo) {
    return service.fallbackVideo
  }

  // Fallback: Use first video from media array
  if (service.media) {
    const firstVideo = service.media.find(item => item.type === 'video')
    if (firstVideo) {
      return firstVideo.src
    }
  }

  // Fallback: Use first video from galleryMedia
  if (service.galleryMedia) {
    const firstVideo = service.galleryMedia.find(item => item.type === 'video')
    if (firstVideo) {
      return firstVideo.src
    }
  }

  return null
}

/**
 * Get category video with priority
 */
function getCategoryVideo(category: MenuCategory): string {
  // Always use the video field (can be YouTube or Cloudinary)
  return category.video
}
```

## Data Structure Reference

```typescript
interface Service {
  title: string
  description: string
  image?: string  // Can be Pinterest or Cloudinary URL
  heroMedia?: MediaItem  // Can be image or video
  fallbackVideo?: string  // Can be YouTube or Cloudinary URL
  price?: string
  duration?: string
  tags?: string[]
  media?: MediaItem[]  // Array of images/videos
  galleryMedia?: GalleryMediaItem[]  // Array of images/videos (often Cloudinary uploads)
}

interface MediaItem {
  type: "image" | "video"
  src: string  // Can be Pinterest, YouTube, or Cloudinary URL
  label?: string
}

interface GalleryMediaItem {
  type: "image" | "video"
  src: string  // Often Cloudinary URLs from uploads
}
```

## Cloudinary URL Pattern

Cloudinary URLs typically follow this pattern:
```
https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
```

Example:
```
https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
```

## Important Notes

1. **Cloudinary Priority**: **ALWAYS prioritize Cloudinary URLs over external links** (Pinterest, YouTube) when both exist
2. **Gallery Media First**: The `galleryMedia` array often contains Cloudinary uploads and should be checked **first** for cover images
3. **Service Cover Image Rule**: For services like "soins de corps" with 4 images/videos in `galleryMedia`, **use the first Cloudinary image** as the cover image
4. **Fallback Chain**: Always have a fallback chain to ensure something is displayed even if Cloudinary media is not available
5. **Performance**: Cloudinary URLs are optimized and cached, making them faster than external links
6. **Upload vs Link**: Cloudinary uploads (from admin interface) are preferred over manually entered links

## Example Usage

```typescript
// Fetch menu data
const menuData = await fetchMenuData()

// Get a specific service
const service = menuData[0].services?.[0] // Example: "soins de corps"

// Get cover image with priority
const coverImage = getServiceCoverImage(service)
if (coverImage) {
  // Display the image
  console.log('Cover image:', coverImage)
} else {
  // Use default placeholder
  console.log('No cover image available')
}

// Get video with priority
const video = getServiceVideo(service)
if (video) {
  // Display the video
  console.log('Video:', video)
}
```

## Testing

To test media priority:

1. Create a service with both Cloudinary uploads and external links
2. Verify that Cloudinary URLs are used first
3. Verify fallback to external links when Cloudinary media is not available
4. Test with services that have multiple images/videos in `galleryMedia`

## Support

For questions or issues:
- Check the menu data structure in `docs/todo.md`
- Review the menu edition page at `/admin/menu-edition` to see how media is stored
- Contact the backend team for Cloudinary-related issues

