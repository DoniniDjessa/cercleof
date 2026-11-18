'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

const iconButton =
  'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'light' ? 'sombre' : 'clair'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={iconButton}
      title={`Passer en mode ${next}`}
      aria-label={`Passer en mode ${next}`}
    >
      <motion.span
        key={theme}
        initial={{ scale: 0.4, rotate: -90, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        {theme === 'light' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
      </motion.span>
    </button>
  )
}

export function LanguageToggle() {
  const { language, toggleLanguage } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`${iconButton} text-[11px] font-extrabold`}
      title={language === 'en' ? 'Passer en français' : 'Switch to English'}
      aria-label={language === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      {language === 'en' ? 'EN' : 'FR'}
    </button>
  )
}
