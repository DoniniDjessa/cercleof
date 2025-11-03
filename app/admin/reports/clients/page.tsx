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
  Users,
  UserPlus,
  TrendingUp,
  Star,
  MapPin
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ClientReport {
  total_clients: number
  new_clients: number
  active_clients: number
  clients_by_city: Array<{
    city: string
    count: number
  }>
  clients_by_acquisition: Array<{
    channel: string
    count: number
  }>
  top_spending_clients: Array<{
    client_name: string
    total_spent: number
    visits: number
  }>
}

export default function ClientReportPage() {
  const [report, setReport] = useState<ClientReport | null>(null)
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
      fetchClientReport()
    }
  }, [startDate, endDate])

  const fetchClientReport = async () => {
    try {
      setLoading(true)

      // Fetch clients data
      const { data: clients, error: clientsError } = await supabase
        .from('dd-clients')
        .select('*')

      if (clientsError) {
        console.error('Error fetching clients:', clientsError)
        toast.error('Erreur lors du chargement des données clients')
        return
      }

      // Fetch sales data for spending analysis
      const { data: sales, error: salesError } = await supabase
        .from('dd-ventes')
        .select('client_id, total_net, date')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('status', 'paye')

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        toast.error('Erreur lors du chargement des données de vente')
        return
      }

      // Calculate report data
      const totalClients = clients?.length || 0
      const newClients = clients?.filter(client => 
        new Date(client.created_at) >= new Date(startDate) &&
        new Date(client.created_at) <= new Date(endDate)
      ).length || 0
      const activeClients = clients?.filter(client => client.is_active).length || 0

      // Clients by city
      const clientsByCity: { [key: string]: number } = {}
      clients?.forEach(client => {
        const city = client.city || 'Non spécifié'
        clientsByCity[city] = (clientsByCity[city] || 0) + 1
      })

      const clientsByCityArray = Object.entries(clientsByCity)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)

      // Clients by acquisition channel
      const clientsByAcquisition: { [key: string]: number } = {}
      clients?.forEach(client => {
        const channel = client.acquisition_channel || 'Non spécifié'
        clientsByAcquisition[channel] = (clientsByAcquisition[channel] || 0) + 1
      })

      const clientsByAcquisitionArray = Object.entries(clientsByAcquisition)
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)

      // Top spending clients
      const clientSpending: { [key: string]: { name: string; total: number; visits: number } } = {}
      sales?.forEach(sale => {
        const client = clients?.find(c => c.id === sale.client_id)
        if (client) {
          const key = client.id
          if (!clientSpending[key]) {
            clientSpending[key] = {
              name: `${client.first_name} ${client.last_name}`,
              total: 0,
              visits: 0
            }
          }
          clientSpending[key].total += sale.total_net || 0
          clientSpending[key].visits += 1
        }
      })

      const topSpendingClients = Object.values(clientSpending)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      setReport({
        total_clients: totalClients,
        new_clients: newClients,
        active_clients: activeClients,
        clients_by_city: clientsByCityArray,
        clients_by_acquisition: clientsByAcquisitionArray,
        top_spending_clients: topSpendingClients
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
      ['Rapport Clients', '', '', ''],
      ['Période', `${startDate} au ${endDate}`, '', ''],
      ['', '', '', ''],
      ['Métriques', 'Valeur', '', ''],
      ['Total Clients', report.total_clients.toString(), '', ''],
      ['Nouveaux Clients', report.new_clients.toString(), '', ''],
      ['Clients Actifs', report.active_clients.toString(), '', ''],
      ['', '', '', ''],
      ['Clients par Ville', 'Nombre', '', ''],
      ...report.clients_by_city.map(item => [
        item.city,
        item.count.toString(),
        '',
        ''
      ]),
      ['', '', '', ''],
      ['Clients par Canal d\'Acquisition', 'Nombre', '', ''],
      ...report.clients_by_acquisition.map(item => [
        item.channel,
        item.count.toString(),
        '',
        ''
      ]),
      ['', '', '', ''],
      ['Top Clients Dépensiers', 'Dépenses Total', 'Visites', ''],
      ...report.top_spending_clients.map(client => [
        client.client_name,
        `${client.total_spent.toLocaleString()} XOF`,
        client.visits.toString(),
        ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport-clients-${startDate}-${endDate}.csv`
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapport Clients</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analysez vos clients et leur comportement
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
              <Button onClick={fetchClientReport}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.total_clients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouveaux Clients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.new_clients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clients Actifs</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{report.active_clients}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Clients by City */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Clients par Ville
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ville</TableHead>
                      <TableHead>Nombre de Clients</TableHead>
                      <TableHead>% du Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.clients_by_city.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.city}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          {((item.count / report.total_clients) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Clients by Acquisition Channel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Clients par Canal d'Acquisition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal d'Acquisition</TableHead>
                      <TableHead>Nombre de Clients</TableHead>
                      <TableHead>% du Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.clients_by_acquisition.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium capitalize">{item.channel}</TableCell>
                        <TableCell>{item.count}</TableCell>
                        <TableCell>
                          {((item.count / report.total_clients) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Top Spending Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Top Clients Dépensiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Dépenses Total</TableHead>
                      <TableHead>Nombre de Visites</TableHead>
                      <TableHead>Panier Moyen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.top_spending_clients.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{client.client_name}</TableCell>
                        <TableCell>{client.total_spent.toLocaleString()} XOF</TableCell>
                        <TableCell>{client.visits}</TableCell>
                        <TableCell>
                          {client.visits > 0 ? (client.total_spent / client.visits).toLocaleString() : 0} XOF
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
