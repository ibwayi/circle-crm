import { AlertCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  STALE_THRESHOLD_DEFAULT_DAYS,
  daysSinceUpdate,
  getStaleLabel,
  getStaleStatus,
  type StaleStatus,
} from "@/lib/utils/stale"

/**
 * Inline marker for deals that haven't been touched in a while. Renders
 * nothing for fresh or closed (won/lost) deals so callers can drop it
 * into card layouts unconditionally.
 *
 * Server-renderable — uses the default threshold by default. Pass
 * `threshold` to override (e.g. from `useStaleThreshold` on a client
 * component).
 *
 * Two visual variants tied to severity:
 *   * stale       → muted-amber (uses the project's `status-proposal`
 *                   tone, same as a "due today" task pill).
 *   * very_stale  → destructive (red), same shape as overdue tasks.
 *
 * `compact` strips the text, leaving only the icon. Used on the kanban
 * card where horizontal space is tight.
 */
export function StaleBadge({
  updatedAt,
  stage,
  threshold = STALE_THRESHOLD_DEFAULT_DAYS,
  compact = false,
  className,
}: {
  updatedAt: string
  stage: string
  threshold?: number
  compact?: boolean
  className?: string
}) {
  const status = getStaleStatus({ stage, updated_at: updatedAt }, threshold)
  if (status === "fresh" || status === "closed") return null

  const days = daysSinceUpdate(updatedAt)
  const label = getStaleLabel(status, days)
  if (label === null) return null

  const tone = STALE_TONE[status as Exclude<StaleStatus, "fresh" | "closed">]

  return (
    <Badge
      variant="outline"
      title={label}
      aria-label={label}
      className={cn(
        "shrink-0 px-1.5 py-0 text-[10px] uppercase tracking-wide",
        tone,
        className
      )}
    >
      <AlertCircle className="h-3 w-3" aria-hidden="true" />
      {!compact && <span>{compactLabel(days)}</span>}
    </Badge>
  )
}

// Short label for the on-card chip — full sentence lives in the title
// attribute so hovering still gives context. Picked numerals + "d" for
// scan-density on a packed kanban column ("14d" reads instantly).
function compactLabel(days: number): string {
  return `${days}d`
}

const STALE_TONE: Record<"stale" | "very_stale", string> = {
  stale:
    "bg-status-proposal/10 text-status-proposal border-status-proposal/30",
  very_stale: "bg-destructive/10 text-destructive border-destructive/30",
}
