import Link from "next/link"
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

export function DashboardRecentActivity({
  deals,
}: {
  deals: DealWithRelations[]
}) {
  return (
    <section aria-labelledby="recent-heading" className="space-y-3">
      <header className="flex items-baseline gap-2">
        <h3 id="recent-heading" className="text-base font-medium">
          Recent activity
        </h3>
        <span className="text-xs text-muted-foreground">
          (last {deals.length})
        </span>
      </header>

      {deals.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          No recent activity yet.
        </p>
      ) : (
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
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatEur(deal.value_eur)}
                </span>
                <time
                  dateTime={deal.updated_at}
                  className="hidden shrink-0 text-xs text-muted-foreground sm:inline"
                >
                  {formatRelative(deal.updated_at)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
