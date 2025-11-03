'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'dots' | 'pulse' | 'wave' | 'beauty'
  className?: string
}

export function Loader({ 
  size = 'md', 
  variant = 'spinner', 
  className
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  if (variant === 'spinner') {
    return (
      <motion.div
        className={cn(
          "border-4 border-pink-200 border-t-pink-500 rounded-full",
          sizeClasses[size],
          className
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    )
  }

  if (variant === 'dots') {
    return (
      <div className={cn("flex space-x-2", className)}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={cn(
              "bg-pink-500 rounded-full",
              size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: index * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <motion.div
        className={cn(
          "bg-gradient-to-r from-pink-500 to-purple-600 rounded-full",
          sizeClasses[size],
          className
        )}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    )
  }

  if (variant === 'wave') {
    return (
      <div className={cn("flex space-x-1", className)}>
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.div
            key={index}
            className={cn(
              "bg-pink-500 rounded-full",
              size === 'sm' ? 'w-1 h-4' : size === 'md' ? 'w-1 h-6' : 'w-1 h-8'
            )}
            animate={{
              scaleY: [1, 2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'beauty') {
    return (
      <div className={cn("relative", className)}>
        <motion.div
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-sm opacity-75",
            sizeClasses[size]
          )}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className={cn(
            "relative bg-gradient-to-r from-pink-500 to-purple-600 rounded-full",
            sizeClasses[size]
          )}
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className={cn(
            "absolute inset-1 bg-white rounded-full flex items-center justify-center",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            💄
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}

// Page loader for full screen loading
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader variant="beauty" size="lg" />
    </div>
  )
}

// Inline loader for small spaces
export function InlineLoader() {
  return (
    <div className="flex items-center justify-center py-4">
      <Loader variant="dots" size="sm" />
    </div>
  )
}

// Button loader for loading states
export function ButtonLoader() {
  return <Loader variant="spinner" size="sm" />
}
