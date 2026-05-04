"use client"

import { useCallback, useSyncExternalStore } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import {
  DealTable,
  type DealSortField,
  type SortDirection,
} from "@/components/deals/deal-table"
import { STAGE_CONFIG, STAGE_ORDER } from "@/components/deals/stage-badge"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "circle:deals-groups-collapsed"
const STORAGE_EVENT = "circle:deals-groups-collapsed-change"

const EMPTY_SET: ReadonlySet<DealStage> = new Set()

let cachedRaw: string | null | undefined = undefined
let cachedSnapshot: ReadonlySet<DealStage> = EMPTY_SET

function isStage(s: unknown): s is DealStage {
  return (
    s === "lead" ||
    s === "qualified" ||
    s === "proposal" ||
    s === "negotiation" ||
    s === "won" ||
    s === "lost"
  )
}

function readSnapshot(): ReadonlySet<DealStage> {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cachedRaw) return cachedSnapshot
  cachedRaw = raw

  if (!raw) {
    cachedSnapshot = EMPTY_SET
    return cachedSnapshot
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      cachedSnapshot = EMPTY_SET
      return cachedSnapshot
    }
    cachedSnapshot = new Set(parsed.filter(isStage))
  } catch {
    cachedSnapshot = EMPTY_SET
  }
  return cachedSnapshot
}

function subscribeStorage(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  window.addEventListener(STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(STORAGE_EVENT, callback)
  }
}

function getServerSnapshot(): ReadonlySet<DealStage> {
  return EMPTY_SET
}

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

function totalEur(deals: DealWithRelations[]): number {
  return deals.reduce((acc, d) => acc + (d.value_eur ?? 0), 0)
}

export function DealGroupsView({
  deals,
  sortField,
  sortDirection,
  onSortChange,
  selection,
}: {
  deals: DealWithRelations[]
  sortField: DealSortField
  sortDirection: SortDirection
  onSortChange: (field: DealSortField) => void
  // Phase 29.5: shared selection across all stage groups so the
  // single bulk-action bar (rendered by DealsList above) sees the
  // total. The mode is derived per-group below — each group's
  // header checkbox reflects only its own deals' selection state,
  // even though the underlying Set is shared.
  selection?: {
    isSelected: (id: string) => boolean
    toggle: (id: string) => void
    toggleAll: () => void
    mode: "none" | "some" | "all"
  }
}) {
  const collapsed = useSyncExternalStore(
    subscribeStorage,
    readSnapshot,
    getServerSnapshot
  )

  const toggle = useCallback((stage: DealStage) => {
    const next = new Set(readSnapshot())
    if (next.has(stage)) next.delete(stage)
    else next.add(stage)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch {
      // Ignore quota errors; in-memory state still works for the session.
    }
  }, [])

  const groups = STAGE_ORDER.map((stage) => ({
    stage,
    deals: deals.filter((d) => d.stage === stage),
  }))

  return (
    <div className="space-y-4">
      {groups.map(({ stage, deals: groupDeals }) => {
        const config = STAGE_CONFIG[stage]
        const isEmpty = groupDeals.length === 0
        const isCollapsed = collapsed.has(stage) && !isEmpty
        const headingId = `deals-group-${stage}-heading`
        const total = totalEur(groupDeals)

        return (
          <section key={stage} aria-labelledby={headingId}>
            <button
              type="button"
              onClick={() => toggle(stage)}
              aria-expanded={!isCollapsed}
              aria-controls={`deals-group-${stage}-body`}
              disabled={isEmpty}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                !isEmpty && "cursor-pointer hover:bg-muted/50",
                isEmpty && "cursor-default"
              )}
            >
              {isCollapsed ? (
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ChevronDown
                  className={cn(
                    "h-4 w-4",
                    isEmpty
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
              )}
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(${config.cssVar})` }}
              />
              <h3 id={headingId} className="text-sm font-medium">
                {config.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                {groupDeals.length}
              </span>
              {total > 0 && (
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  {eurFormatter.format(total)}
                </span>
              )}
            </button>

            {!isCollapsed && (
              <div id={`deals-group-${stage}-body`} className="mt-2">
                {isEmpty ? (
                  <p className="px-2 pb-2 text-sm text-muted-foreground">
                    No deals in this stage.
                  </p>
                ) : (
                  <DealTable
                    deals={groupDeals}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                    hideHeader
                    selection={selection}
                  />
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
