import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

import { StageBadge, type DealStage } from "@/components/deals/stage-badge"
import type { DealWithRelations } from "@/lib/db/deals"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

function formatEur(value: number | null): string {
  return value === null ? "—" : eurFormatter.format(value)
}

function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: de })
}

/**
 * Dashboard surface for the "Vernachlässigte Deals" list.
 *
 * Server-rendered: receives the top-N stale deals plus the total count
 * (for the "alle anzeigen" affordance when there are more than fit).
 * Returns null when there's nothing to show — recruiters land on a
 * dashboard that doesn't scold them about an empty queue (same shape
 * as the tasks-due-today section).
 */
export function DashboardStaleDeals({
  deals,
  totalCount,
  thresholdDays,
}: {
  deals: DealWithRelations[]
  totalCount: number
  thresholdDays: number
}) {
  if (deals.length === 0) return null

  const moreCount = totalCount - deals.length

  return (
    <section aria-labelledby="stale-deals-heading" className="space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h3
            id="stale-deals-heading"
            className="flex items-center gap-1.5 text-base font-medium"
          >
            <AlertTriangle
              className="h-4 w-4 text-status-proposal"
              aria-hidden="true"
            />
            Vernachlässigte Deals{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({totalCount})
            </span>
          </h3>
        </div>
        <Link
          href="/deals?stale=true"
          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Alle ansehen →
        </Link>
      </header>
      <p className="text-xs text-muted-foreground">
        Seit mehr als {thresholdDays} Tagen ohne Aktivität.
      </p>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {deals.map((deal) => (
          <li key={deal.id}>
            <Link
              href={`/deals/${deal.id}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <StageBadge
                stage={deal.stage as DealStage}
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{deal.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {deal.company?.name ?? "—"}
                </p>
              </div>
              <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:inline">
                {formatEur(deal.value_eur)}
              </span>
              <time
                dateTime={deal.updated_at}
                className="shrink-0 text-xs text-status-proposal"
              >
                {formatRelative(deal.updated_at)}
              </time>
            </Link>
          </li>
        ))}
      </ul>
      {moreCount > 0 && (
        <Link
          href="/deals?stale=true"
          className="block rounded-md border border-dashed border-border bg-card px-4 py-2 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/30"
        >
          + {moreCount} weitere vernachlässigt
        </Link>
      )}
    </section>
  )
}
