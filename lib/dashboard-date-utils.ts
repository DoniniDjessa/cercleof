export type RelativeDayFilter = 'today' | 'yesterday' | 'before_yesterday'
export type DashboardFilterMode = 'relative' | 'month' | 'range' | 'year'
export type RevenueChartMode = 'month' | 'week' | 'weekday' | 'year'

export interface DateRange {
  start: Date
  end: Date
  label: string
}

export const MONTH_OPTIONS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
] as const

export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return startOfDay(new Date(y, (m || 1) - 1, d || 1))
}

export function getIsoWeekStart(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function getWeekLabel(date: Date): string {
  const weekStart = getIsoWeekStart(date)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const startLabel = weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const endLabel = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${startLabel} - ${endLabel}`
}

function getRelativeDayDate(relative: RelativeDayFilter): Date {
  const date = startOfDay(new Date())
  if (relative === 'yesterday') date.setDate(date.getDate() - 1)
  if (relative === 'before_yesterday') date.setDate(date.getDate() - 2)
  return date
}

export function resolveActiveFilterMode(params: {
  relativeDay?: RelativeDayFilter | ''
  month?: string
  rangeStart?: string
  rangeEnd?: string
}): DashboardFilterMode {
  if (params.rangeStart && params.rangeEnd) return 'range'
  if (params.month) return 'month'
  if (params.relativeDay) return 'relative'
  return 'year'
}

export function resolveDashboardDateRange(params: {
  mode: DashboardFilterMode
  relativeDay?: RelativeDayFilter | ''
  month?: string
  rangeStart?: string
  rangeEnd?: string
  year: number
}): DateRange {
  const now = new Date()
  const year = params.year || now.getFullYear()

  switch (params.mode) {
    case 'relative': {
      const day = getRelativeDayDate((params.relativeDay || 'today') as RelativeDayFilter)
      const labels: Record<RelativeDayFilter, string> = {
        today: "Aujourd'hui",
        yesterday: 'Hier',
        before_yesterday: 'Avant-hier',
      }
      return {
        start: startOfDay(day),
        end: endOfDay(day),
        label: labels[(params.relativeDay || 'today') as RelativeDayFilter],
      }
    }
    case 'month': {
      const month = params.month || String(now.getMonth() + 1).padStart(2, '0')
      const monthIndex = parseInt(month, 10) - 1
      const start = new Date(year, monthIndex, 1)
      const end = endOfDay(new Date(year, monthIndex + 1, 0))
      return {
        start: startOfDay(start),
        end,
        label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      }
    }
    case 'range': {
      const start = params.rangeStart ? parseDateInput(params.rangeStart) : startOfDay(now)
      const end = params.rangeEnd ? endOfDay(parseDateInput(params.rangeEnd)) : endOfDay(now)
      return {
        start: startOfDay(start),
        end: end < start ? endOfDay(start) : end,
        label: `${toDateInputValue(start)} → ${toDateInputValue(end)}`,
      }
    }
    case 'year':
    default: {
      const start = new Date(year, 0, 1)
      const end = year === now.getFullYear() ? endOfDay(now) : endOfDay(new Date(year, 11, 31))
      return {
        start: startOfDay(start),
        end,
        label: `Année ${year}`,
      }
    }
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const duration = range.end.getTime() - range.start.getTime()
  const end = new Date(range.start.getTime() - 1)
  const start = new Date(end.getTime() - duration)
  return {
    start: startOfDay(start),
    end: endOfDay(end),
    label: 'Période précédente',
  }
}

export function getRevenueChartRange(
  mode: RevenueChartMode,
  chartYear: number,
  earliestYear = 2020
): DateRange {
  const now = new Date()
  const currentYear = now.getFullYear()

  switch (mode) {
    case 'week': {
      const end = endOfDay(now)
      const start = startOfDay(now)
      start.setMonth(start.getMonth() - 2)
      return {
        start,
        end,
        label: '8 dernières semaines',
      }
    }
    case 'weekday': {
      const end = endOfDay(now)
      const start = startOfDay(now)
      start.setDate(start.getDate() - 6)
      return {
        start,
        end,
        label: '7 derniers jours',
      }
    }
    case 'year': {
      return {
        start: startOfDay(new Date(earliestYear, 0, 1)),
        end: endOfDay(now),
        label: `${earliestYear} → ${currentYear}`,
      }
    }
    case 'month':
    default: {
      const year = chartYear || currentYear
      const start = new Date(year, 0, 1)
      const end = year === currentYear ? endOfDay(now) : endOfDay(new Date(year, 11, 31))
      return {
        start: startOfDay(start),
        end,
        label: `Année ${year}`,
      }
    }
  }
}

export function buildEmptyMonthSeries(year: number): Array<{ key: string; label: string; revenue: number; sales: number }> {
  const now = new Date()
  const lastMonth = year === now.getFullYear() ? now.getMonth() : 11
  const series = []
  for (let month = 0; month <= lastMonth; month++) {
    const date = new Date(year, month, 1)
    series.push({
      key: `${year}-${month}`,
      label: date.toLocaleDateString('fr-FR', { month: 'short' }),
      revenue: 0,
      sales: 0,
    })
  }
  return series
}

export function buildEmptyWeekSeries(range: DateRange): Array<{ key: string; label: string; revenue: number; sales: number }> {
  const series: Array<{ key: string; label: string; revenue: number; sales: number }> = []
  const cursor = getIsoWeekStart(range.start)
  const end = range.end

  while (cursor <= end) {
    const key = toDateInputValue(cursor)
    series.push({
      key,
      label: getWeekLabel(cursor),
      revenue: 0,
      sales: 0,
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  return series
}

export function buildEmptyWeekdaySeries(): Array<{ key: string; label: string; revenue: number; sales: number }> {
  const labels = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']
  return labels.map((label, index) => ({
    key: String(index),
    label,
    revenue: 0,
    sales: 0,
  }))
}

export function buildEmptyYearSeries(
  startYear: number,
  endYear: number
): Array<{ key: string; label: string; revenue: number; sales: number }> {
  const series = []
  for (let year = startYear; year <= endYear; year++) {
    series.push({
      key: String(year),
      label: String(year),
      revenue: 0,
      sales: 0,
    })
  }
  return series
}

export function getBucketKey(dateValue: string | Date, mode: RevenueChartMode): string {
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
  switch (mode) {
    case 'week':
      return toDateInputValue(getIsoWeekStart(date))
    case 'weekday': {
      const day = date.getDay()
      return String(day === 0 ? 6 : day - 1)
    }
    case 'year':
      return String(date.getFullYear())
    case 'month':
    default:
      return `${date.getFullYear()}-${date.getMonth()}`
  }
}
