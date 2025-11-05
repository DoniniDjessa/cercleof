/**
 * Image compression utility functions
 * Compresses images before uploading to reduce bucket size
 */

export interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 to 1.0
  maxSizeMB?: number // Maximum file size in MB
}

/**
 * Compress an image file using Canvas API
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed File object
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    maxSizeMB = 2
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // Create canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }
            
            // Check if compressed size is acceptable
            const sizeMB = blob.size / (1024 * 1024)
            
            if (sizeMB > maxSizeMB) {
              // Try again with lower quality
              canvas.toBlob(
                (lowerQualityBlob) => {
                  if (!lowerQualityBlob) {
                    reject(new Error('Failed to compress image'))
                    return
                  }
                  
                  const compressedFile = new File(
                    [lowerQualityBlob],
                    file.name,
                    { type: file.type || 'image/jpeg' }
                  )
                  resolve(compressedFile)
                },
                file.type || 'image/jpeg',
                Math.max(0.1, quality - 0.2)
              )
            } else {
              const compressedFile = new File(
                [blob],
                file.name,
                { type: file.type || 'image/jpeg' }
              )
              resolve(compressedFile)
            }
          },
          file.type || 'image/jpeg',
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }
      
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options?: CompressOptions
): Promise<File[]> {
  return Promise.all(files.map(file => compressImage(file, options)))
}

