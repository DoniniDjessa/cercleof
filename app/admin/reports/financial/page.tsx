"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ButtonLoadingSpinner } from '@/components/ui/context-loaders'
import { 
  FileText, 
  Calendar, 
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface FinancialReport {
  total_revenue: number
  total_expenses: number
  net_profit: number
  profit_margin: number
  revenue_by_month: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
  expenses_by_category: Array<{
    category: string
    amount: number
    percentage: number
  }>
  revenue_by_source: Array<{
    source: string
    amount: number
    percentage: number
  }>
}

export default function FinancialReportPage() {
  const [report, setReport] = useState<FinancialReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchFinancialReport()
    }
  }, [startDate, endDate])

  const fetchFinancialReport = async () => {
    try {
      setLoading(true)

      // Fetch revenues data
      const { data: revenues, error: revenuesError } = await supabase
        .from('dd-revenues')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (revenuesError) {
        console.error('Error fetching revenues:', revenuesError)
        toast.error('Erreur lors du chargement des revenus')
        return
      }

      // Fetch expenses data
      const { data: expenses, error: expensesError } = await supabase
        .from('dd-depenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      if (expensesError) {
        console.error('Error fetching expenses:', expensesError)
        toast.error('Erreur lors du chargement des dépenses')
        return
      }

      // Calculate report data
      const totalRevenue = revenues?.reduce((sum, revenue) => sum + (revenue.amount || 0), 0) || 0
      const totalExpenses = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0
      const netProfit = totalRevenue - totalExpenses
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // Revenue by month
      const revenueByMonth: { [key: string]: { revenue: number; expenses: number; profit: number } } = {}
      
      revenues?.forEach(revenue => {
        const month = new Date(revenue.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].revenue += revenue.amount || 0
      })

      expenses?.forEach(expense => {
        const month = new Date(expense.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].expenses += expense.amount || 0
      })

      const revenueByMonthArray = Object.entries(revenueByMonth)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.revenue - data.expenses
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

      // Expenses by category
      const expensesByCategory: { [key: string]: number } = {}
      expenses?.forEach(expense => {
        const category = expense.category || 'Autres'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.amount || 0)
      })

      const expensesByCategoryArray = Object.entries(expensesByCategory)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      // Revenue by source
      const revenueBySource: { [key: string]: number } = {}
      revenues?.forEach(revenue => {
        const source = revenue.source || 'Autres'
        revenueBySource[source] = (revenueBySource[source] || 0) + (revenue.amount || 0)
      })

      const revenueBySourceArray = Object.entries(revenueBySource)
        .map(([source, amount]) => ({
          source,
          amount,
          percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      setReport({
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        profit_margin: profitMargin,
        revenue_by_month: revenueByMonthArray,
        expenses_by_category: expensesByCategoryArray,
        revenue_by_source: revenueBySourceArray
      })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Erreur lors de la génération du rapport')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!report) return

    const csvContent = [
      ['Rapport Financier', '', '', ''],
      ['Période', `${startDate} au ${endDate}`, '', ''],
      ['', '', '', ''],
      ['Métriques', 'Valeur', '', ''],
      ['Revenus Total', `${report.total_revenue.toLocaleString()} XOF`, '', ''],
      ['Dépenses Total', `${report.total_expenses.toLocaleString()} XOF`, '', ''],
      ['Profit Net', `${report.net_profit.toLocaleString()} XOF`, '', ''],
      ['Marge de Profit', `${report.profit_margin.toFixed(2)}%`, '', ''],
      ['', '', '', ''],
      ['Revenus par Mois', 'Revenus', 'Dépenses', 'Profit'],
      ...report.revenue_by_month.map(item => [
        item.month,
        `${item.revenue.toLocaleString()} XOF`,
        `${item.expenses.toLocaleString()} XOF`,
        `${item.profit.toLocaleString()} XOF`
      ]),
      ['', '', '', ''],
      ['Dépenses par Catégorie', 'Montant', '% du Total', ''],
      ...report.expenses_by_category.map(item => [
        item.category,
        `${item.amount.toLocaleString()} XOF`,
        `${item.percentage.toFixed(1)}%`,
        ''
      ]),
      ['', '', '', ''],
      ['Revenus par Source', 'Montant', '% du Total', ''],
      ...report.revenue_by_source.map(item => [
        item.source,
        `${item.amount.toLocaleString()} XOF`,
        `${item.percentage.toFixed(1)}%`,
        ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-financier-${startDate}-${endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <ButtonLoadingSpinner />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapport Financier</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analysez vos finances et votre rentabilité
          </p>
        </div>
        <Button onClick={exportReport} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de Début
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date de Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchFinancialReport}>
                <Calendar className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenus Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {report.total_revenue.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                    <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dépenses Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {report.total_expenses.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${report.net_profit >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <DollarSign className={`h-6 w-6 ${report.net_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Profit Net</p>
                    <p className={`text-2xl font-bold ${report.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {report.net_profit.toLocaleString()} XOF
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${report.profit_margin >= 0 ? 'bg-blue-100 dark:bg-blue-900' : 'bg-red-100 dark:bg-red-900'}`}>
                    <PieChart className={`h-6 w-6 ${report.profit_margin >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Marge de Profit</p>
                    <p className={`text-2xl font-bold ${report.profit_margin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {report.profit_margin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Month */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Revenus par Mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mois</TableHead>
                      <TableHead>Revenus</TableHead>
                      <TableHead>Dépenses</TableHead>
                      <TableHead>Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.revenue_by_month.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {item.revenue.toLocaleString()} XOF
                        </TableCell>
                        <TableCell className="text-red-600">
                          {item.expenses.toLocaleString()} XOF
                        </TableCell>
                        <TableCell className={`font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.profit.toLocaleString()} XOF
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Dépenses par Catégorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>% du Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.expenses_by_category.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell>{item.amount.toLocaleString()} XOF</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Source */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenus par Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>% du Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.revenue_by_source.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.source}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {item.amount.toLocaleString()} XOF
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
