import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { de } from "date-fns/locale"

// Today as `yyyy-MM-dd` in local time. Postgres `date` is timezone-naive,
// so comparing against a local-time date string avoids the UTC-shift
// trap (a German user's "today" at 23:00 CEST must not become "tomorrow"
// via toISOString detour).
export function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export type DueTone = "today" | "overdue" | "upcoming" | "none"

export type DueLabel = {
  label: string
  tone: DueTone
}

/**
 * Format a Postgres-`date` string for display in task lists. The shape
 * combines a German label with a tone discriminator so the consumer can
 * tint the badge without re-deriving the state.
 *
 *   today          → { "Heute",                  tone: "today" }
 *   2 days overdue → { "Überfällig (2 Tage)",    tone: "overdue" }
 *   1 day overdue  → { "Überfällig (1 Tag)",     tone: "overdue" }
 *   tomorrow       → { "Morgen",                 tone: "upcoming" }
 *   N≤7 days out   → { "in N Tagen",             tone: "upcoming" }
 *   >7 days out    → { "15. April 2026",         tone: "upcoming" }
 *   null           → { "—",                      tone: "none" }
 *
 * The "open or completed" distinction is the caller's: completed
 * overdue tasks should still render as "overdue" tone (red) by spec.
 * If a future call site wants to soften that, gate the tone outside.
 */
export function formatDueDate(date: string | null): DueLabel {
  if (!date) return { label: "—", tone: "none" }

  const d = parseISO(date)
  // Calendar-day diff (not 24h diff) — same as date-fns docs recommend
  // for "is the user's local 'today' before/after this date." Returns
  // negative for past, 0 for today, positive for future.
  const diff = differenceInCalendarDays(d, new Date())

  if (diff === 0) return { label: "Heute", tone: "today" }
  if (diff < 0) {
    const n = Math.abs(diff)
    return {
      label: `Überfällig (${n} ${n === 1 ? "Tag" : "Tage"})`,
      tone: "overdue",
    }
  }
  if (diff === 1) return { label: "Morgen", tone: "upcoming" }
  if (diff <= 7) return { label: `in ${diff} Tagen`, tone: "upcoming" }
  return { label: format(d, "d. MMMM yyyy", { locale: de }), tone: "upcoming" }
}
