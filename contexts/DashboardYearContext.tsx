'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DashboardYearContextValue {
  selectedYear: number
  setSelectedYear: (year: number) => void
  availableYears: number[]
  loadingYears: boolean
}

const DashboardYearContext = createContext<DashboardYearContextValue | undefined>(undefined)

export function DashboardYearProvider({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear])
  const [loadingYears, setLoadingYears] = useState(true)

  useEffect(() => {
    const loadYears = async () => {
      try {
        setLoadingYears(true)
        const [earliestSaleResult, earliestRevenueResult] = await Promise.all([
          supabase
            .from('dd-ventes')
            .select('date')
            .eq('status', 'paye')
            .order('date', { ascending: true })
            .limit(1),
          supabase
            .from('dd-revenues')
            .select('date')
            .order('date', { ascending: true })
            .limit(1),
        ])

        const years = [currentYear]
        const earliestSale = earliestSaleResult.data?.[0]?.date
        const earliestRevenue = earliestRevenueResult.data?.[0]?.date
        if (earliestSale) years.push(new Date(earliestSale).getFullYear())
        if (earliestRevenue) years.push(new Date(earliestRevenue).getFullYear())

        const minYear = Math.min(...years)
        const list = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i).reverse()
        setAvailableYears(list)

        if (!list.includes(selectedYear)) {
          setSelectedYear(currentYear)
        }
      } catch (error) {
        console.error('Error loading available years:', error)
        setAvailableYears([currentYear])
      } finally {
        setLoadingYears(false)
      }
    }

    loadYears()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(
    () => ({
      selectedYear,
      setSelectedYear,
      availableYears,
      loadingYears,
    }),
    [selectedYear, availableYears, loadingYears]
  )

  return (
    <DashboardYearContext.Provider value={value}>
      {children}
    </DashboardYearContext.Provider>
  )
}

export function useDashboardYear() {
  const context = useContext(DashboardYearContext)
  if (!context) {
    throw new Error('useDashboardYear must be used within DashboardYearProvider')
  }
  return context
}
