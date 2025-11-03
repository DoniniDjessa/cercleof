'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'
type Language = 'en' | 'fr'

interface ThemeContextType {
  theme: Theme
  language: Language
  toggleTheme: () => void
  toggleLanguage: () => void
  t: (key: string) => string
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// Translation keys
const translations = {
  en: {
    'app.title': 'The Cercle of beauty',
    'app.subtitle': 'The Cercle of beauty management system',
    'login.welcome': 'Welcome Back',
    'login.subtitle': 'Sign in to your account to continue',
    'login.emailOrUsername': 'Email or Username',
    'login.password': 'Password',
    'login.signIn': 'Sign In',
    'login.needAccount': 'Need an account?',
    'login.contactAdmin': 'Contact your administrator',
    'home.welcome': 'Beauty Institute Management',
    'home.subtitle': 'Welcome to Cercleof - Your comprehensive beauty institute solution',
    'home.userProfile': 'User Profile',
    'home.accountInfo': 'Your account information',
    'home.quickActions': 'Quick Actions',
    'home.commonTasks': 'Common tasks and navigation',
    'home.manageUsers': 'Manage Users',
    'home.fullAccess': 'Full Access',
    'home.posSystem': 'POS System',
    'home.appointments': 'Appointments',
    'home.analytics': 'Analytics',
    'home.comingSoon': 'Coming Soon',
    'home.signOut': 'Sign Out',
    'home.disconnect': 'Disconnect & Clear Session',
    'home.systemOverview': 'System Overview',
    'home.features': 'Beauty institute management features',
    'home.productManagement': 'Product Management',
    'home.serviceManagement': 'Service Management',
    'home.clientManagement': 'Client Management',
    'home.appointmentSystem': 'Appointment System',
    'home.posTransactions': 'POS & Transactions',
    'home.analyticsReports': 'Analytics & Reports',
    'home.productDesc': 'Manage beauty products inventory and pricing',
    'home.serviceDesc': 'Define and manage beauty services',
    'home.clientDesc': 'Track clients and their preferences',
    'home.appointmentDesc': 'Schedule and manage appointments',
    'home.posDesc': 'Point of sale and payment processing',
    'home.analyticsDesc': 'Performance tracking and insights',
    'nav.dashboard': 'Dashboard',
    'nav.users': 'Users',
    'nav.clients': 'Clients',
    'nav.pos': 'POS System',
    'nav.appointments': 'Appointments',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings',
    'nav.search': 'Search...',
    'nav.online': 'Online',
    'nav.signOut': 'Sign Out',
    'nav.profile': 'Profile',
    'dashboard.totalUsers': 'Total Users',
    'dashboard.totalRevenue': 'Total Revenue',
    'dashboard.appointments': 'Appointments',
    'dashboard.satisfaction': 'Satisfaction',
    'dashboard.manageUsersDesc': 'Manage staff and permissions',
    'dashboard.posSystemDesc': 'Point of sale system',
    'dashboard.appointmentsDesc': 'Schedule and manage bookings',
    'dashboard.analyticsDesc': 'View reports and insights',
    'dashboard.comingSoon': 'Coming Soon',
    'dashboard.viewOnly': 'View Only',
    'dashboard.getStarted': 'Get Started',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.recentActivityDesc': 'Latest updates and changes',
    'dashboard.activity.newUser': 'New user registered',
    'dashboard.activity.newAppointment': 'New appointment scheduled',
    'dashboard.activity.newSale': 'New sale completed',
    'dashboard.activity.newReview': 'New review received',
  },
  fr: {
    'app.title': 'The Cercle of beauty',
    'app.subtitle': 'The Cercle of beauty management system',
    'login.welcome': 'Bon Retour',
    'login.subtitle': 'Connectez-vous à votre compte pour continuer',
    'login.emailOrUsername': 'Email ou Nom d\'utilisateur',
    'login.password': 'Mot de passe',
    'login.signIn': 'Se connecter',
    'login.needAccount': 'Besoin d\'un compte?',
    'login.contactAdmin': 'Contactez votre administrateur',
    'home.welcome': 'Gestion d\'Institut de Beauté',
    'home.subtitle': 'Bienvenue à Cercleof - Votre solution complète d\'institut de beauté',
    'home.userProfile': 'Profil Utilisateur',
    'home.accountInfo': 'Informations de votre compte',
    'home.quickActions': 'Actions Rapides',
    'home.commonTasks': 'Tâches communes et navigation',
    'home.manageUsers': 'Gérer les Utilisateurs',
    'home.fullAccess': 'Accès Complet',
    'home.posSystem': 'Système de Caisse',
    'home.appointments': 'Rendez-vous',
    'home.analytics': 'Analyses',
    'home.comingSoon': 'Bientôt Disponible',
    'home.signOut': 'Se Déconnecter',
    'home.disconnect': 'Déconnecter et Effacer la Session',
    'home.systemOverview': 'Aperçu du Système',
    'home.features': 'Fonctionnalités de gestion d\'institut de beauté',
    'home.productManagement': 'Gestion des Produits',
    'home.serviceManagement': 'Gestion des Services',
    'home.clientManagement': 'Gestion des Clients',
    'home.appointmentSystem': 'Système de Rendez-vous',
    'home.posTransactions': 'Caisse et Transactions',
    'home.analyticsReports': 'Analyses et Rapports',
    'home.productDesc': 'Gérer l\'inventaire et les prix des produits de beauté',
    'home.serviceDesc': 'Définir et gérer les services de beauté',
    'home.clientDesc': 'Suivre les clients et leurs préférences',
    'home.appointmentDesc': 'Planifier et gérer les rendez-vous',
    'home.posDesc': 'Point de vente et traitement des paiements',
    'home.analyticsDesc': 'Suivi des performances et insights',
    'nav.dashboard': 'Tableau de Bord',
    'nav.users': 'Utilisateurs',
    'nav.clients': 'Clients',
    'nav.pos': 'Système de Caisse',
    'nav.appointments': 'Rendez-vous',
    'nav.analytics': 'Analyses',
    'nav.settings': 'Paramètres',
    'nav.search': 'Rechercher...',
    'nav.online': 'En ligne',
    'nav.signOut': 'Se déconnecter',
    'nav.profile': 'Profil',
    'dashboard.totalUsers': 'Total Utilisateurs',
    'dashboard.totalRevenue': 'Revenus Totaux',
    'dashboard.appointments': 'Rendez-vous',
    'dashboard.satisfaction': 'Satisfaction',
    'dashboard.manageUsersDesc': 'Gérer le personnel et les permissions',
    'dashboard.posSystemDesc': 'Système de point de vente',
    'dashboard.appointmentsDesc': 'Planifier et gérer les réservations',
    'dashboard.analyticsDesc': 'Voir les rapports et insights',
    'dashboard.comingSoon': 'Bientôt Disponible',
    'dashboard.viewOnly': 'Lecture Seule',
    'dashboard.getStarted': 'Commencer',
    'dashboard.recentActivity': 'Activité Récente',
    'dashboard.recentActivityDesc': 'Dernières mises à jour et changements',
    'dashboard.activity.newUser': 'Nouvel utilisateur enregistré',
    'dashboard.activity.newAppointment': 'Nouveau rendez-vous programmé',
    'dashboard.activity.newSale': 'Nouvelle vente complétée',
    'dashboard.activity.newReview': 'Nouvel avis reçu',
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'light'
    }
    return 'light'
  })
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('language') as Language) || 'en'
    }
    return 'en'
  })

  useEffect(() => {
    // Apply theme to document immediately
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [])

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language)
  }, [language])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'fr' : 'en')
  }

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  const value = {
    theme,
    language,
    toggleTheme,
    toggleLanguage,
    t,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
