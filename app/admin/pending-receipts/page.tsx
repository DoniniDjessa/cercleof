"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TableLoadingState } from "@/components/ui/table-loading-state"
import { Printer, Trash2, Eye, Receipt, Clock, User, DollarSign, Download, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

interface PendingReceipt {
  id: string
  sale_id: string
  sent_by: string
  sent_to?: string
  sent_at: string
  is_read: boolean
  read_at?: string
  read_by?: string
  sale: {
    id: string
    total_net: number
    date: string
    methode_paiement: string
    client?: {
      first_name: string
      last_name: string
      phone?: string
    }
    items: Array<{
      id: string
      product_id?: string
      service_id?: string
      quantite: number
      prix_unitaire: number
      total: number
      product?: {
        name: string
      }
      service?: {
        name: string
      }
    }>
  }
  sender: {
    first_name: string
    last_name: string
    pseudo: string
  }
}

export default function PendingReceiptsPage() {
  const { user: authUser } = useAuth()
  const router = useRouter()
  const [pendingReceipts, setPendingReceipts] = useState<PendingReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [printing, setPrinting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')
  const [showReceiptPreview, setShowReceiptPreview] = useState<string | null>(null)

  // Check if user is admin (can delete receipts)
  // Try both currentUserRole and authUser.role as fallback
  const userRole = currentUserRole || authUser?.role || ''
  const isAdmin = Boolean(userRole && ['admin', 'superadmin', 'manager'].includes(userRole))

  useEffect(() => {
    if (authUser) {
      fetchCurrentUserRole()
      fetchPendingReceipts()
    }
  }, [authUser])

  const fetchCurrentUserRole = async () => {
    if (!authUser?.id) return

    try {
      const { data, error } = await supabase
        .from('dd-users')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (error) {
        console.error('Error fetching user role:', error)
        return
      }

      setCurrentUserRole(data?.role || '')
    } catch (error) {
      console.error('Exception fetching user role:', error)
    }
  }

  const fetchPendingReceipts = async () => {
    if (!authUser) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('dd-pending_receipts')
        .select(`
          id,
          sale_id,
          sent_by,
          sent_to,
          sent_at,
          is_read,
          read_at,
          read_by
        `)
        .order('sent_at', { ascending: false })

      if (error) throw error

      // Fetch related data separately
      const receiptsWithDetails = await Promise.all(
        (data || []).map(async (receipt) => {
          // Fetch sale details
          const { data: saleData } = await supabase
            .from('dd-ventes')
            .select(`
              id,
              total_net,
              date,
              methode_paiement,
              client_id
            `)
            .eq('id', receipt.sale_id)
            .single()

          // Fetch client details if exists
          let clientData = null
          if (saleData?.client_id) {
            const { data: client } = await supabase
              .from('dd-clients')
              .select('first_name, last_name, phone')
              .eq('id', saleData.client_id)
              .single()
            clientData = client
          }

          // Fetch sale items
          const { data: itemsData } = await supabase
            .from('dd-ventes-items')
            .select(`
              id,
              product_id,
              service_id,
              quantite,
              prix_unitaire,
              total
            `)
            .eq('vente_id', receipt.sale_id)

          // Fetch product and service names for items
          const itemsWithNames = await Promise.all(
            (itemsData || []).map(async (item) => {
              let productName = null
              let serviceName = null

              if (item.product_id) {
                const { data: product } = await supabase
                  .from('dd-products')
                  .select('name')
                  .eq('id', item.product_id)
                  .single()
                productName = product?.name
              }

              if (item.service_id) {
                const { data: service } = await supabase
                  .from('dd-services')
                  .select('name')
                  .eq('id', item.service_id)
                  .single()
                serviceName = service?.name
              }

              return {
                ...item,
                product: productName ? { name: productName } : null,
                service: serviceName ? { name: serviceName } : null
              }
            })
          )

          // Fetch sender details
          const { data: senderData } = await supabase
            .from('dd-users')
            .select('first_name, last_name, pseudo')
            .eq('id', receipt.sent_by)
            .single()

          return {
            ...receipt,
            sale: {
              id: saleData?.id || '',
              total_net: saleData?.total_net || 0,
              date: saleData?.date || '',
              methode_paiement: saleData?.methode_paiement || '',
              client: clientData ? {
                first_name: clientData.first_name || '',
                last_name: clientData.last_name || '',
                phone: clientData.phone || undefined
              } : undefined,
              items: (itemsWithNames || []).map(item => ({
                id: item.id || '',
                product_id: item.product_id || undefined,
                service_id: item.service_id || undefined,
                quantite: item.quantite || 0,
                prix_unitaire: item.prix_unitaire || 0,
                total: item.total || 0,
                product: item.product ? { name: item.product.name || '' } : undefined,
                service: item.service ? { name: item.service.name || '' } : undefined
              }))
            },
            sender: senderData || { first_name: '', last_name: '', pseudo: '' }
          }
        })
      )

      setPendingReceipts(receiptsWithDetails)
    } catch (error) {
      console.error('Error fetching pending receipts:', error)
      toast.error('Erreur lors du chargement des reçus en attente')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (receiptId: string) => {
    if (!authUser) return

    try {
      // First, get the user ID from dd-users table using the auth user ID
      const { data: userData, error: userError } = await supabase
        .from('dd-users')
        .select('id')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError || !userData) {
        console.error('Error fetching user data:', userError)
        return
      }

      const { error } = await supabase
        .from('dd-pending_receipts')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          read_by: userData.id // Use the dd-users table ID, not auth ID
        })
        .eq('id', receiptId)

      if (error) throw error

      // Update local state
      setPendingReceipts(prev => 
        prev.map(receipt => 
          receipt.id === receiptId 
            ? { ...receipt, is_read: true, read_at: new Date().toISOString(), read_by: userData.id }
            : receipt
        )
      )
    } catch (error) {
      console.error('Error marking receipt as read:', error)
    }
  }

  const showReceiptPreviewModal = (receipt: PendingReceipt) => {
    setShowReceiptPreview(receipt.id)
    // Mark as read when preview is opened
    if (!receipt.is_read) {
      markAsRead(receipt.id)
    }
  }

  const printReceipt = async (receipt: PendingReceipt) => {
    setPrinting(receipt.id)
    
    try {
      // Mark as read if not already read
      if (!receipt.is_read) {
        await markAsRead(receipt.id)
      }

      // Generate receipt HTML
      const receiptHTML = generateReceiptHTML(receipt)
      
      // Open print window
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(receiptHTML)
        printWindow.document.close()
        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }

      toast.success('Reçu envoyé à l\'impression')
    } catch (error) {
      console.error('Error printing receipt:', error)
      toast.error('Erreur lors de l\'impression')
    } finally {
      setPrinting(null)
    }
  }

  const downloadReceipt = (receipt: PendingReceipt) => {
    // Mark as read if not already read
    if (!receipt.is_read) {
      markAsRead(receipt.id)
    }

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(receipt)
    
    // Create blob and download
    const blob = new Blob([receiptHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recu-${receipt.sale.id.slice(-8)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Reçu téléchargé')
  }

  const deleteReceipt = async (receiptId: string) => {
    if (!isAdmin) {
      toast.error('Seuls les administrateurs peuvent supprimer des reçus')
      return
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce reçu en attente ?')) {
      return
    }

    setDeleting(receiptId)
    
    try {
      const { error } = await supabase
        .from('dd-pending_receipts')
        .delete()
        .eq('id', receiptId)

      if (error) throw error

      setPendingReceipts(prev => prev.filter(receipt => receipt.id !== receiptId))
      toast.success('Reçu supprimé avec succès')
    } catch (error) {
      console.error('Error deleting receipt:', error)
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const generateReceiptHTML = (receipt: PendingReceipt) => {
    const sale = receipt.sale
    const items = sale.items || []
    
    const escapeHtml = (text: string) => {
      const div = document.createElement('div')
      div.textContent = text
      return div.innerHTML
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reçu - ${sale.id}</title>
  <style>
    * { 
      margin: 0; 
      padding: 0; 
      box-sizing: border-box; 
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
    body {
      font-family: 'Courier New', 'Courier', monospace;
      font-size: 12px;
      line-height: 1.3;
      padding: 10px 12px 30px 12px;
      max-width: 80mm;
      margin: 0 auto;
      color: #000000;
      background: #ffffff;
    }
    .header { 
      text-align: center; 
      margin-bottom: 8px; 
      padding-bottom: 8px; 
      border-bottom: 2px dashed #9ca3af; 
    }
    .header .logo {
      max-width: 60px;
      max-height: 60px;
      margin: 0 auto 6px;
      display: block;
      filter: contrast(1.2) brightness(0.8);
    }
    .header h1 { 
      font-size: 14px; 
      font-weight: 600; 
      margin-bottom: 4px; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
      font-family: 'Courier New', 'Courier', monospace;
    }
    .header .subtitle {
      font-size: 10px;
      color: #000000;
      margin-bottom: 3px;
      font-weight: 500;
    }
    .header .date-time {
      font-size: 9px;
      color: #000000;
      margin-bottom: 4px;
    }
    .section { 
      margin-bottom: 8px; 
      padding-bottom: 6px;
    }
    .section-title { 
      font-weight: bold; 
      margin-bottom: 4px; 
      font-size: 10px;
      text-transform: uppercase;
      color: #000000;
      letter-spacing: 0.3px;
    }
    .item { 
      margin-bottom: 8px; 
      border-bottom: 1px dotted #ccc; 
      padding-bottom: 5px; 
    }
    .item-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
    }
    .item-name { 
      font-weight: bold; 
      font-size: 11px; 
    }
    .item-details { 
      font-size: 10px; 
      color: #666; 
      margin-top: 2px; 
    }
    .item-total { 
      font-weight: bold; 
      font-size: 11px; 
      white-space: nowrap; 
      margin-left: 10px; 
    }
    .totals { 
      border-top: 2px dashed #9ca3af; 
      padding-top: 10px; 
      margin-top: 10px; 
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 5px; 
      font-size: 11px; 
    }
    .total-final { 
      font-weight: bold; 
      font-size: 13px; 
      border-top: 1px solid #000; 
      padding-top: 5px; 
      margin-top: 5px; 
    }
    .footer { 
      text-align: center; 
      border-top: 2px dashed #9ca3af; 
      padding-top: 10px; 
      padding-bottom: 40px; 
      margin-top: 15px; 
      font-size: 10px; 
    }
    .thank-you { 
      font-weight: bold; 
      margin-bottom: 5px; 
    }
    @media print {
      body { 
        padding: 10px; 
        margin: 0;
      }
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="/cbmin.png" alt="Logo" class="logo" />
    <h1>THE CERCLE OF BEAUTY</h1>
    <p class="subtitle">Institut de Beauté</p>
    <p class="date-time">${new Date(sale.date).toLocaleDateString('fr-FR')} • ${new Date(sale.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
  </div>
    
    <div class="section">
      <p class="section-title">Référence</p>
      <p style="font-weight: 600;">#${escapeHtml(sale.id.slice(-8).toUpperCase())}</p>
    </div>
    
    ${sale.client ? `
      <div class="section">
        <p class="section-title">Client</p>
        <p style="font-weight: 600;">${escapeHtml(sale.client.first_name)} ${escapeHtml(sale.client.last_name)}</p>
        ${sale.client.phone ? `<p style="font-size: 11px;">${escapeHtml(sale.client.phone)}</p>` : ''}
      </div>
    ` : ''}
    
    <div class="section">
      <p class="section-title">Articles</p>
      ${items.map(item => `
        <div class="item">
          <div class="item-row">
            <div style="flex: 1;">
              <div class="item-name">${escapeHtml(item.product?.name || item.service?.name || 'Article')}</div>
              <div class="item-details">${item.quantite} × ${item.prix_unitaire.toFixed(0)} FCFA</div>
            </div>
            <div class="item-total">${item.total.toFixed(0)} FCFA</div>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="totals">
      <div class="total-row total-final">
        <span>TOTAL</span>
        <span>${sale.total_net.toFixed(0)} FCFA</span>
      </div>
    </div>
    
    <div class="section">
      <p class="section-title">Paiement</p>
      <p style="font-weight: 600;">${escapeHtml(sale.methode_paiement)}</p>
      <p style="font-size: 11px;">Envoyé par: ${escapeHtml(receipt.sender.first_name)} ${escapeHtml(receipt.sender.last_name)}</p>
    </div>
    
    <div class="footer">
      <p class="thank-you">Merci de votre visite!</p>
      <p>THE CERCLE OF BEAUTY - Institut de Beauté</p>
    </div>
  </div>
</body>
</html>
    `
  }

  const unreadCount = pendingReceipts.filter(receipt => !receipt.is_read).length

  if (loading) {
    return <TableLoadingState />
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Receipt className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white">Reçus en Attente</h1>
            <p className="text-muted-foreground dark:text-gray-400">
              {unreadCount > 0 ? `${unreadCount} nouveau${unreadCount > 1 ? 'x' : ''} reçu${unreadCount > 1 ? 's' : ''}` : 'Aucun nouveau reçu'}
            </p>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Liste des Reçus</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReceipts.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Aucun reçu en attente</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les reçus envoyés par les administrateurs apparaîtront ici
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-gray-700">
                  <TableHead className="text-gray-900 dark:text-white">Statut</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Référence</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Client</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Montant</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Envoyé par</TableHead>
                  <TableHead className="text-gray-900 dark:text-white">Date d'envoi</TableHead>
                  <TableHead className="text-gray-900 dark:text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReceipts.map((receipt) => (
                  <TableRow key={receipt.id} className="border-gray-200 dark:border-gray-700">
                    <TableCell>
                      <Badge 
                        className={`${
                          receipt.is_read 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                        }`}
                      >
                        {receipt.is_read ? (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Lu
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 mr-1" />
                            Non lu
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      #{receipt.sale.id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {receipt.sale.client ? 
                        `${receipt.sale.client.first_name} ${receipt.sale.client.last_name}` : 
                        'Client anonyme'
                      }
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="font-semibold">{receipt.sale.total_net.toFixed(0)} FCFA</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{receipt.sender.first_name} {receipt.sender.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 dark:text-gray-400">
                      {new Date(receipt.sent_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showReceiptPreviewModal(receipt)}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteReceipt(receipt.id)}
                            disabled={deleting === receipt.id}
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Aperçu du Reçu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReceiptPreview(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {(() => {
              const receipt = pendingReceipts.find(r => r.id === showReceiptPreview)
              if (!receipt) return null
              
              return (
                <>
                  <div className="p-4 flex-1 overflow-y-auto">
                    {/* Receipt Preview */}
                    <div className="bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded p-4 font-mono text-xs mb-4">
                    {/* Header */}
                    <div className="text-center mb-4 border-b border-dashed border-gray-400 dark:border-gray-500 pb-3">
                      <div className="flex justify-center mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/cbmin.png" alt="Logo" className="h-12 w-12 object-contain" style={{filter: 'contrast(1.2) brightness(0.8)'}} />
                      </div>
                      <p className="font-bold text-sm mb-1">THE CERCLE OF BEAUTY</p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400">Institut de Beauté</p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(receipt.sale.date).toLocaleDateString('fr-FR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })} {new Date(receipt.sale.date).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>

                    {/* Sale ID */}
                    <div className="mb-3 text-[10px] text-gray-600 dark:text-gray-400">
                      <p>Vente: #{receipt.sale.id.slice(-8).toUpperCase()}</p>
                    </div>

                    {/* Client Info */}
                    {receipt.sale.client && (
                      <div className="mb-3 text-[10px] text-gray-600 dark:text-gray-400 border-b border-dashed border-gray-400 dark:border-gray-500 pb-2">
                        <p>Client: {receipt.sale.client.first_name} {receipt.sale.client.last_name}</p>
                        {receipt.sale.client.phone && (
                          <p>Tel: {receipt.sale.client.phone}</p>
                        )}
                      </div>
                    )}

                    {/* Items */}
                    <div className="mb-3 border-b border-dashed border-gray-400 dark:border-gray-500 pb-2">
                      {receipt.sale.items.map((item, index) => (
                        <div key={index} className="mb-2">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex-1">
                              <p className="font-semibold">{item.product?.name || item.service?.name || 'Article'}</p>
                              <p className="text-[10px] text-gray-600 dark:text-gray-400">
                                {item.quantite} × {item.prix_unitaire.toFixed(0)} FCFA
                              </p>
                            </div>
                            <div className="font-semibold">{item.total.toFixed(0)} FCFA</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t border-dashed border-gray-400 dark:border-gray-500 pt-2">
                      <div className="flex justify-between font-bold text-sm">
                        <span>TOTAL</span>
                        <span>{receipt.sale.total_net.toFixed(0)} FCFA</span>
                      </div>
                    </div>

                    {/* Payment & Sender */}
                    <div className="mt-3 text-[10px] text-gray-600 dark:text-gray-400 border-t border-dashed border-gray-400 dark:border-gray-500 pt-2">
                      <p>Paiement: {receipt.sale.methode_paiement}</p>
                      <p>Envoyé par: {receipt.sender.first_name} {receipt.sender.last_name}</p>
                    </div>

                    <div className="text-center mt-4 mb-8 pb-8 text-[10px] text-gray-600 dark:text-gray-400">
                      <p className="font-bold">Merci de votre visite!</p>
                      <p>THE CERCLE OF BEAUTY - Institut de Beauté</p>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons - Fixed at bottom */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
                  <Button
                    onClick={() => printReceipt(receipt)}
                    disabled={printing === receipt.id}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {printing === receipt.id ? 'Impression...' : 'Imprimer'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => downloadReceipt(receipt)}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
