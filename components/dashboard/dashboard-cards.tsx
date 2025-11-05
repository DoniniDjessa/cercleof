'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Users, 
  ShoppingCart, 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  DollarSign,
  Clock,
  Star,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react'

interface DashboardCardsProps {
  userRole?: string
}

export function DashboardCards({ userRole }: DashboardCardsProps) {
  const { t } = useTheme()

  const stats = [
    {
      title: t('dashboard.totalUsers'),
      value: '24',
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'from-purple-300 to-purple-600',
      bgColor: 'bg-white dark:bg-gray-800',
    },
    {
      title: t('dashboard.totalRevenue'),
      value: '$12,450',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'from-purple-400 to-purple-700',
      bgColor: 'bg-white dark:bg-gray-800',
    },
    {
      title: t('dashboard.appointments'),
      value: '156',
      change: '+23%',
      changeType: 'positive' as const,
      icon: Calendar,
      color: 'from-purple-500 to-purple-800',
      bgColor: 'bg-white dark:bg-gray-800',
    },
    {
      title: t('dashboard.satisfaction'),
      value: '4.8',
      change: '+0.3',
      changeType: 'positive' as const,
      icon: Star,
      color: 'from-purple-200 to-purple-500',
      bgColor: 'bg-white dark:bg-gray-800',
    },
  ]

  const quickActions = [
    {
      title: t('dashboard.manageUsers'),
      description: t('dashboard.manageUsersDesc'),
      icon: Users,
      href: '/admin/users',
      color: 'from-purple-300 to-purple-600',
      disabled: !userRole || !['superadmin', 'admin'].includes(userRole),
    },
    {
      title: t('dashboard.posSystem'),
      description: t('dashboard.posSystemDesc'),
      icon: ShoppingCart,
      href: '/admin/pos',
      color: 'from-purple-400 to-purple-700',
      disabled: false,
    },
    {
      title: t('dashboard.appointments'),
      description: t('dashboard.appointmentsDesc'),
      icon: Calendar,
      href: '/admin/appointments',
      color: 'from-purple-500 to-purple-800',
      disabled: false,
    },
    {
      title: t('dashboard.analytics'),
      description: t('dashboard.analyticsDesc'),
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'from-purple-200 to-purple-500',
      disabled: false,
    },
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'user',
      message: t('dashboard.activity.newUser'),
      time: '2 minutes ago',
      icon: Users,
    },
    {
      id: 2,
      type: 'appointment',
      message: t('dashboard.activity.newAppointment'),
      time: '15 minutes ago',
      icon: Calendar,
    },
    {
      id: 3,
      type: 'revenue',
      message: t('dashboard.activity.newSale'),
      time: '1 hour ago',
      icon: DollarSign,
    },
    {
      id: 4,
      type: 'review',
      message: t('dashboard.activity.newReview'),
      time: '2 hours ago',
      icon: Star,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden hover:shadow-sm transition-all duration-300 group shadow-sm border border-gray-200 dark:border-gray-700 ${stat.bgColor}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {stat.value}
                      </p>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stat.changeType === 'positive' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {stat.change}
                      </div>
                    </div>
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon
          const ActionCard = (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`relative overflow-hidden hover:shadow-sm transition-all duration-300 group shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${
                action.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    {action.disabled && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full font-medium">
                        {t('dashboard.comingSoon')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {action.description}
                  </p>
                  <div className={`flex items-center text-xs font-medium ${
                    action.disabled 
                      ? 'text-gray-500 dark:text-gray-400' 
                      : 'text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300'
                  }`}>
                    {action.disabled ? (
                      <>
                        <Eye className="h-3 w-3 mr-2" />
                        {t('dashboard.viewOnly')}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3 w-3 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
                        {t('dashboard.getStarted')}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )

          return action.disabled ? ActionCard : (
            <Link key={action.title} href={action.href}>
              {ActionCard}
            </Link>
          )
        })}
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-sm font-semibold">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg mr-3">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              {t('dashboard.recentActivity')}
            </CardTitle>
            <CardDescription className="text-xs text-gray-600 dark:text-gray-400">
              {t('dashboard.recentActivityDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">
                        {activity.message}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
