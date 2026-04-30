import { STAGE_CONFIG } from "@/components/deals/stage-badge"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
})

function formatEur(value: number | null): string {
  return value === null ? "—" : eurFormatter.format(value)
}

function initials(c: DealWithRelations["primary_contact"]): string {
  if (!c) return "—"
  const first = c.first_name.charAt(0)
  const last = c.last_name?.charAt(0) ?? ""
  return (first + last).toUpperCase() || "?"
}

function fullName(c: DealWithRelations["primary_contact"]): string {
  if (!c) return ""
  return [c.first_name, c.last_name].filter(Boolean).join(" ")
}

export function DealKanbanCard({
  deal,
  isDragging = false,
}: {
  deal: DealWithRelations
  isDragging?: boolean
}) {
  const config = STAGE_CONFIG[deal.stage as DealStage]

  return (
    <div
      className={cn(
        "rounded-md border border-l-4 border-border bg-card p-3 transition-shadow",
        isDragging && "rotate-1 shadow-lg ring-1 ring-border/40"
      )}
      style={{ borderLeftColor: `var(${config.cssVar})` }}
    >
      <p className="truncate text-sm font-medium">{deal.title}</p>
      {deal.company && (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {deal.company.name}
        </p>
      )}
      {deal.primary_contact && (
        <div className="mt-2 flex min-w-0 items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
            {initials(deal.primary_contact)}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {fullName(deal.primary_contact)}
          </span>
        </div>
      )}
      <p
        className={cn(
          "mt-2 text-xs tabular-nums",
          deal.value_eur === null ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {formatEur(deal.value_eur)}
      </p>
    </div>
  )
}
