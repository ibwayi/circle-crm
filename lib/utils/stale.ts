import { differenceInCalendarDays } from "date-fns"

/**
 * Default stale threshold in days. Phase 25 spec — overridable per-user
 * via localStorage on the client (see `useStaleThreshold`). Server
 * renders use this default since they have no access to the user's
 * preference; the client recomputes badges on hydrate if the stored
 * value differs.
 */
export const STALE_THRESHOLD_DEFAULT_DAYS = 7

export type StaleStatus = "fresh" | "stale" | "very_stale" | "closed"

/**
 * Classify a deal by recency of activity.
 *   * `closed`     — won/lost. No activity is expected; never stale.
 *   * `fresh`      — touched within the threshold window.
 *   * `stale`      — past one threshold-window without an update.
 *   * `very_stale` — past two threshold-windows. Doubling avoids a
 *                    third config knob — at 7-day default, "very stale"
 *                    kicks in at 14 days, which feels intuitively
 *                    "really overdue."
 *
 * `daysSince` is calendar-day-based (`differenceInCalendarDays`) so a
 * deal updated yesterday at 23:59 reads as 1 day stale at 00:01 today
 * — same model as the task overdue calc in lib/utils/dates.ts.
 */
export function getStaleStatus(
  deal: { stage: string; updated_at: string },
  thresholdDays: number = STALE_THRESHOLD_DEFAULT_DAYS
): StaleStatus {
  if (deal.stage === "won" || deal.stage === "lost") return "closed"

  const days = daysSinceUpdate(deal.updated_at)
  if (days < thresholdDays) return "fresh"
  if (days < thresholdDays * 2) return "stale"
  return "very_stale"
}

/**
 * Days elapsed since the deal's `updated_at`. Calendar-day diff (not
 * 24h diff) — same convention as `formatDueDate`. Exported so callers
 * can render the day-count without re-importing date-fns just for
 * `differenceInCalendarDays`.
 */
export function daysSinceUpdate(updatedAtIso: string): number {
  return differenceInCalendarDays(new Date(), new Date(updatedAtIso))
}

/**
 * German label for the badge. Returns null when nothing should render
 * (fresh deals, closed deals).
 */
export function getStaleLabel(
  status: StaleStatus,
  daysSince: number
): string | null {
  if (status === "fresh" || status === "closed") return null
  const dayWord = daysSince === 1 ? "Tag" : "Tagen"
  if (status === "stale") return `Seit ${daysSince} ${dayWord} ohne Aktivität`
  return `Lange ohne Aktivität (${daysSince} ${dayWord})`
}
