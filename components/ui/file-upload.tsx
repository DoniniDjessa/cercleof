'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import toast from 'react-hot-toast'

interface FileUploadProps {
  type: 'image' | 'video'
  onUploadComplete: (url: string) => void
  currentUrl?: string
  label?: string
  folder?: string
  multiple?: boolean
  accept?: string
  disabled?: boolean
}

export function FileUpload({
  type,
  onUploadComplete,
  currentUrl,
  label,
  folder = 'menu',
  multiple = false,
  accept,
  disabled = false
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (multiple) {
      // Handle multiple files
      const fileArray = Array.from(files)
      for (const file of fileArray) {
        await uploadFile(file)
      }
    } else {
      // Handle single file
      await uploadFile(files[0])
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File) => {
    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide')
      return
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner un fichier vidéo valide')
      return
    }

    // Validate file size
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024 // 10MB for images, 100MB for videos
    if (file.size > maxSize) {
      toast.error(`La taille du fichier ne doit pas dépasser ${maxSize / 1024 / 1024}MB`)
      return
    }

    try {
      setUploading(true)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreview(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)
      formData.append('folder', folder)

      const response = await fetch('/api/upload/cloudinary', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      onUploadComplete(data.url)
      toast.success('Fichier uploadé avec succès!')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erreur lors de l\'upload')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const defaultAccept = type === 'image' 
    ? 'image/*' 
    : 'video/*'

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2 items-center">
        <Input
          ref={fileInputRef}
          type="file"
          accept={accept || defaultAccept}
          multiple={multiple}
          onChange={handleFileSelect}
          disabled={uploading || disabled}
          className="hidden"
          id={`file-upload-${type}-${folder}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || disabled}
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Upload...
            </>
          ) : (
            <>
              {type === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              Upload {type === 'image' ? 'Image' : 'Video'}
            </>
          )}
        </Button>

        {preview && !multiple && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {preview && !multiple && (
        <div className="mt-2">
          {type === 'image' ? (
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-auto max-h-32 rounded border"
            />
          ) : (
            <video
              src={preview}
              controls
              className="max-w-full h-auto max-h-32 rounded border"
            />
          )}
        </div>
      )}
    </div>
  )
}

