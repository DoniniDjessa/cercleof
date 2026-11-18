'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Calendar, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  UserPlus,
  List,
  PieChart,
  UserPlus as ClientPlus,
  Users as ClientsList,
  Eye,
  Package,
  PackagePlus,
  Package2,
  Scissors,
  Plus,
  List as ServiceList,
  Tag,
  CreditCard,
  Truck,
  TrendingUp,
  TrendingDown,
  Gift,
  Star,
  FileText,
  Activity,
  DollarSign,
  Clock,
  MapPin,
  Sparkles,
  MessageSquare,
  Camera,
  BarChart,
  Mic,
  Receipt,
  Edit
} from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  /** Mobile drawer state (below lg) */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

interface NavItem {
  name: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  disabled?: boolean
  children?: NavItem[]
  isExpanded?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

export function Sidebar({ isCollapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t } = useTheme()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('')
  const [userProfile, setUserProfile] = useState<{ pseudo?: string; email?: string } | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [pendingReceiptsCount, setPendingReceiptsCount] = useState<number>(0)

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchPendingReceiptsCount()
    } else {
      setUserProfile(null)
      setUserRole('')
      setPendingReceiptsCount(0)
    }
  }, [user])

  const fetchPendingReceiptsCount = async () => {
    if (!user?.id) return

    try {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('dd-pending_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

      if (error) {
        console.error('Error fetching pending receipts count:', error)
        return
      }

      setPendingReceiptsCount(count || 0)
    } catch (error) {
      console.error('Exception fetching pending receipts count:', error)
    }
  }

  const toggleExpanded = (itemName: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName)
    } else {
      newExpanded.add(itemName)
    }
    setExpandedItems(newExpanded)
  }

  const fetchUserProfile = async () => {
    if (!user?.id) {
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('dd-users')
        .select('role, pseudo, email')
        .eq('auth_user_id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // User not found in dd-users - don't disconnect immediately, might be a network issue
        console.log('Sidebar: User not found in dd-users, but continuing (might be network issue)')
        // Don't disconnect - let AuthContext handle it
        return
      }

      if (error) {
        console.error('Sidebar: Error fetching user profile:', error)
        // Don't disconnect on error - might be a network issue
        return
      }

      // Check if data exists and has pseudo or email
      if (!data || (!data.pseudo && !data.email)) {
        console.log('Sidebar: User has no pseudo or email, but continuing (might be temporary)')
        // Don't disconnect immediately - might be a temporary issue
        // Let AuthContext handle verification
        return
      }

      // User has valid pseudo or email - set profile
      setUserRole(data?.role || '')
      setUserProfile({ pseudo: data?.pseudo, email: data?.email })
    } catch (error) {
      console.error('Sidebar: Exception fetching user profile:', error)
    }
  }

  const getUserDisplayName = () => {
    // Prefer profile pseudo/email, fallback to auth user email
    if (userProfile) {
      return userProfile.pseudo || userProfile.email || null
    }
    // Fallback to auth user email while loading
    return user?.email?.split('@')[0] || null
  }

  const navigationSections: NavSection[] = [
    {
      title: '',
      items: [
        {
          name: t('nav.dashboard'),
          href: '/',
          icon: PieChart,
        },
      ]
    },
    {
      title: 'Gestion',
      items: [
        {
          name: t('nav.clients'),
          icon: UserCheck,
          children: [
            {
              name: 'Ajouter Client',
              href: '/admin/clients?action=create',
              icon: ClientPlus,
            },
            {
              name: 'Liste Clients',
              href: '/admin/clients',
              icon: ClientsList,
            },
            {
              name: 'Détails Client',
              href: '/admin/clients/details',
              icon: Eye,
            },
          ]
        },
        {
          name: 'Produits',
          icon: Package,
          children: [
            {
              name: 'Ajouter Produit',
              href: '/admin/products?action=create',
              icon: PackagePlus,
            },
            {
              name: 'Liste Produits',
              href: '/admin/products',
              icon: Package2,
            },
            {
              name: 'Détails Produit',
              href: '/admin/products/details',
              icon: Eye,
            },
            {
              name: 'Catégories Produits',
              href: '/admin/categories?type=product',
              icon: Tag,
            },
            {
              name: 'Gestion des Stocks',
              href: '/admin/stock',
              icon: Package,
            },
          ]
        },
        {
          name: 'Services',
          icon: Scissors,
          children: [
            {
              name: 'Ajouter Service',
              href: '/admin/services?action=create',
              icon: Plus,
            },
            {
              name: 'Liste Services',
              href: '/admin/services',
              icon: ServiceList,
            },
            {
              name: 'Détails Service',
              href: '/admin/services/details',
              icon: Eye,
            },
            {
              name: 'Catégories Services',
              href: '/admin/categories?type=service',
              icon: Tag,
            },
          ]
        },
        {
          name: 'Édition Menu',
          icon: Edit,
          href: '/admin/menu-edition',
        },
        // Only show Users section for admin and superadmin
        ...(userRole === 'admin' || userRole === 'superadmin' ? [{
          name: t('nav.users'),
          icon: Users,
          children: [
            {
              name: 'Ajouter Utilisateur',
              href: '/admin/users?action=create',
              icon: UserPlus,
            },
            {
              name: 'Liste Utilisateurs',
              href: '/admin/users',
              icon: List,
            },
          ]
        }] : []),
      ]
    },
    {
      title: 'Ventes & POS',
      items: [
        {
          name: 'Point de Vente',
          icon: ShoppingCart,
          href: '/admin/pos',
        },
        {
          name: 'Reçus en Attente',
          icon: Receipt,
          href: '/admin/pending-receipts',
          badge: pendingReceiptsCount > 0 ? pendingReceiptsCount.toString() : undefined,
        },
        {
          name: 'Salon',
          icon: Scissors,
          href: '/admin/salon',
        },
        {
          name: 'Rendez-vous',
          icon: Calendar,
          children: [
            {
              name: 'Nouveau RDV',
              href: '/admin/appointments/create',
              icon: Plus,
            },
            {
              name: 'Liste RDV',
              href: '/admin/appointments',
              icon: List,
            },
            {
              name: 'Calendrier',
              href: '/admin/appointments/calendar',
              icon: Calendar,
            },
          ]
        },
        {
          name: 'Livraisons',
          icon: Truck,
          children: [
            {
              name: 'Nouvelle Livraison',
              href: '/admin/deliveries/create',
              icon: Plus,
            },
            {
              name: 'Liste Livraisons',
              href: '/admin/deliveries',
              icon: List,
            },
            {
              name: 'Suivi Livraisons',
              href: '/admin/deliveries/tracking',
              icon: MapPin,
            },
          ]
        },
      ]
    },
    {
      title: 'Finances',
      items: [
        {
          name: 'Revenus',
          icon: TrendingUp,
          children: [
            {
              name: 'Nouveau Revenu',
              href: '/admin/revenues/create',
              icon: Plus,
            },
            {
              name: 'Liste Revenus',
              href: '/admin/revenues',
              icon: List,
            },
          ]
        },
        {
          name: 'Dépenses',
          icon: TrendingDown,
          children: [
            {
              name: 'Nouvelle Dépense',
              href: '/admin/expenses/create',
              icon: Plus,
            },
            {
              name: 'Liste Dépenses',
              href: '/admin/expenses',
              icon: List,
            },
          ]
        },
        {
          name: 'Promotions',
          icon: Gift,
          children: [
            {
              name: 'Nouvelle Promotion',
              href: '/admin/promotions/create',
              icon: Plus,
            },
            {
              name: 'Liste Promotions',
              href: '/admin/promotions',
              icon: List,
            },
          ]
        },
        {
          name: 'Fidélité',
          icon: Star,
          children: [
            {
              name: 'Cartes Fidélité',
              href: '/admin/loyalty',
              icon: Star,
            },
            {
              name: 'Points Clients',
              href: '/admin/loyalty/points',
              icon: Star,
            },
          ]
        },
      ]
    },
    {
      title: 'Analytics & Rapports',
      items: [
        {
          name: 'Tableau de Bord',
          icon: BarChart3,
          href: '/admin/analytics',
        },
        {
          name: 'Rapports',
          icon: FileText,
          children: [
            {
              name: 'Rapport Ventes',
              href: '/admin/reports/sales',
              icon: FileText,
            },
            {
              name: 'Rapport Clients',
              href: '/admin/reports/clients',
              icon: FileText,
            },
            {
              name: 'Rapport Produits',
              href: '/admin/reports/products',
              icon: FileText,
            },
            {
              name: 'Rapport Financier',
              href: '/admin/reports/financial',
              icon: FileText,
            },
          ]
        },
        {
          name: 'Notifications',
          icon: Bell,
          href: '/admin/notifications',
        },
        {
          name: 'Audit',
          icon: Activity,
          href: '/admin/audit',
        },
        {
          name: 'Actions',
          icon: Activity,
          href: '/admin/actions',
        },
      ]
    },
    {
      title: 'Assistant IA',
      items: [
        {
          name: 'Assistant Gemini',
          icon: Sparkles,
          href: '/admin/ai-assistant',
        },
        {
          name: 'Recommandation Produit',
          icon: MessageSquare,
          href: '/admin/ai-assistant?flow=recommendation',
        },
        {
          name: 'Analyse de Peau',
          icon: Camera,
          href: '/admin/ai-assistant?flow=skin-analysis',
        },
        {
          name: 'Questions Business',
          icon: BarChart,
          href: '/admin/ai-assistant?flow=business-query',
        },
        {
          name: 'Navigation Vocale',
          icon: Mic,
          href: '/admin/ai-assistant?flow=voice-nav',
        },
        {
          name: 'Paramètres',
          icon: Settings,
          href: '/admin/ai-assistant/settings',
        },
      ]
    }
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  // Current query string (some menu links differ only by ?flow= / ?type=)
  const [search, setSearch] = useState('')
  useEffect(() => {
    setSearch(typeof window !== 'undefined' ? window.location.search : '')
  }, [pathname])

  const isHrefActive = (href?: string) => {
    if (!href) return false
    const [path, query] = href.split('?')
    if (path !== pathname) return false
    if (!query) return !search || href === '/' || !navigationSections.some(sec => sec.items.some(it =>
      it.href?.startsWith(path + '?') && search === '?' + it.href.split('?')[1]
    ))
    return search === '?' + query
  }
  const isItemActive = (item: NavItem): boolean =>
    isHrefActive(item.href) || (item.children?.some(child => isHrefActive(child.href)) ?? false)

  // Open the group that holds the current page
  useEffect(() => {
    const active = navigationSections.flatMap(sec => sec.items).filter(it => it.children?.some(c => isHrefActive(c.href)))
    if (active.length) {
      setExpandedItems(prev => {
        const next = new Set(prev)
        active.forEach(it => next.add(it.name))
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search, userRole])

  const displayName = getUserDisplayName() || user?.email?.split('@')[0] || 'Utilisateur'
  const initial = displayName.charAt(0).toUpperCase()
  const roleLabel = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : t('nav.online')

  const handleParentClick = (item: NavItem) => {
    if (isCollapsed) {
      // Collapsed rail: open the menu on this group
      setExpandedItems(prev => new Set(prev).add(item.name))
      onToggle()
      return
    }
    toggleExpanded(item.name)
  }

  return (
    <aside
      className={cn('app-sidebar', isCollapsed && 'is-collapsed', mobileOpen && 'is-mobile-open')}
      aria-label="Menu principal"
    >
      {/* Brand */}
      <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-border px-4', isCollapsed && 'lg:justify-center lg:px-2')}>
        <Link href="/" className="flex min-w-0 items-center gap-3" onClick={onMobileClose}>
          <span className="brand-mark h-9 w-9 shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cbmin.png" alt="Cercle of Beauty" className="h-7 w-7 object-contain" />
          </span>
          <span className={cn('min-w-0', isCollapsed && 'lg:hidden')}>
            <span className="block truncate font-display text-base font-bold uppercase tracking-wide text-foreground">Cercle of Beauty</span>
            <span className="block truncate text-[11px] text-muted-foreground">Institut de beauté</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isCollapsed ? 'Déplier le menu' : 'Replier le menu'}
          className={cn('ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex', isCollapsed && 'lg:hidden')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          aria-label="Fermer le menu"
          className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-1">
            {section.title && !isCollapsed && <div className="nav-label">{section.title}</div>}
            {section.title && isCollapsed && <div className="mx-auto my-2 hidden h-px w-6 bg-border lg:block" />}
            {section.title && isCollapsed && <div className="nav-label lg:hidden">{section.title}</div>}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isItemActive(item)
                const expanded = expandedItems.has(item.name)

                if (!item.children) {
                  // Plain <a>: full navigation, as before (pages read their ?query on load)
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={cn('nav-item', active && 'is-active', isCollapsed && 'lg:justify-center lg:px-0')}
                    >
                      <Icon className="nav-icon" />
                      <span className={cn('flex-1 truncate', isCollapsed && 'lg:hidden')}>{item.name}</span>
                      {item.badge && <span className={cn('nav-badge', isCollapsed && 'lg:absolute lg:-right-1 lg:-top-1 lg:ml-0')}>{item.badge}</span>}
                    </a>
                  )
                }

                return (
                  <div key={item.name}>
                    <button
                      type="button"
                      onClick={() => handleParentClick(item)}
                      title={isCollapsed ? item.name : undefined}
                      aria-expanded={expanded}
                      className={cn('nav-item', active && 'is-parent-active', isCollapsed && 'lg:justify-center lg:px-0', isCollapsed && active && 'is-active')}
                    >
                      <Icon className="nav-icon" />
                      <span className={cn('flex-1 truncate', isCollapsed && 'lg:hidden')}>{item.name}</span>
                      <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180', isCollapsed && 'lg:hidden')} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className={cn('overflow-hidden', isCollapsed && 'lg:hidden')}
                        >
                          <div className="nav-sub">
                            {item.children.map((child) => (
                              <Link
                                key={child.name}
                                href={child.href || '#'}
                                onClick={onMobileClose}
                                aria-current={isHrefActive(child.href) ? 'page' : undefined}
                                className={cn('nav-subitem', isHrefActive(child.href) && 'is-active')}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Expand button on the collapsed rail */}
      {isCollapsed && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Déplier le menu"
          className="mx-auto mb-2 hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* User */}
      <div className="shrink-0 border-t border-border p-3">
        <div className={cn('flex items-center gap-3 rounded-lg p-2', isCollapsed && 'lg:flex-col lg:gap-2 lg:p-0')}>
          <span className="avatar avatar-sm" title={displayName}>{initial}</span>
          <div className={cn('min-w-0 flex-1', isCollapsed && 'lg:hidden')}>
            <p className="truncate text-sm font-bold text-foreground">{displayName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title={t('nav.signOut')}
            aria-label={t('nav.signOut')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
