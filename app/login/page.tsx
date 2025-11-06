'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTransition } from '@/components/ui/page-transition'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { ThemeToggle, LanguageToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/contexts/ThemeContext'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function LoginPage() {
  const [loginField, setLoginField] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, user } = useAuth()
  const { t } = useTheme()
  const router = useRouter()

  // Redirect if user is already authenticated
  useEffect(() => {
    if (user) {
      console.log('User already authenticated, redirecting to home...')
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Try to sign in with the field as email first
      const { error } = await signIn(loginField, password)
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        console.log('Login successful, redirecting to home...')
        // Small delay to ensure session is properly established
        setTimeout(() => {
          window.location.href = '/'
        }, 100)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex">
        {/* Theme and Language Toggle */}
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <ThemeToggle />
          <LanguageToggle />
        </div>

        {/* Left side - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-8 flex flex-col items-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/cbmin.png" 
                alt="Cercle Of Logo" 
                className="h-20 w-20 object-contain mb-4"
              />
              <h1 className="font-display text-5xl text-foreground mb-2">{t('app.title')}</h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="border-0 shadow-none bg-transparent">
                <CardHeader className="space-y-1 pb-8">
                  {/* <CardTitle className="font-title text-2xl text-center text-foreground">
                    {t('login.welcome')}
                  </CardTitle> */}
                  <CardDescription className="font-body text-center text-muted-foreground">
                    {t('login.subtitle')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="loginField" className="font-body text-sm font-medium text-foreground">
                        {t('login.emailOrUsername')}
                      </Label>
                      <Input
                        id="loginField"
                        type="text"
                        placeholder={t('login.emailOrUsername')}
                        value={loginField}
                        onChange={(e) => setLoginField(e.target.value)}
                        required
                        className="font-body"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="font-body text-sm font-medium text-foreground">
                        {t('login.password')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={t('login.password')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="font-body pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-full text-sm font-body"
                      >
                        {error}
                      </motion.div>
                    )}
                    <Button type="submit" className="w-full font-body text-base" disabled={loading}>
                      {loading ? <ButtonLoadingSpinner /> : t('login.signIn')}
                    </Button>
                  </form>
                  <div className="mt-6 text-center">
                    <p className="font-body text-sm text-muted-foreground">
                      {t('login.needAccount')}{' '}
                      <span className="text-pink-600 font-medium">
                        {t('login.contactAdmin')}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="hidden lg:flex lg:flex-1 relative">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80"
              alt="Beauty salon interior"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20"></div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
