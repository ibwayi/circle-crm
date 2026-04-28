import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type CustomerStatus = "lead" | "customer" | "closed"

// Single source of truth for status presentation. Reused by the Kanban
// columns (T-8) so labels and colors stay aligned across views.
export const STATUS_CONFIG = {
  lead: {
    label: "Lead",
    cssVar: "--status-lead",
    badgeClass:
      "bg-status-lead/10 text-status-lead border-status-lead/30 hover:bg-status-lead/15",
  },
  customer: {
    label: "Customer",
    cssVar: "--status-customer",
    badgeClass:
      "bg-status-customer/10 text-status-customer border-status-customer/30 hover:bg-status-customer/15",
  },
  closed: {
    label: "Closed",
    cssVar: "--status-closed",
    badgeClass:
      "bg-status-closed/10 text-status-closed border-status-closed/30 hover:bg-status-closed/15",
  },
} as const satisfies Record<
  CustomerStatus,
  { label: string; cssVar: string; badgeClass: string }
>

export function StatusBadge({
  status,
  className,
}: {
  status: CustomerStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn(config.badgeClass, className)}
    >
      {config.label}
    </Badge>
  )
}
