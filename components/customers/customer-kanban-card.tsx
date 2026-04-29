import {
  STATUS_CONFIG,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import type { Customer } from "@/lib/db/customers"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

function formatEur(value: number | null): string {
  return value === null ? "—" : eurFormatter.format(value)
}

export function CustomerKanbanCard({
  customer,
  isDragging = false,
}: {
  customer: Customer
  isDragging?: boolean
}) {
  const config = STATUS_CONFIG[customer.status as CustomerStatus]

  return (
    <div
      className={cn(
        "rounded-md border border-l-4 border-border bg-card p-3 transition-shadow",
        isDragging && "rotate-1 shadow-lg ring-1 ring-border/40"
      )}
      style={{ borderLeftColor: `var(${config.cssVar})` }}
    >
      <p className="truncate text-sm font-medium">{customer.name}</p>
      {customer.company && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {customer.company}
        </p>
      )}
      <p
        className={cn(
          "mt-2 text-xs tabular-nums",
          customer.value_eur === null
            ? "text-muted-foreground"
            : "text-foreground"
        )}
      >
        {formatEur(customer.value_eur)}
      </p>
    </div>
  )
}
