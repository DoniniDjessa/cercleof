'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X, Loader2, Image as ImageIcon, Video } from 'lucide-react'
import toast from 'react-hot-toast'

interface MixedFileUploadProps {
  onUploadComplete: (items: Array<{ type: 'image' | 'video', src: string }>) => void
  currentItems?: Array<{ type: 'image' | 'video', src: string }>
  label?: string
  folder?: string
  disabled?: boolean
}

export function MixedFileUpload({
  onUploadComplete,
  currentItems = [],
  label,
  folder = 'menu',
  disabled = false
}: MixedFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [items, setItems] = useState<Array<{ type: 'image' | 'video', src: string }>>(currentItems)
  const [selectedType, setSelectedType] = useState<'image' | 'video'>('image')
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    const newItems: Array<{ type: 'image' | 'video', src: string }> = []

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      setUploadingIndex(i)
      const url = await uploadFile(file, type)
      if (url) {
        newItems.push({ type, src: url })
      }
    }

    const updatedItems = [...items, ...newItems]
    setItems(updatedItems)
    onUploadComplete(updatedItems)
    setUploadingIndex(null)

    // Reset input
    if (type === 'image' && imageInputRef.current) {
      imageInputRef.current.value = ''
    }
    if (type === 'video' && videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
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
      formData.append('folder', `${folder}/${type}s`)

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
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
    onUploadComplete(updatedItems)
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex gap-2 items-center">
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as 'image' | 'video')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>

        <Input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFileSelect(e, 'image')}
          disabled={uploading || disabled || selectedType !== 'image'}
          className="hidden"
          id={`mixed-file-upload-image-${folder}`}
        />
        <Input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={(e) => handleFileSelect(e, 'video')}
          disabled={uploading || disabled || selectedType !== 'video'}
          className="hidden"
          id={`mixed-file-upload-video-${folder}`}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || disabled}
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => {
            if (selectedType === 'image') {
              imageInputRef.current?.click()
            } else {
              videoInputRef.current?.click()
            }
          }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Upload...
            </>
          ) : (
            <>
              {selectedType === 'image' ? <ImageIcon className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              Upload {selectedType === 'image' ? 'Images' : 'Videos'}
            </>
          )}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {items.map((item, index) => (
            <div key={index} className="relative group">
              {item.type === 'image' ? (
                <img
                  src={item.src}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-24 object-cover rounded border"
                />
              ) : (
                <video
                  src={item.src}
                  className="w-full h-24 object-cover rounded border"
                />
              )}
              <div className="absolute top-1 left-1">
                <Badge variant="secondary" className="text-xs">
                  {item.type === 'image' ? 'IMG' : 'VID'}
                </Badge>
              </div>
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

