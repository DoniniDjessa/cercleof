'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
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
  Mic
} from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
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

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { t } = useTheme()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string>('')
  const [userProfile, setUserProfile] = useState<{ pseudo?: string; email?: string } | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    } else {
      setUserProfile(null)
      setUserRole('')
    }
  }, [user])

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
          name: 'Salon',
          icon: Scissors,
          href: '/admin/salon',
        },
        {
          name: 'Ventes',
          icon: ShoppingCart,
          children: [
            {
              name: 'Nouvelle Vente',
              href: '/admin/sales/create',
              icon: Plus,
            },
            {
              name: 'Liste Ventes',
              href: '/admin/sales',
              icon: List,
            },
            {
              name: 'Détails Vente',
              href: '/admin/sales/details',
              icon: Eye,
            },
          ]
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

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen bg-slate-50 dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 flex flex-col z-30 transition-colors duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-gray-800">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2 dark:space-x-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/cbmin.png" 
                alt="Cercle Of Logo" 
                className="w-8 h-8 object-contain rounded-lg"
              />
              <span className="font-bold text-sm text-blue-600 dark:text-white">
                Cercleof
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-8 h-8 mx-auto"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/cbmin.png" 
                alt="Cercle Of Logo" 
                className="w-8 h-8 object-contain rounded-lg"
              />
            </motion.div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="ml-auto h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-2 overflow-y-auto">
        {navigationSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-1">
            {/* Section Title */}
            {section.title && !isCollapsed && (
              <div className="px-2 py-1">
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="mt-0.5 h-px bg-slate-200 dark:bg-slate-700"></div>
              </div>
            )}

            {/* Section Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href))
                const Icon = item.icon

                return (
                  <div key={item.name}>
                    {/* Main Item */}
                    <div
                      className={cn(
                        "flex items-center space-x-2 px-2 py-1.5 rounded-lg transition-all duration-200 group relative cursor-pointer text-xs",
                        isActive
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200",
                        item.disabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (item.children) {
                          toggleExpanded(item.name)
                        } else if (item.href) {
                          window.location.href = item.href
                        }
                      }}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                      )} />
                      
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            key="content"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                            className="flex-1 flex items-center justify-between"
                          >
                            <span className="font-medium text-xs">{item.name}</span>
                            <div className="flex items-center space-x-2">
                              {item.badge && (
                                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                              {item.children && (
                                <ChevronDown className={cn(
                                  "h-4 w-4 transition-transform duration-200",
                                  expandedItems.has(item.name) ? "rotate-180" : ""
                                )} />
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Sub Items */}
                    {item.children && expandedItems.has(item.name) && !isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="ml-4 space-y-0.5 mt-0.5"
                      >
                        {item.children.map((child) => {
                          const isChildActive = pathname === child.href
                          const ChildIcon = child.icon

                          return (
                            <Link key={child.name} href={child.href || '#'}>
                              <div
                                className={cn(
                                  "flex items-center space-x-2 px-2 py-1 rounded-lg transition-all duration-200 group relative text-xs",
                                  isChildActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
                                )}
                              >
                                <ChildIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="font-medium text-xs">{child.name}</span>
                              </div>
                            </Link>
                          )
                        })}
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-2 border-t border-slate-200 dark:border-gray-800">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-100 dark:bg-gray-800">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                  <User className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {getUserDisplayName() || user?.email?.split('@')[0] || 'Utilisateur'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {userProfile ? `Travail sur ${getUserDisplayName()}` : t('nav.online')}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start text-slate-600 dark:text-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-900/20 dark:hover:text-slate-400"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('nav.signOut')}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center space-y-2"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                <User className="h-3 w-3 text-white" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-6 w-6 hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-900/20 dark:hover:text-slate-400"
                title={t('nav.signOut')}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
