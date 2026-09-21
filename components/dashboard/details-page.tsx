'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useDashboardYear } from '@/contexts/DashboardYearContext'
import { MONTH_OPTIONS } from '@/lib/dashboard-date-utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BarChart3,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'

interface DetailsPageProps {
  userRole?: string
}

type DisplayMode = 'week' | 'month' | 'year'

interface DayData {
  date: Date
  label: string
  sublabel?: string
  revenues: number
  expenses: number
  profit: number
}

interface SummaryStats {
  revenues: number
  expenses: number
  profit: number
}

const WEEKDAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)}M FCFA`
  }
  if (Math.abs(amount) >= 1_000) {
    return `${(amount / 1_000).toFixed(0)}k FCFA`
  }
  return `${amount.toFixed(0)} FCFA`
}

function formatCurrencyFull(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

/** Get ISO week number */
function getIsoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/** Get all weeks in a month as [{start, end}] */
function getWeeksInMonth(year: number, monthIndex: number): Array<{ start: Date; end: Date; label: string; weekNum: number }> {
  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)

  // find Monday on or before firstDay
  const startDow = firstDay.getDay() // 0=Sun
  const diff = startDow === 0 ? -6 : 1 - startDow
  let cursor = new Date(firstDay)
  cursor.setDate(cursor.getDate() + diff)

  const weeks: Array<{ start: Date; end: Date; label: string; weekNum: number }> = []
  while (cursor <= lastDay) {
    const weekStart = new Date(cursor)
    const weekEnd = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Clamp to month
    const clampedStart = weekStart < firstDay ? firstDay : weekStart
    const clampedEnd = weekEnd > lastDay ? lastDay : weekEnd

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    weeks.push({
      start: weekStart,
      end: weekEnd,
      label: `${fmt(clampedStart)} – ${fmt(clampedEnd)}`,
      weekNum: getIsoWeek(weekStart),
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

/** Get all days in a specific week that belong to the given month */
function getDaysInWeek(weekStart: Date, year: number, monthIndex: number): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    // Include all days in the week (even if outside month, for display)
    days.push(d)
  }
  return days
}

/** Get all days in a month */
function getAllDaysInMonth(year: number, monthIndex: number): Date[] {
  const days: Date[] = []
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, monthIndex, d))
  }
  return days
}

export function DetailsPage({ userRole }: DetailsPageProps) {
  const { selectedYear, availableYears } = useDashboardYear()
  const printRef = useRef<HTMLDivElement>(null)

  const currentDate = new Date()
  const [displayMode, setDisplayMode] = useState<DisplayMode>('week')
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'))
  const [selectedYear2, setSelectedYear2] = useState(selectedYear)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

  // Raw data from DB
  const [rawRevenues, setRawRevenues] = useState<Array<{ date: string; montant: number; source_id: string | null }>>([])
  const [rawSales, setRawSales] = useState<Array<{ date: string; total_net: number }>>([])
  const [rawExpenses, setRawExpenses] = useState<Array<{ date: string; montant: number }>>([])
  const [loading, setLoading] = useState(true)

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Derived: weeks in selected month
  const monthIndex = parseInt(selectedMonth, 10) - 1
  const weeks = getWeeksInMonth(selectedYear2, monthIndex)

  // Sync selectedYear2 when context year changes
  useEffect(() => {
    setSelectedYear2(selectedYear)
  }, [selectedYear])

  // Reset week index when month/year/mode changes
  useEffect(() => {
    setCurrentWeekIndex(0)
  }, [selectedMonth, selectedYear2, displayMode])

  // Fetch all data for the selected month+year (or full year)
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let startDate: Date
      let endDate: Date

      if (displayMode === 'year') {
        startDate = new Date(selectedYear2, 0, 1)
        endDate = new Date(selectedYear2, 11, 31, 23, 59, 59)
      } else {
        startDate = new Date(selectedYear2, monthIndex, 1)
        endDate = new Date(selectedYear2, monthIndex + 1, 0, 23, 59, 59)
      }

      const startIso = startDate.toISOString()
      const endIso = endDate.toISOString()

      const [revenuesRes, salesRes, expensesRes] = await Promise.all([
        supabase
          .from('dd-revenues')
          .select('date, montant, source_id')
          .gte('date', startIso)
          .lte('date', endIso),
        supabase
          .from('dd-ventes')
          .select('date, total_net')
          .eq('status', 'paye')
          .gte('date', startIso)
          .lte('date', endIso),
        supabase
          .from('dd-depenses')
          .select('date, montant')
          .gte('date', startIso)
          .lte('date', endIso),
      ])

      setRawRevenues(revenuesRes.data || [])
      setRawSales(salesRes.data || [])
      setRawExpenses(expensesRes.data || [])
    } catch (err) {
      console.error('Error fetching details data:', err)
    } finally {
      setLoading(false)
    }
  }, [displayMode, selectedYear2, monthIndex])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Helper: get revenues for a specific date
  const getRevenueForDate = useCallback((date: Date): number => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    // Manual revenues (no source_id)
    const manual = rawRevenues
      .filter(r => !r.source_id && r.date?.startsWith(dateStr))
      .reduce((s, r) => s + (r.montant || 0), 0)
    // POS sales
    const pos = rawSales
      .filter(s => s.date?.startsWith(dateStr))
      .reduce((s, r) => s + (r.total_net || 0), 0)
    return manual + pos
  }, [rawRevenues, rawSales])

  const getExpenseForDate = useCallback((date: Date): number => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return rawExpenses
      .filter(e => e.date?.startsWith(dateStr))
      .reduce((s, e) => s + (e.montant || 0), 0)
  }, [rawExpenses])

  const getRevenueForMonth = useCallback((year: number, mIdx: number): number => {
    const prefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`
    const manual = rawRevenues
      .filter(r => !r.source_id && r.date?.startsWith(prefix))
      .reduce((s, r) => s + (r.montant || 0), 0)
    const pos = rawSales
      .filter(s => s.date?.startsWith(prefix))
      .reduce((s, r) => s + (r.total_net || 0), 0)
    return manual + pos
  }, [rawRevenues, rawSales])

  const getExpenseForMonth = useCallback((year: number, mIdx: number): number => {
    const prefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`
    return rawExpenses
      .filter(e => e.date?.startsWith(prefix))
      .reduce((s, e) => s + (e.montant || 0), 0)
  }, [rawExpenses])

  // Build table rows
  const tableRows = useCallback((): DayData[] => {
    if (displayMode === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const rev = getRevenueForMonth(selectedYear2, i)
        const exp = getExpenseForMonth(selectedYear2, i)
        return {
          date: new Date(selectedYear2, i, 1),
          label: MONTHS_FR[i],
          sublabel: String(selectedYear2),
          revenues: rev,
          expenses: exp,
          profit: rev - exp,
        }
      })
    }

    if (displayMode === 'month') {
      return getAllDaysInMonth(selectedYear2, monthIndex).map(date => {
        const dow = date.getDay()
        const dowIdx = dow === 0 ? 6 : dow - 1
        const rev = getRevenueForDate(date)
        const exp = getExpenseForDate(date)
        return {
          date,
          label: `${WEEKDAYS_FR[dowIdx]} ${date.getDate()}`,
          sublabel: MONTHS_FR[monthIndex],
          revenues: rev,
          expenses: exp,
          profit: rev - exp,
        }
      })
    }

    // week mode
    if (weeks.length === 0) return []
    const week = weeks[currentWeekIndex]
    if (!week) return []
    const days = getDaysInWeek(week.start, selectedYear2, monthIndex)
    return days.map(date => {
      const dow = date.getDay()
      const dowIdx = dow === 0 ? 6 : dow - 1
      const rev = getRevenueForDate(date)
      const exp = getExpenseForDate(date)
      const isInMonth = date.getMonth() === monthIndex && date.getFullYear() === selectedYear2
      return {
        date,
        label: `${WEEKDAYS_FR[dowIdx]} ${date.getDate()}`,
        sublabel: `${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`,
        revenues: isInMonth ? rev : 0,
        expenses: isInMonth ? exp : 0,
        profit: isInMonth ? rev - exp : 0,
        // Mark as outside month
      }
    })
  }, [displayMode, selectedYear2, monthIndex, currentWeekIndex, weeks, getRevenueForDate, getExpenseForDate, getRevenueForMonth, getExpenseForMonth])

  const rows = tableRows()

  // Summary for the current displayed period
  const summary: SummaryStats = rows.reduce(
    (acc, row) => ({
      revenues: acc.revenues + row.revenues,
      expenses: acc.expenses + row.expenses,
      profit: acc.profit + row.profit,
    }),
    { revenues: 0, expenses: 0, profit: 0 }
  )

  // Period label
  const getPeriodLabel = () => {
    if (displayMode === 'year') return `Année ${selectedYear2}`
    if (displayMode === 'month') return `${MONTHS_FR[monthIndex]} ${selectedYear2}`
    if (weeks[currentWeekIndex]) return `Semaine ${weeks[currentWeekIndex].weekNum} — ${weeks[currentWeekIndex].label}`
    return ''
  }

  // Print — open dedicated print window
  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(buildPrintHTML())
    win.document.close()
    win.onload = () => { win.focus(); win.print(); win.close() }
  }

  /**
   * Renders the clean print HTML (no Tailwind/lab() colors) into a hidden iframe,
   * captures it with html2canvas, then removes the iframe.
   * This avoids the html2canvas "unsupported color function lab/oklch" error
   * caused by Tailwind v4's modern CSS color functions in the live DOM.
   */
  const captureCleanCanvas = (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const html = buildPrintHTML()
      const iframe = document.createElement('iframe')
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1100px;height:800px;border:none;visibility:hidden;'
      document.body.appendChild(iframe)

      const cleanup = () => {
        try { document.body.removeChild(iframe) } catch { /* already removed */ }
      }

      iframe.onload = async () => {
        try {
          const html2canvas = (await import('html2canvas')).default
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
          if (!iframeDoc?.body) { cleanup(); reject(new Error('iframe body not ready')); return }
          // Wait an extra tick for layout to settle
          await new Promise(r => setTimeout(r, 200))
          const canvas = await html2canvas(iframeDoc.body, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            windowWidth: 1100,
            windowHeight: iframeDoc.body.scrollHeight,
            scrollX: 0,
            scrollY: 0,
          })
          cleanup()
          resolve(canvas)
        } catch (err) {
          cleanup()
          reject(err)
        }
      }

      iframe.onerror = (e) => { cleanup(); reject(e) }
      iframe.srcdoc = html
    })
  }

  // Export PNG — captures clean iframe HTML (no lab/oklch colors)
  const handleExportPNG = async () => {
    setShowExportMenu(false)
    try {
      const canvas = await captureCleanCanvas()
      const link = document.createElement('a')
      link.download = `rapport-${displayMode}-${selectedYear2}-${selectedMonth}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('PNG export error:', err)
    }
  }

  // Export PDF — captures clean iframe HTML then embeds in jsPDF
  const handleExportPDF = async () => {
    setShowExportMenu(false)
    try {
      const canvas = await captureCleanCanvas()
      const { jsPDF } = await import('jspdf')
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`rapport-${displayMode}-${selectedYear2}-${selectedMonth}.pdf`)
    } catch (err) {
      console.error('PDF export error:', err)
    }
  }

  const profitColor = (v: number) =>
    v > 0 ? 'text-emerald-600 dark:text-emerald-400' :
    v < 0 ? 'text-red-500 dark:text-red-400' :
    'text-gray-500 dark:text-gray-400'

  const profitBg = (v: number) =>
    v > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' :
    v < 0 ? 'bg-red-50 dark:bg-red-900/20' :
    ''

  const modeLabels: Record<DisplayMode, string> = {
    week: 'Par Semaine',
    month: 'Mois Complet',
    year: 'Toute l\'Année',
  }

  // Inject print styles on mount
  useEffect(() => {
    const styleId = 'details-print-styles'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        #details-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: white; z-index: 9999; }
        .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(styleId)?.remove() }
  }, [])

  // Build print HTML for a new window
  const buildPrintHTML = () => {
    const periodLabel = getPeriodLabel()
    const modeLabel = modeLabels[displayMode]
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const rowsHTML = rows.map(row => {
      const margin = row.revenues > 0 ? `${((row.profit / row.revenues) * 100).toFixed(0)}%` : '—'
      const profitSign = row.profit >= 0 ? '+' : ''
      const isOutside = displayMode === 'week' && (row.date.getMonth() !== monthIndex || row.date.getFullYear() !== selectedYear2)
      const profitColor = row.profit > 0 ? '#059669' : row.profit < 0 ? '#dc2626' : '#6b7280'
      return `
        <tr style="${isOutside ? 'opacity:0.3;' : ''}border-bottom:1px solid #f3f4f6;">
          <td style="padding:8px 12px;font-weight:500;color:#1f2937;">${row.label}</td>
          <td style="padding:8px 12px;text-align:right;color:#2563eb;font-weight:500;">${row.revenues > 0 ? formatCurrency(row.revenues) : '—'}</td>
          <td style="padding:8px 12px;text-align:right;color:#dc2626;font-weight:500;">${row.expenses > 0 ? formatCurrency(row.expenses) : '—'}</td>
          <td style="padding:8px 12px;text-align:right;color:${profitColor};font-weight:600;">${row.revenues === 0 && row.expenses === 0 ? '—' : profitSign + formatCurrency(row.profit)}</td>
          <td style="padding:8px 12px;text-align:right;color:${profitColor};font-size:11px;">${margin}</td>
        </tr>
      `
    }).join('')

    const totalProfitColor = summary.profit >= 0 ? '#059669' : '#dc2626'

    return `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/>
      <title>Rapport — ${periodLabel}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:Arial,sans-serif; }
        body { padding:24px; color:#111; font-size:13px; }
        h1 { font-size:22px; font-weight:700; color:#111; }
        .subtitle { color:#6b7280; font-size:12px; margin-top:2px; }
        .badges { display:flex; gap:8px; margin:12px 0 20px; }
        .badge { padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; border:1px solid; }
        .badge-purple { border-color:#7c3aed; color:#7c3aed; }
        .cards { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px; }
        .card { padding:14px 16px; border-radius:8px; border:1px solid; }
        .card-blue { background:#eff6ff; border-color:#bfdbfe; }
        .card-red { background:#fef2f2; border-color:#fecaca; }
        .card-green { background:#f0fdf4; border-color:#bbf7d0; }
        .card-orange { background:#fff7ed; border-color:#fed7aa; }
        .card-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
        .card-value { font-size:18px; font-weight:700; }
        .card-sub { font-size:10px; margin-top:2px; opacity:0.7; }
        .blue { color:#1d4ed8; } .red { color:#b91c1c; } .green { color:#047857; } .orange { color:#c2410c; }
        table { width:100%; border-collapse:collapse; }
        thead { background:#f9fafb; }
        th { padding:8px 12px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#6b7280; }
        th.right { text-align:right; }
        tfoot tr { border-top:2px solid #e5e7eb; background:#f9fafb; }
        tfoot td { padding:8px 12px; font-weight:700; }
        tfoot td.right { text-align:right; }
        .footer-note { text-align:center; margin-top:24px; font-size:10px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:12px; }
        @media print { body { padding:10px; } }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:16px;">
        <div><h1>Rapport Financier</h1><p class="subtitle">${periodLabel} &bull; ${modeLabel}</p></div>
        <div style="text-align:right;font-size:11px;color:#6b7280;">Généré le ${today}</div>
      </div>
      <div class="cards">
        <div class="card card-blue">
          <div class="card-label blue">Revenus</div>
          <div class="card-value blue">${formatCurrency(summary.revenues)}</div>
          <div class="card-sub">${formatCurrencyFull(summary.revenues)}</div>
        </div>
        <div class="card card-red">
          <div class="card-label red">Dépenses</div>
          <div class="card-value red">${formatCurrency(summary.expenses)}</div>
          <div class="card-sub">${formatCurrencyFull(summary.expenses)}</div>
        </div>
        <div class="card ${summary.profit >= 0 ? 'card-green' : 'card-orange'}">
          <div class="card-label ${summary.profit >= 0 ? 'green' : 'orange'}">Bénéfices</div>
          <div class="card-value ${summary.profit >= 0 ? 'green' : 'orange'}">${summary.profit >= 0 ? '+' : ''}${formatCurrency(summary.profit)}</div>
          <div class="card-sub">${formatCurrencyFull(summary.profit)}</div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>${displayMode === 'year' ? 'Mois' : 'Jour'}</th>
          <th class="right" style="color:#2563eb">Revenus</th>
          <th class="right" style="color:#dc2626">Dépenses</th>
          <th class="right" style="color:#059669">Bénéfices</th>
          <th class="right">Marge</th>
        </tr></thead>
        <tbody>${rowsHTML}</tbody>
        <tfoot><tr>
          <td>Total</td>
          <td class="right" style="color:#1d4ed8">${formatCurrency(summary.revenues)}</td>
          <td class="right" style="color:#b91c1c">${formatCurrency(summary.expenses)}</td>
          <td class="right" style="color:${totalProfitColor}">${summary.profit >= 0 ? '+' : ''}${formatCurrency(summary.profit)}</td>
          <td class="right" style="color:${totalProfitColor}">${summary.revenues > 0 ? `${((summary.profit / summary.revenues) * 100).toFixed(0)}%` : '—'}</td>
        </tr></tfoot>
      </table>
      <div class="footer-note">Cercleof — The Cercle Of Beauty &bull; Rapport généré automatiquement</div>
    </body></html>`
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tableau Détaillé</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Revenus, dépenses et bénéfices par période
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimer</span>
            </Button>

            {/* Export dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(v => !v)}
                className="flex items-center gap-1.5 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Télécharger</span>
                <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={handleExportPNG}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Exporter en PNG
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    Exporter en PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Click-outside handler for export dropdown */}
        {showExportMenu && (
          <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
        )}

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm no-print">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              {/* Display mode */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Mode d'affichage</label>
                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {(['week', 'month', 'year'] as DisplayMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setDisplayMode(mode)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        displayMode === mode
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {modeLabels[mode]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month selector (hidden in year mode) */}
              {displayMode !== 'year' && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Mois</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-36 h-9 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Year selector */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Année</label>
                <Select value={String(selectedYear2)} onValueChange={v => setSelectedYear2(Number(v))}>
                  <SelectTrigger className="w-28 h-9 text-sm border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week navigation (week mode only) */}
              {displayMode === 'week' && weeks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Semaine</label>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentWeekIndex === 0}
                      onClick={() => setCurrentWeekIndex(i => Math.max(0, i - 1))}
                      className="h-9 w-9 p-0 border-gray-200 dark:border-gray-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[120px] text-center px-2">
                      Sem. {weeks[currentWeekIndex]?.weekNum || 1}
                      <span className="block text-gray-400 font-normal text-[10px]">
                        {weeks[currentWeekIndex]?.label}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentWeekIndex >= weeks.length - 1}
                      onClick={() => setCurrentWeekIndex(i => Math.min(weeks.length - 1, i + 1))}
                      className="h-9 w-9 p-0 border-gray-200 dark:border-gray-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                      {currentWeekIndex + 1}/{weeks.length}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* === PRINTABLE AREA (also used for PNG/PDF export) === */}
        <div id="details-print-area" ref={printRef}>

          {/* Screen-only subtle header for printable section */}

          {/* Period badge */}
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{getPeriodLabel()}</span>
            <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 dark:border-purple-700 dark:text-purple-400">
              {modeLabels[displayMode]}
            </Badge>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Revenues */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-200 dark:border-blue-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Revenus</p>
                    {loading ? (
                      <div className="h-7 w-32 bg-blue-200 dark:bg-blue-800 rounded animate-pulse mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{formatCurrency(summary.revenues)}</p>
                    )}
                    <p className="text-[10px] text-blue-500 dark:text-blue-500 mt-0.5">{formatCurrencyFull(summary.revenues)}</p>
                  </div>
                  <div className="p-2 bg-blue-100 dark:bg-blue-800/40 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10 border-red-200 dark:border-red-800 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Dépenses</p>
                    {loading ? (
                      <div className="h-7 w-32 bg-red-200 dark:bg-red-800 rounded animate-pulse mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-red-700 dark:text-red-300 mt-1">{formatCurrency(summary.expenses)}</p>
                    )}
                    <p className="text-[10px] text-red-500 dark:text-red-500 mt-0.5">{formatCurrencyFull(summary.expenses)}</p>
                  </div>
                  <div className="p-2 bg-red-100 dark:bg-red-800/40 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit */}
            <Card className={`bg-gradient-to-br ${
              summary.profit >= 0
                ? 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 border-emerald-200 dark:border-emerald-800'
                : 'from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 border-orange-200 dark:border-orange-800'
            } shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-xs font-medium uppercase tracking-wider ${summary.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                      Bénéfices
                    </p>
                    {loading ? (
                      <div className="h-7 w-32 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse mt-1" />
                    ) : (
                      <p className={`text-xl font-bold mt-1 ${summary.profit >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}>
                        {summary.profit >= 0 ? '+' : ''}{formatCurrency(summary.profit)}
                      </p>
                    )}
                    <p className={`text-[10px] mt-0.5 ${summary.profit >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {formatCurrencyFull(summary.profit)}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${summary.profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-800/40' : 'bg-orange-100 dark:bg-orange-800/40'}`}>
                    <DollarSign className={`w-5 h-5 ${summary.profit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-orange-500 dark:text-orange-400'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <CardTitle className="text-sm font-semibold text-gray-800 dark:text-white">
                  {displayMode === 'week' && weeks[currentWeekIndex]
                    ? `Détail — Semaine ${weeks[currentWeekIndex].weekNum} (${weeks[currentWeekIndex].label})`
                    : displayMode === 'month'
                    ? `Détail — ${MONTHS_FR[monthIndex]} ${selectedYear2}`
                    : `Détail — Année ${selectedYear2}`}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Chargement des données...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[180px]">
                          {displayMode === 'year' ? 'Mois' : 'Jour'}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-blue-500 uppercase tracking-wider">
                          Revenus
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-red-500 uppercase tracking-wider">
                          Dépenses
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-emerald-500 uppercase tracking-wider">
                          Bénéfices
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-[80px]">
                          Marge
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => {
                        const margin = row.revenues > 0
                          ? ((row.profit / row.revenues) * 100).toFixed(0)
                          : '—'
                        const isOutsideMonth = displayMode === 'week' &&
                          (row.date.getMonth() !== monthIndex || row.date.getFullYear() !== selectedYear2)

                        return (
                          <tr
                            key={idx}
                            className={`border-b border-gray-50 dark:border-gray-700/50 transition-colors ${
                              isOutsideMonth
                                ? 'opacity-30'
                                : 'hover:bg-gray-50/60 dark:hover:bg-gray-700/30'
                            } ${row.profit !== 0 ? profitBg(row.profit) : ''}`}
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className={`font-medium ${isOutsideMonth ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                  {row.label}
                                </span>
                                {row.sublabel && displayMode === 'year' && (
                                  <span className="text-[10px] text-gray-400">{row.sublabel}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium tabular-nums ${
                                row.revenues > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'
                              }`}>
                                {row.revenues > 0 ? formatCurrency(row.revenues) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-medium tabular-nums ${
                                row.expenses > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'
                              }`}>
                                {row.expenses > 0 ? formatCurrency(row.expenses) : '—'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold tabular-nums ${profitColor(row.profit)}`}>
                              {row.revenues === 0 && row.expenses === 0
                                ? <span className="text-gray-300 dark:text-gray-600">—</span>
                                : `${row.profit >= 0 ? '+' : ''}${formatCurrency(row.profit)}`
                              }
                            </td>
                            <td className="px-4 py-3 text-right">
                              {margin === '—' ? (
                                <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                              ) : (
                                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                  Number(margin) >= 0
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {margin}%
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* Totals row */}
                    <tfoot>
                      <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-600">
                        <td className="px-4 py-3 font-bold text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700 dark:text-blue-300">
                          {formatCurrency(summary.revenues)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600 dark:text-red-400">
                          {formatCurrency(summary.expenses)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold tabular-nums ${profitColor(summary.profit)}`}>
                          {summary.profit >= 0 ? '+' : ''}{formatCurrency(summary.profit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {summary.revenues > 0 && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                              summary.profit >= 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {((summary.profit / summary.revenues) * 100).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Week pagination dots (week mode) */}
          {displayMode === 'week' && weeks.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3 no-print">
              {weeks.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentWeekIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentWeekIndex
                      ? 'bg-purple-600 w-4'
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

        </div>
        {/* === END PRINTABLE AREA === */}

      </div>
    </>
  )
}
