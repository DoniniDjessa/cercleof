'use client'

import { motion } from 'framer-motion'
import { Button, ButtonProps } from './button'
import { ReactNode } from 'react'

interface AnimatedButtonProps extends ButtonProps {
  children: ReactNode
  delay?: number
  scale?: number
}

export function AnimatedButton({ 
  children, 
  delay = 0, 
  scale = 0.95,
  ...props 
}: AnimatedButtonProps) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.25, 0.25, 0.25, 0.75]
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale }}
    >
      <Button {...props}>
        {children}
      </Button>
    </motion.div>
  )
}
