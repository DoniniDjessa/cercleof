'use client'

import * as React from 'react'
import { Filter, RefreshCw, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboardYear } from '@/contexts/DashboardYearContext'
import { MONTH_OPTIONS, toDateInputValue } from '@/lib/dashboard-date-utils'

/**
 * Horizontal period filter, same look as the dashboard one (Jour / Mois / Du / Au).
 * UI only: it drives the `dateFilter` + `dateRange` state the list pages already have
 * ('all' | 'today' | 'yesterday' | 'week' | 'month' | 'range'), so their queries are unchanged.
 * A month is turned into a 'range' on that month of the year chosen in the top bar.
 */
export type PeriodFilterValue = string
export interface PeriodRange { start: string; end: string }

interface PeriodFilterProps {
  dateFilter: PeriodFilterValue
  dateRange: PeriodRange
  onChange: (dateFilter: PeriodFilterValue, dateRange: PeriodRange) => void
  /** Optional search box shown first in the bar */
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Extra controls under the fields (e.g. type chips) */
  children?: React.ReactNode
}

const EMPTY: PeriodRange = { start: '', end: '' }
const fieldLabel = 'text-[11px] font-bold uppercase tracking-wide text-muted-foreground'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateInputValue(d)
}

function monthRange(year: number, month: string): PeriodRange {
  const m = parseInt(month, 10) - 1
  return { start: toDateInputValue(new Date(year, m, 1)), end: toDateInputValue(new Date(year, m + 1, 0)) }
}

/** Month ('01'..'12') when the range is exactly one whole month, else '' */
function rangeMonth(range: PeriodRange): { month: string; year: number } | null {
  if (!range.start || !range.end) return null
  const [y, m] = range.start.split('-')
  if (!y || !m || range.start !== `${y}-${m}-01`) return null
  return monthRange(Number(y), m).end === range.end ? { month: m, year: Number(y) } : null
}

export function PeriodFilter({
  dateFilter, dateRange, onChange, searchValue, onSearchChange, searchPlaceholder, children,
}: PeriodFilterProps) {
  const { selectedYear } = useDashboardYear()

  const beforeYesterday = daysAgo(2)
  const isBeforeYesterday = dateFilter === 'range' && dateRange.start === beforeYesterday && dateRange.end === beforeYesterday
  const selectedMonth = dateFilter === 'range' ? rangeMonth(dateRange) : null

  const dayValue = isBeforeYesterday
    ? 'before_yesterday'
    : ['today', 'yesterday', 'week', 'month'].includes(dateFilter) ? dateFilter : 'all'
  const isCustomRange = dateFilter === 'range' && !isBeforeYesterday && !selectedMonth

  // Follow the year picked in the top bar when a month is selected
  React.useEffect(() => {
    if (selectedMonth && selectedMonth.year !== selectedYear) {
      onChange('range', monthRange(selectedYear, selectedMonth.month))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear])

  const setDay = (value: string) => {
    if (value === 'before_yesterday') onChange('range', { start: beforeYesterday, end: beforeYesterday })
    else onChange(value, EMPTY)
  }
  const setMonth = (value: string) => {
    if (value === 'none') onChange('all', EMPTY)
    else onChange('range', monthRange(selectedYear, value))
  }
  const setBound = (key: 'start' | 'end', value: string) => {
    const base = isCustomRange ? dateRange : EMPTY
    const next = { ...base, [key]: value }
    onChange(next.start || next.end ? 'range' : 'all', next)
  }

  const hasFilter = dateFilter !== 'all' || !!searchValue

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="flex items-center gap-2 xl:w-44 xl:shrink-0 xl:pb-2">
            <span className="brand-mark h-8 w-8 text-primary"><Filter className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-extrabold text-foreground">Filtrer les données</p>
              <p className="text-[11px] text-muted-foreground">Année : {selectedYear}</p>
            </div>
          </div>

          <div className={`grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 ${onSearchChange ? 'lg:grid-cols-[1.4fr_repeat(4,1fr)]' : 'lg:grid-cols-4'}`}>
            {onSearchChange && (
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label className={fieldLabel}>Recherche</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchValue ?? ''}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder={searchPlaceholder ?? 'Rechercher...'}
                    className="pl-9"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Jour</Label>
              <Select value={dayValue} onValueChange={setDay}>
                <SelectTrigger><SelectValue placeholder="Choisir un jour" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd&apos;hui</SelectItem>
                  <SelectItem value="yesterday">Hier</SelectItem>
                  <SelectItem value="before_yesterday">Avant-hier</SelectItem>
                  <SelectItem value="week">7 derniers jours</SelectItem>
                  <SelectItem value="month">30 derniers jours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Mois</Label>
              <Select value={selectedMonth?.month ?? 'none'} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Choisir un mois" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tous les mois</SelectItem>
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Du</Label>
              <Input type="date" value={isCustomRange ? dateRange.start : ''} onChange={(e) => setBound('start', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>Au</Label>
              <Input type="date" value={isCustomRange ? dateRange.end : ''} onChange={(e) => setBound('end', e.target.value)} />
            </div>
          </div>

          {hasFilter && (
            <button
              type="button"
              onClick={() => { onChange('all', EMPTY); onSearchChange?.('') }}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="Réinitialiser les filtres"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="xl:hidden">Réinitialiser</span>
            </button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
