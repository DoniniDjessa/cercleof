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
      color: 'from-pink-300 to-pink-600',
      bgColor: 'bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
    },
    {
      title: t('dashboard.totalRevenue'),
      value: '$12,450',
      change: '+8.2%',
      changeType: 'positive' as const,
      icon: DollarSign,
      color: 'from-pink-400 to-pink-700',
      bgColor: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    },
    {
      title: t('dashboard.appointments'),
      value: '156',
      change: '+23%',
      changeType: 'positive' as const,
      icon: Calendar,
      color: 'from-pink-500 to-pink-800',
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    },
    {
      title: t('dashboard.satisfaction'),
      value: '4.8',
      change: '+0.3',
      changeType: 'positive' as const,
      icon: Star,
      color: 'from-pink-200 to-pink-500',
      bgColor: 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
    },
  ]

  const quickActions = [
    {
      title: t('dashboard.manageUsers'),
      description: t('dashboard.manageUsersDesc'),
      icon: Users,
      href: '/admin/users',
      color: 'from-pink-300 to-pink-600',
      disabled: !userRole || !['superadmin', 'admin'].includes(userRole),
    },
    {
      title: t('dashboard.posSystem'),
      description: t('dashboard.posSystemDesc'),
      icon: ShoppingCart,
      href: '/pos',
      color: 'from-pink-400 to-pink-700',
      disabled: true,
    },
    {
      title: t('dashboard.appointments'),
      description: t('dashboard.appointmentsDesc'),
      icon: Calendar,
      href: '/appointments',
      color: 'from-pink-500 to-pink-800',
      disabled: true,
    },
    {
      title: t('dashboard.analytics'),
      description: t('dashboard.analyticsDesc'),
      icon: BarChart3,
      href: '/analytics',
      color: 'from-pink-200 to-pink-500',
      disabled: true,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className={`relative overflow-hidden hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300 group shadow-[0_0.5px_1px_rgba(0,0,0,0.03)] ${stat.bgColor}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
                    <div className="group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-8 w-8 text-pink-500" />
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
              <Card className={`relative overflow-hidden hover:shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300 group shadow-[0_0.5px_1px_rgba(0,0,0,0.03)] bg-white dark:bg-gray-800 ${
                action.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform duration-300 shadow-[0_0.5px_1px_rgba(0,0,0,0.03)]`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    {action.disabled && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full font-medium">
                        {t('dashboard.comingSoon')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                    {action.description}
                  </p>
                  <div className={`flex items-center text-sm font-medium ${
                    action.disabled 
                      ? 'text-gray-500 dark:text-gray-400' 
                      : 'text-pink-600 dark:text-pink-400 group-hover:text-pink-700 dark:group-hover:text-pink-300'
                  }`}>
                    {action.disabled ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('dashboard.viewOnly')}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-200" />
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
        <Card className="shadow-[0_0.5px_1px_rgba(0,0,0,0.03)] bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-xl font-bold">
              <div className="p-2 bg-gradient-to-r from-pink-300 to-pink-600 rounded-lg mr-3">
                <Clock className="h-5 w-5 text-white" />
              </div>
              {t('dashboard.recentActivity')}
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
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
                    className="flex items-center space-x-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                  >
                    <div className="p-3 bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/30 dark:to-pink-800/30 rounded-xl group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {activity.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
