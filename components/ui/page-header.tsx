import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  /** Buttons on the right */
  actions?: React.ReactNode
  className?: string
}

/** Page title block: icon tile, title, subtitle and actions */
export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <span className="brand-mark h-11 w-11 shrink-0 text-primary">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Card section title row: title + optional subtitle and right-side controls */
export function SectionTitle({ title, description, actions, className }: {
  title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-extrabold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Empty list placeholder */
export function EmptyState({ icon: Icon, title, description, action }: {
  icon?: React.ComponentType<{ className?: string }>; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="empty-state">
      {Icon && <span className="empty-state-icon"><Icon className="h-5 w-5" /></span>}
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description && <p className="text-xs max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
