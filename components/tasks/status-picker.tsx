"use client"

import { useState } from "react"
import { CheckCircle2, Circle, CircleDot } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TASK_STATUSES, type TaskStatus } from "@/lib/db/tasks"
import { cn } from "@/lib/utils"

/**
 * 3-state status picker for a task row. Pipedrive-style:
 *   * Click the icon → popover with the 3 explicit choices.
 *   * Each choice has its own icon + label + color so the meaning
 *     reads at a glance even before the user opens the popover.
 *
 * Explicit-choice popover beats cycle-on-click because:
 *   * Cycle-on-click costs 2 clicks to reach the third state, with
 *     no visual hint of where you'll land mid-cycle.
 *   * A 3-option popover is one click to see options, one click to
 *     pick — same cost as cycle, but deliberate.
 *
 * Beats a Select primitive because Select has more chrome (chevron,
 * "value" formatting, opening animation) and the 3 options fit in a
 * popover small enough to feel like an inline control rather than
 * a form field.
 *
 * The component is fully controlled — task-row owns the optimistic
 * state and passes the current value + a setter.
 */
export function StatusPicker({
  value,
  onChange,
  size = "sm",
  disabled = false,
  className,
}: {
  value: TaskStatus
  onChange: (next: TaskStatus) => void
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const cfg = STATUS_CONFIG[value]
  const Icon = cfg.icon

  const sizeClass =
    size === "sm" ? "h-4 w-4" : "h-5 w-5"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-label={`Status: ${cfg.label}. Klicken zum Ändern.`}
        title={cfg.label}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          cfg.colorClass,
          className
        )}
      >
        <Icon className={sizeClass} aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        <ul role="listbox" className="space-y-0.5">
          {TASK_STATUSES.map((status) => {
            const itemCfg = STATUS_CONFIG[status]
            const ItemIcon = itemCfg.icon
            const selected = status === value
            return (
              <li key={status}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(status)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                    selected && "bg-muted"
                  )}
                >
                  <ItemIcon
                    className={cn("h-4 w-4 shrink-0", itemCfg.colorClass)}
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate">{itemCfg.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Status presentation table. Centralised so TaskRow, TasksTabs, the
 * dashboard widget, and the bulk action bar all label and colour
 * statuses the same way.
 *
 * Colour choices:
 *   * open        → muted-foreground (neutral, no signal)
 *   * in_progress → status-proposal (amber — "active work")
 *   * completed   → status-customer (green — "done")
 */
export const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string
    icon: typeof Circle
    colorClass: string
  }
> = {
  open: {
    label: "Offen",
    icon: Circle,
    colorClass: "text-muted-foreground hover:text-foreground",
  },
  in_progress: {
    label: "In Bearbeitung",
    icon: CircleDot,
    colorClass:
      "text-status-proposal hover:text-status-proposal hover:opacity-80",
  },
  completed: {
    label: "Erledigt",
    icon: CheckCircle2,
    colorClass:
      "text-status-customer hover:text-status-customer hover:opacity-80",
  },
}
