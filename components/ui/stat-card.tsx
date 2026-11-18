import * as React from "react"
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

// Tones are "r g b" triplets so the card can tint its icon, top bar and hover glow.
export const TONES = {
  violet: "184 146 42",
  pink: "197 138 53",
  emerald: "201 162 39", // gold (was green): gold is the main color of the summary cards
  sky: "224 127 36",    // copper orange (was blue)
  amber: "245 158 11",
  rose: "133 122 106",  // warm gray (was red)
  indigo: "192 102 26", // deep copper (was indigo)
  teal: "212 175 55",   // bright gold (was teal)
  slate: "110 120 145",
} as const

export type Tone = keyof typeof TONES

interface StatCardProps {
  label: React.ReactNode
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  tone?: Tone
  /** Small text under the value */
  hint?: React.ReactNode
  /** Percentage change: shows a green/red pill */
  trend?: number | null
  trendLabel?: string
  onClick?: () => void
  className?: string
  /** Index for the staggered entrance animation */
  index?: number
  loading?: boolean
}

/** Summary card (KPI) — label, big number, icon, optional trend */
export function StatCard({
  label, value, icon: Icon, tone = "violet", hint, trend, trendLabel, onClick, className, index = 0, loading,
}: StatCardProps) {
  const style = { "--tone": TONES[tone], "--i": index } as React.CSSProperties
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      style={style}
      className={cn("stat-card rise text-left w-full", onClick && "is-clickable", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="stat-card-label truncate">{label}</p>
          <div className="stat-card-value truncate">
            {loading ? <span className="skeleton inline-block h-7 w-24 align-middle" /> : value}
          </div>
        </div>
        {Icon && (
          <span className="stat-card-icon">
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
      {(hint || (trend !== undefined && trend !== null)) && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {trend !== undefined && trend !== null && <TrendPill value={trend} />}
          {(hint || trendLabel) && <span className="stat-card-hint">{hint ?? trendLabel}</span>}
        </div>
      )}
    </Comp>
  )
}

export function TrendPill({ value, className }: { value: number; className?: string }) {
  const rounded = Math.round(value * 10) / 10
  const kind = rounded > 0 ? "trend-up" : rounded < 0 ? "trend-down" : "trend-flat"
  const Icon = rounded > 0 ? ArrowUpRight : rounded < 0 ? ArrowDownRight : Minus
  return (
    <span className={cn("trend", kind, className)}>
      <Icon className="h-3 w-3" />
      {rounded > 0 ? "+" : ""}{rounded.toLocaleString("fr-FR")}%
    </span>
  )
}

/** Responsive grid for summary cards */
export function StatGrid({ children, className, cols = 4 }: { children: React.ReactNode; className?: string; cols?: 2 | 3 | 4 | 5 }) {
  const colClass = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 xl:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
  }[cols]
  return <div className={cn("grid grid-cols-1 gap-4", colClass, className)}>{children}</div>
}
