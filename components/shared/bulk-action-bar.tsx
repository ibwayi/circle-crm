"use client"

import { type ComponentType, type ReactNode } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type BulkAction = {
  id: string
  label: string
  // lucide-react icon components accept the same props as a generic
  // SVGSVGElement, so we type the icon as a permissive component.
  icon?: ComponentType<{ className?: string }>
  variant?: "default" | "outline" | "destructive" | "ghost"
  disabled?: boolean
  onClick: () => void | Promise<void>
}

/**
 * Sticky bottom action bar that appears when the user has selected
 * one or more rows in a list/table. Slides up from below when count
 * transitions from 0 → ≥1.
 *
 * Layout:
 *   * Desktop (sm+): single horizontal row pinned to the bottom of
 *     the viewport. Selection count + clear-X on the left, action
 *     buttons on the right.
 *   * Mobile (<sm): same shape but actions wrap onto a second row.
 *     Sidebar's mobile <Sheet> is full-screen and not displayed at
 *     the same time as the bar, so they don't compete.
 *
 * Accessibility: role="toolbar" with aria-label. Clear button is its
 * own button element so screen readers don't read "5 ausgewählt X" as
 * one weird sentence.
 *
 * Renders nothing when selectedCount === 0 — the bar just isn't in
 * the DOM unless there's something to act on.
 */
export function BulkActionBar({
  selectedCount,
  onClear,
  actions,
  children,
  className,
}: {
  selectedCount: number
  onClear: () => void
  actions: BulkAction[]
  /**
   * Optional custom controls rendered between the count chip and the
   * action buttons. Used by DealBulkActions to slot in a "Stage
   * ändern" Select that doesn't fit the BulkAction button shape.
   */
  children?: ReactNode
  className?: string
}) {
  if (selectedCount === 0) return null

  return (
    <div
      role="toolbar"
      aria-label={`Aktionen für ${selectedCount} ausgewählte Einträge`}
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 rounded-lg border border-border bg-popover p-2 shadow-lg ring-1 ring-foreground/10",
        "sm:inset-x-auto sm:left-1/2 sm:flex-row sm:items-center sm:gap-3 sm:-translate-x-1/2 sm:px-3",
        "data-open:animate-in data-open:slide-in-from-bottom-2 data-open:fade-in-0",
        // Sidebar takes md:60 = 240px on the left; offset the bar so
        // it stays visually centred on the content column.
        "md:left-[calc(50%+120px)]",
        className
      )}
      data-open
    >
      <div className="flex items-center gap-2 px-2">
        <span className="text-sm font-medium tabular-nums">
          {selectedCount}{" "}
          <span className="font-normal text-muted-foreground">ausgewählt</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClear}
          aria-label="Auswahl aufheben"
          title="Auswahl aufheben"
          className="text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.id}
              type="button"
              variant={action.variant ?? "outline"}
              size="sm"
              disabled={action.disabled}
              onClick={() => {
                void action.onClick()
              }}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {action.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
