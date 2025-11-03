'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BeautyLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BeautyLoader({ 
  size = 'md', 
  className
}: BeautyLoaderProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20'
  }

  return (
    <div className={cn("relative", className)}>
      {/* Outer rotating ring */}
      <motion.div
        className={cn(
          "absolute inset-0 border-3 border-transparent border-t-pink-300 border-r-pink-600 rounded-full",
          sizeClasses[size]
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Inner rotating ring */}
      <motion.div
        className={cn(
          "absolute inset-2 border-3 border-transparent border-b-pink-600 border-l-pink-300 rounded-full",
          size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : 'w-16 h-16'
        )}
        animate={{ rotate: -360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Center circle */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center",
        sizeClasses[size]
      )}>
        <motion.div
          animate={{
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "bg-gradient-to-br from-pink-300 to-pink-600 rounded-full",
            size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'
          )}
        />
      </div>
    </div>
  )
}

// Specialized loaders for different contexts
export function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <BeautyLoader size="lg" />
    </div>
  )
}

export function DataLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <BeautyLoader size="md" />
    </div>
  )
}

export function SaveLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <BeautyLoader size="sm" />
    </div>
  )
}
