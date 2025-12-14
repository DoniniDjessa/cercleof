import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

// Maximum file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB

export async function POST(request: NextRequest) {
  try {
    // Check Cloudinary configuration
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: 'Cloudinary configuration missing. Please check your environment variables.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'image' or 'video'
    const folder = formData.get('folder') as string || 'menu' // folder path in Cloudinary

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid image file type' },
        { status: 400 }
      )
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid video file type' },
        { status: 400 }
      )
    }

    // Validate file size
    if (type === 'image' && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image size exceeds ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    if (type === 'video' && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: `Video size exceeds ${MAX_VIDEO_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let uploadBuffer: Buffer = buffer
    let resourceType: 'image' | 'video' = type === 'video' ? 'video' : 'image'

    // Compress images before upload
    if (type === 'image') {
      try {
        // Compress image using sharp
        const compressedBuffer = await sharp(buffer)
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer()
        uploadBuffer = compressedBuffer
      } catch (error) {
        console.error('Error compressing image:', error)
        // If compression fails, use original buffer
        uploadBuffer = buffer
      }
    }

    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder: folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      }

      // Add compression settings for images
      if (type === 'image') {
        uploadOptions.quality = 'auto:good'
        uploadOptions.fetch_format = 'auto'
      }

      // Add video optimization settings
      if (type === 'video') {
        uploadOptions.quality = 'auto'
        uploadOptions.fetch_format = 'auto'
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            reject(
              NextResponse.json(
                { error: 'Failed to upload file to Cloudinary', details: error.message },
                { status: 500 }
              )
            )
            return
          }

          if (!result) {
            reject(
              NextResponse.json(
                { error: 'No result from Cloudinary upload' },
                { status: 500 }
              )
            )
            return
          }

          resolve(
            NextResponse.json({
              url: result.secure_url,
              public_id: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
              resource_type: result.resource_type,
            })
          )
        }
      )

      uploadStream.end(uploadBuffer)
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

