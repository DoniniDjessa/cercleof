'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Package, 
  Calendar,
  Scissors,
  Truck,
  CreditCard,
  RefreshCw
} from 'lucide-react'
import { ComposedChart, Line, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatCard, StatGrid } from '@/components/ui/stat-card'
import { PageHeader, SectionTitle, EmptyState } from '@/components/ui/page-header'
import { toast } from 'react-hot-toast'

interface AnalysePageProps {
  userRole?: string
}

interface AnalyseData {
  revenueByMonth: Array<{ month: string; revenue: number; expenses: number; profit: number }>
  salesByDay: Array<{ day: string; sales: number; count: number }>
  productsByCategory: Array<{ category: string; count: number; revenue: number }>
  clientsByMonth: Array<{ month: string; new: number; total: number }>
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>
  topSellingServices: Array<{ name: string; count: number; revenue: number }>
  paymentMethods: Array<{ method: string; count: number; amount: number }>
}

const COLORS = ['#b8922a', '#d4af37', '#dfc27a', '#8f6b1f', '#ead8a6']

export function AnalysePage({ userRole }: AnalysePageProps) {
  const [data, setData] = useState<AnalyseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30')

  useEffect(() => {
    fetchAnalyseData()
  }, [timeRange])

  const fetchAnalyseData = async () => {
    try {
      setLoading(true)
      const days = parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Fetch all data
      const [
        { data: sales },
        { data: revenues },
        { data: expenses },
        { data: clients },
        { data: products },
        { data: services },
        { data: salesItems },
        { data: appointments }
      ] = await Promise.all([
        supabase.from('dd-ventes').select('total_net, date, methode_paiement').eq('status', 'paye').gte('date', startDate.toISOString()),
        supabase.from('dd-revenues').select('montant, date').gte('date', startDate.toISOString()),
        supabase.from('dd-depenses').select('montant, date').gte('date', startDate.toISOString()),
        supabase.from('dd-clients').select('id, created_at').gte('created_at', startDate.toISOString()),
        supabase.from('dd-products').select('id, name, category_id').eq('is_active', true),
        supabase.from('dd-services').select('id, name').eq('actif', true),
        supabase.from('dd-ventes-items').select('*, product:dd-products(name, category_id), service:dd-services(name)').gte('created_at', startDate.toISOString()),
        supabase.from('dd-rdv').select('id, service_id, date_rdv').gte('date_rdv', startDate.toISOString())
      ])

      // Revenue by month
      const revenueByMonth: { [key: string]: { revenue: number; expenses: number; profit: number } } = {}
      sales?.forEach(sale => {
        const month = new Date(sale.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].revenue += sale.total_net || 0
      })
      revenues?.forEach(rev => {
        const month = new Date(rev.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].revenue += rev.montant || 0
      })
      expenses?.forEach(exp => {
        const month = new Date(exp.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = { revenue: 0, expenses: 0, profit: 0 }
        }
        revenueByMonth[month].expenses += exp.montant || 0
      })
      Object.keys(revenueByMonth).forEach(month => {
        revenueByMonth[month].profit = revenueByMonth[month].revenue - revenueByMonth[month].expenses
      })

      // Sales by day
      const salesByDay: { [key: string]: { sales: number; count: number } } = {}
      sales?.forEach(sale => {
        const day = new Date(sale.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        if (!salesByDay[day]) {
          salesByDay[day] = { sales: 0, count: 0 }
        }
        salesByDay[day].sales += sale.total_net || 0
        salesByDay[day].count += 1
      })

      // Payment methods
      const paymentMethods: { [key: string]: { count: number; amount: number } } = {}
      sales?.forEach(sale => {
        const method = sale.methode_paiement || 'cash'
        if (!paymentMethods[method]) {
          paymentMethods[method] = { count: 0, amount: 0 }
        }
        paymentMethods[method].count += 1
        paymentMethods[method].amount += sale.total_net || 0
      })

      // Top selling products
      const productSales: { [key: string]: { quantity: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.product) {
          const name = item.product.name || 'Produit'
          if (!productSales[name]) {
            productSales[name] = { quantity: 0, revenue: 0 }
          }
          productSales[name].quantity += item.quantite || 0
          productSales[name].revenue += item.total || 0
        }
      })

      // Top selling services
      const serviceSales: { [key: string]: { count: number; revenue: number } } = {}
      salesItems?.forEach((item: any) => {
        if (item.service) {
          const name = item.service.name || 'Service'
          if (!serviceSales[name]) {
            serviceSales[name] = { count: 0, revenue: 0 }
          }
          serviceSales[name].count += item.quantite || 0
          serviceSales[name].revenue += item.total || 0
        }
      })

      // Clients by month
      const clientsByMonth: { [key: string]: { new: number; total: number } } = {}
      clients?.forEach(client => {
        const month = new Date(client.created_at).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        if (!clientsByMonth[month]) {
          clientsByMonth[month] = { new: 0, total: 0 }
        }
        clientsByMonth[month].new += 1
      })
      let total = 0
      Object.keys(clientsByMonth).forEach(month => {
        total += clientsByMonth[month].new
        clientsByMonth[month].total = total
      })

      setData({
        revenueByMonth: Object.entries(revenueByMonth).map(([month, data]) => ({
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          profit: data.profit
        })).slice(-6),
        salesByDay: Object.entries(salesByDay).map(([day, data]) => ({
          day,
          sales: data.sales,
          count: data.count
        })).slice(-14),
        productsByCategory: [],
        clientsByMonth: Object.entries(clientsByMonth).map(([month, data]) => ({
          month,
          new: data.new,
          total: data.total
        })),
        topSellingProducts: Object.entries(productSales)
          .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        topSellingServices: Object.entries(serviceSales)
          .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        paymentMethods: Object.entries(paymentMethods).map(([method, data]) => ({
          method,
          count: data.count,
          amount: data.amount
        }))
      })
    } catch (error) {
      console.error('Error fetching analyse data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + 'f'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <StatGrid cols={4}>
          {[0, 1, 2, 3].map(i => <StatCard key={i} index={i} label="Chargement" value="" loading />)}
        </StatGrid>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[0, 1].map(i => <div key={i} className="skeleton h-[340px]" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return <EmptyState icon={BarChart3} title="Aucune donnée disponible" />
  }

  const totals = data.revenueByMonth.reduce(
    (acc, m) => ({ revenue: acc.revenue + (Number(m.revenue) || 0), expenses: acc.expenses + (Number(m.expenses) || 0) }),
    { revenue: 0, expenses: 0 }
  )
  const profit = totals.revenue - totals.expenses
  const salesCount = data.salesByDay.reduce((sum, d) => sum + (Number(d.count) || 0), 0)
  const newClients = data.clientsByMonth.reduce((sum, m) => sum + (Number(m.new) || 0), 0)
  const compact = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000).toLocaleString('fr-FR')}k` : String(v))
  const maxProduct = Math.max(1, ...data.topSellingProducts.map(p => Number(p.revenue) || 0))
  const maxService = Math.max(1, ...data.topSellingServices.map(s => Number(s.revenue) || 0))

  const axisProps = { fontSize: 11, tickLine: false, axisLine: false } as const

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Analyses"
        description="Analyses détaillées basées sur toutes vos données"
        actions={
          <>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40" aria-label="Période">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 derniers jours</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="365">1 an</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchAnalyseData} variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </>
        }
      />

      <StatGrid cols={4}>
        <StatCard index={0} label="Revenus" value={formatCurrency(totals.revenue)} icon={TrendingUp} tone="emerald" hint="Sur la période" />
        <StatCard index={1} label="Dépenses" value={formatCurrency(totals.expenses)} icon={TrendingDown} tone="rose" hint="Sur la période" />
        <StatCard index={2} label="Bénéfice" value={formatCurrency(profit)} icon={DollarSign} tone={profit >= 0 ? 'violet' : 'rose'}
          hint={totals.revenue > 0 ? `Marge ${Math.round((profit / totals.revenue) * 100)}%` : 'Revenus − dépenses'} />
        <StatCard index={3} label="Ventes" value={salesCount.toLocaleString('fr-FR')} icon={ShoppingCart} tone="sky"
          hint={`${newClients.toLocaleString('fr-FR')} nouveau${newClients > 1 ? 'x' : ''} client${newClients > 1 ? 's' : ''}`} />
      </StatGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <SectionTitle title="Revenus, dépenses et bénéfice" description="Par mois" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.revenueByMonth} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {[['fillRevenue', '#c9a227'], ['fillExpenses', '#a89d8c'], ['fillProfit', '#e07f24']].map(([id, color]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={64} tickFormatter={compact} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={2.5} fill="url(#fillRevenue)" name="Revenus" />
                <Area type="monotone" dataKey="expenses" stroke="#a89d8c" strokeWidth={2} fill="url(#fillExpenses)" name="Dépenses" />
                <Area type="monotone" dataKey="profit" stroke="#e07f24" strokeWidth={2} fill="url(#fillProfit)" name="Bénéfice" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales by Day */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle title="Ventes par jour" description="Montant (barres) et nombre de ventes (ligne)" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.salesByDay} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" {...axisProps} />
                <YAxis yAxisId="amount" {...axisProps} width={56} tickFormatter={compact} />
                <YAxis yAxisId="count" orientation="right" {...axisProps} width={32} allowDecimals={false} />
                <Tooltip formatter={(value: number, name: string) => (name === 'Montant' ? formatCurrency(value) : value)} />
                <Legend iconType="circle" iconSize={8} />
                <Bar yAxisId="amount" dataKey="sales" fill="#c9a227" radius={[4, 4, 0, 0]} maxBarSize={28} name="Montant" />
                <Line yAxisId="count" type="monotone" dataKey="count" stroke="#dca54f" strokeWidth={2} dot={false} name="Nombre" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Clients Growth */}
        <Card>
          <CardHeader className="pb-2">
            <SectionTitle title="Croissance clients" description="Nouveaux clients et total cumulé" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={data.clientsByMonth} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis yAxisId="new" {...axisProps} width={36} allowDecimals={false} />
                <YAxis yAxisId="total" orientation="right" {...axisProps} width={40} allowDecimals={false} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} />
                <Bar yAxisId="new" dataKey="new" fill="#e07f24" radius={[4, 4, 0, 0]} maxBarSize={28} name="Nouveaux" />
                <Line yAxisId="total" type="monotone" dataKey="total" stroke="#c9a227" strokeWidth={2.5} dot={false} name="Total" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <SectionTitle title="Méthodes de paiement" description="Montant encaissé et nombre d’opérations" />
          </CardHeader>
          <CardContent>
            {data.paymentMethods.length === 0 ? (
              <EmptyState icon={CreditCard} title="Aucun paiement sur la période" />
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Méthode</TableHead>
                      <TableHead className="text-right">Opérations</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="w-[40%]">Part</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const totalAmount = data.paymentMethods.reduce((s, m) => s + (Number(m.amount) || 0), 0) || 1
                      return [...data.paymentMethods]
                        .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
                        .map((m) => {
                          const share = Math.round(((Number(m.amount) || 0) / totalAmount) * 100)
                          return (
                            <TableRow key={m.method}>
                              <TableCell className="font-bold text-foreground capitalize">{m.method}</TableCell>
                              <TableCell className="text-right">{Number(m.count).toLocaleString('fr-FR')}</TableCell>
                              <TableCell className="text-right font-extrabold text-foreground">{formatCurrency(m.amount)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="progress-track flex-1"><div className="progress-bar" style={{ width: `${Math.max(2, share)}%` }} /></div>
                                  <span className="w-9 text-right text-[11px] font-bold text-muted-foreground">{share}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products and Services */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[
          { title: 'Top produits', icon: Package, max: maxProduct, rows: data.topSellingProducts.map(p => ({ name: p.name, sub: `${p.quantity} vendus`, revenue: p.revenue })) },
          { title: 'Top services', icon: Scissors, max: maxService, rows: data.topSellingServices.map(s => ({ name: s.name, sub: `${s.count} vendus`, revenue: s.revenue })) },
        ].map(list => (
          <Card key={list.title}>
            <CardHeader className="pb-2">
              <SectionTitle title={list.title} description="Classés par chiffre d’affaires" />
            </CardHeader>
            <CardContent className="pt-1">
              {list.rows.length === 0 ? (
                <EmptyState icon={list.icon} title="Aucune vente sur la période" />
              ) : (
                <ul className="space-y-3">
                  {list.rows.map((row, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <span className="rank">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-xs font-bold text-foreground">{row.name}</p>
                          <p className="shrink-0 text-xs font-extrabold text-primary">{formatCurrency(row.revenue)}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="progress-track flex-1">
                            <div className="progress-bar" style={{ width: `${Math.max(4, Math.round(((Number(row.revenue) || 0) / list.max) * 100))}%` }} />
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{row.sub}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
