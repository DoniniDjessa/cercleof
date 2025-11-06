'use client'

import { motion } from 'framer-motion'
import { BeautyLoader } from './beauty-loader'

interface LoadingScreenProps {
  message?: string
  showLogo?: boolean
}

export function LoadingScreen({ 
  message = 'Initializing your beauty experience...',
  showLogo = true 
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex flex-col items-center justify-center">
      {showLogo && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-col items-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/cbmin.png" 
            alt="Cercle Of Logo" 
            className="h-24 w-24 object-contain mb-4"
          />
          <h1 className="font-display text-4xl text-gray-900 mb-2">Cercle Of</h1>
          <p className="font-title text-xl text-gray-600 text-center">
            Beauty Institute Management
          </p>
        </motion.div>
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <BeautyLoader size="lg" />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="mt-8 text-center"
      >
        <p className="font-body text-sm text-gray-500">
          Please wait while we prepare everything for you
        </p>
      </motion.div>
    </div>
  )
}

// Quick loading overlay for forms
export function LoadingOverlay({ isVisible, message = 'Processing...' }: { 
  isVisible: boolean
  message?: string 
}) {
  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-white rounded-2xl p-8 shadow-sm"
      >
        <BeautyLoader size="md" />
      </motion.div>
    </motion.div>
  )
}
