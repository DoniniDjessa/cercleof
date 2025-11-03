'use client'

import { motion } from 'framer-motion'
import { BeautyLoader } from './beauty-loader'

// Authentication loading states
export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <BeautyLoader size="lg" />
    </div>
  )
}

// Data loading states
export function DataLoadingCard() {
  return (
    <div className="flex items-center justify-center py-12">
      <BeautyLoader size="md" />
    </div>
  )
}

// Form submission loading
export function FormLoadingState() {
  return (
    <div className="flex items-center justify-center py-6">
      <BeautyLoader size="sm" />
    </div>
  )
}

// Table loading state
export function TableLoadingState() {
  return (
    <div className="flex items-center justify-center py-8">
      <BeautyLoader size="md" />
    </div>
  )
}

// Profile setup loading
export function ProfileSetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <BeautyLoader size="lg" />
    </div>
  )
}

// Button loading state
export function ButtonLoadingSpinner() {
  return (
    <motion.div
      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  )
}
