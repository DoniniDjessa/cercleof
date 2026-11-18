'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { PageTransition } from '@/components/ui/page-transition'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { ThemeToggle, LanguageToggle } from '@/components/ui/theme-toggle'
import { useTheme } from '@/contexts/ThemeContext'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

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
        console.log('Login successful, checking user role for redirect...')
        // Small delay to ensure session is properly established
        setTimeout(async () => {
          try {
            // Get user role to determine redirect destination
            const supabase = createClient()
            const { data: { user: authUser } } = await supabase.auth.getUser()
            
            if (authUser) {
              const { data: userData } = await supabase
                .from('dd-users')
                .select('role')
                .eq('auth_user_id', authUser.id)
                .single()

              const role = userData?.role?.toLowerCase() || ''
              
              // Redirect admins to dashboard, others to POS
              if (['admin', 'superadmin', 'manager'].includes(role)) {
                window.location.href = '/'
              } else {
                window.location.href = '/admin/pos'
              }
            } else {
              window.location.href = '/admin/pos'
            }
          } catch (err) {
            console.error('Error checking user role:', err)
            // Default to POS on error
            window.location.href = '/admin/pos'
          }
        }, 200)
      }
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const [titleFirst, ...titleRest] = t('login.welcome').split(' ')

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  }
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const } },
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex bg-[rgb(var(--bg-body))]">
        {/* Left side - Login form (no frame) */}
        <div className="relative flex-1 flex flex-col overflow-hidden px-6 py-6 sm:px-12 lg:px-16 xl:px-24">
          <div className="login-rings" aria-hidden="true">
            <span className="r1" />
            <span className="r2" />
            <span className="r3" />
            <span className="glow" />
          </div>

          {/* Top bar: wordmark + toggles */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primary to-[rgb(var(--color-accent-2))]" />
              </span>
              <span className="font-anton text-xl uppercase text-foreground">Cercle of Beauty</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <LanguageToggle />
            </div>
          </motion.div>

          {/* Form */}
          <div className="relative z-10 flex flex-1 items-center">
            <motion.div variants={stagger} initial="hidden" animate="show" className="w-full max-w-md py-12">
              <motion.p variants={item} className="mb-5 font-script text-2xl leading-tight text-primary sm:text-3xl">
                {t('app.subtitle')}
              </motion.p>
              <motion.h1 variants={item} className="login-title font-anton">
                {titleFirst}
                {titleRest.length > 0 && <><br /><span className="accent">{titleRest.join(' ')}</span></>}
              </motion.h1>
              <motion.p variants={item} className="mt-4 text-base text-muted-foreground">
                {t('login.subtitle')}
              </motion.p>

              <form onSubmit={handleSubmit} className="mt-10 space-y-7">
                <motion.div variants={item} className="login-field">
                  <input
                    id="loginField"
                    type="text"
                    placeholder=" "
                    autoComplete="username"
                    value={loginField}
                    onChange={(e) => setLoginField(e.target.value)}
                    required
                  />
                  <label htmlFor="loginField">{t('login.emailOrUsername')}</label>
                </motion.div>

                <motion.div variants={item} className="login-field">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder=" "
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <label htmlFor="password">{t('login.password')}</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-0 bottom-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </motion.div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, x: [0, -6, 6, -3, 0] }}
                    transition={{ duration: 0.4 }}
                    className="badge-danger rounded-lg border px-4 py-3 text-sm font-semibold"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.div variants={item}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary to-[rgb(var(--color-accent-2))] text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-[0_10px_30px_-10px_rgb(var(--color-primary)/0.7)] transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    {loading ? <ButtonLoadingSpinner /> : (
                      <>
                        {t('login.signIn')}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </motion.div>
              </form>

              <motion.p variants={item} className="mt-8 text-sm text-muted-foreground">
                {t('login.needAccount')}{' '}
                <span className="font-bold text-foreground">{t('login.contactAdmin')}</span>
              </motion.p>
            </motion.div>
          </div>

          <p className="relative z-10 text-xs text-muted-foreground">© {new Date().getFullYear()} Cercle of Beauty</p>
        </div>

        {/* Right side - Image */}
        <div className="hidden lg:flex lg:flex-1 relative overflow-hidden">
          <div className="absolute inset-0 login-photo">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80"
              alt="Beauty salon interior"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-purple-900/30" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute bottom-12 left-12 right-12 text-white"
          >
            <p className="font-anton text-6xl uppercase leading-none xl:text-7xl">Cercle of<br />Beauty</p>
            <div className="mt-4 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-[rgb(var(--color-accent-2))]" />
            <p className="mt-4 max-w-sm font-script text-2xl leading-snug text-white/90">{t('app.subtitle')}</p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
