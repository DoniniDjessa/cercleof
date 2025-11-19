'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useVoiceNavigation } from '@/contexts/VoiceNavigationContext'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function VoiceNavigationButton() {
  const { isEnabled, isListening, isAlwaysListening, startListening, stopListening } = useVoiceNavigation()
  const [mounted, setMounted] = useState(false)
  const [isHolding, setIsHolding] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isEnabled) {
    return null
  }

  // OFF mode: Push-to-talk (click and hold to talk)
  // ON mode: Always listening (button is just an indicator)
  const handleMouseDown = () => {
    if (!isAlwaysListening) {
      setIsHolding(true)
      startListening()
    }
  }

  const handleMouseUp = () => {
    if (!isAlwaysListening) {
      setIsHolding(false)
      stopListening()
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    handleMouseDown()
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    handleMouseUp()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          size="lg"
          className={cn(
            "h-16 w-16 rounded-full shadow-lg select-none touch-none",
            isAlwaysListening
              ? (isListening
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white")
              : (isHolding || isListening
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                  : "bg-blue-600 hover:bg-blue-700 text-white")
          )}
          aria-label={
            isAlwaysListening
              ? (isListening ? "Écoute active" : "Écoute en attente")
              : (isListening ? "Relâchez pour arrêter" : "Maintenez pour parler")
          }
        >
          {isListening || isHolding ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
        {(isListening || isHolding) && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 rounded-full bg-red-600 opacity-30 -z-10"
          />
        )}
        {isAlwaysListening && isListening && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-green-600 opacity-20 -z-10"
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
