'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import toast from 'react-hot-toast'

interface MultipleFileUploadProps {
  type: 'image' | 'video'
  onUploadComplete: (urls: string[]) => void
  currentUrls?: string[]
  label?: string
  folder?: string
  disabled?: boolean
}

export function MultipleFileUpload({
  type,
  onUploadComplete,
  currentUrls = [],
  label,
  folder = 'menu',
  disabled = false
}: MultipleFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [urls, setUrls] = useState<string[]>(currentUrls)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const newUrls: string[] = []

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      setUploadingIndex(i)
      const url = await uploadFile(file)
      if (url) {
        newUrls.push(url)
      }
    }

    const updatedUrls = [...urls, ...newUrls]
    setUrls(updatedUrls)
    onUploadComplete(updatedUrls)
    setUploadingIndex(null)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide')
      return null
    }

    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Veuillez sélectionner un fichier vidéo valide')
      return null
    }

    // Validate file size
    const maxSize = type === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`La taille du fichier ne doit pas dépasser ${maxSize / 1024 / 1024}MB`)
      return null
    }

    try {
      setUploading(true)

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
      toast.success('Fichier uploadé avec succès!')
      return data.url
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Erreur lors de l\'upload')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (index: number) => {
    const updatedUrls = urls.filter((_, i) => i !== index)
    setUrls(updatedUrls)
    onUploadComplete(updatedUrls)
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
          accept={defaultAccept}
          multiple
          onChange={handleFileSelect}
          disabled={uploading || disabled}
          className="hidden"
          id={`multiple-file-upload-${type}-${folder}`}
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
              Upload Multiple {type === 'image' ? 'Images' : 'Videos'}
            </>
          )}
        </Button>
      </div>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {urls.map((url, index) => (
            <div key={index} className="relative group">
              {type === 'image' ? (
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
              ) : (
                <video
                  src={url}
                  className="w-full h-24 object-cover rounded border"
                />
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(index)}
                disabled={uploading}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

