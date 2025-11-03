'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
            className="relative overflow-hidden bg-gradient-to-r from-pink-300 to-pink-600 border-0 text-white hover:from-pink-400 hover:to-pink-700 transition-all duration-300"
      >
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex items-center justify-center"
        >
          {theme === 'light' ? (
            <div className="relative">
              <div className="w-4 h-4 bg-white rounded-full shadow-lg"></div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full"></div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
              <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full opacity-20"></div>
              <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full"></div>
              <div className="absolute top-2 left-2 w-0.5 h-0.5 bg-white rounded-full"></div>
            </div>
          )}
        </motion.div>
      </Button>
    </div>
  )
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useTheme()

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleLanguage}
        className="relative overflow-hidden bg-gradient-to-r from-blue-500 to-cyan-600 border-0 text-white hover:from-blue-600 hover:to-cyan-700 transition-all duration-300 font-bold"
      >
        <motion.div
          key={language}
          initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex items-center space-x-1"
        >
          <span className="text-sm font-bold">
            {language === 'en' ? '🇺🇸' : '🇫🇷'}
          </span>
          <span className="text-xs font-mono">
            {language.toUpperCase()}
          </span>
        </motion.div>
      </Button>
    </div>
  )
}
