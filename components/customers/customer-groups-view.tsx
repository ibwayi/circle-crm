"use client"

import { useCallback, useSyncExternalStore } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import {
  CustomerTable,
  type SortDirection,
  type SortField,
} from "@/components/customers/customer-table"
import {
  STATUS_CONFIG,
  type CustomerStatus,
} from "@/components/customers/status-badge"
import type { Customer } from "@/lib/db/customers"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "circle:groups-collapsed"
// localStorage's native `storage` event only fires for cross-tab writes, so
// our in-tab toggles dispatch this custom event to nudge useSyncExternalStore
// subscribers in the same tab.
const STORAGE_EVENT = "circle:groups-collapsed-change"
const STATUS_ORDER: CustomerStatus[] = ["lead", "customer", "closed"]

const EMPTY_SET: ReadonlySet<CustomerStatus> = new Set()

// Module-level snapshot cache: useSyncExternalStore expects getSnapshot to
// return a stable reference whenever the underlying value hasn't changed.
let cachedRaw: string | null | undefined = undefined
let cachedSnapshot: ReadonlySet<CustomerStatus> = EMPTY_SET

function readSnapshot(): ReadonlySet<CustomerStatus> {
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
    cachedSnapshot = new Set(
      parsed.filter(
        (s): s is CustomerStatus =>
          s === "lead" || s === "customer" || s === "closed"
      )
    )
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

function getServerSnapshot(): ReadonlySet<CustomerStatus> {
  return EMPTY_SET
}

export function CustomerGroupsView({
  customers,
  sortField,
  sortDirection,
  onSortChange,
}: {
  customers: Customer[]
  sortField: SortField
  sortDirection: SortDirection
  onSortChange: (field: SortField) => void
}) {
  const collapsed = useSyncExternalStore(
    subscribeStorage,
    readSnapshot,
    getServerSnapshot
  )

  const toggle = useCallback((status: CustomerStatus) => {
    const next = new Set(readSnapshot())
    if (next.has(status)) next.delete(status)
    else next.add(status)
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(next))
      )
      window.dispatchEvent(new Event(STORAGE_EVENT))
    } catch {
      // Ignore quota errors; in-memory state still works for the session.
    }
  }, [])

  const groups = STATUS_ORDER.map((status) => ({
    status,
    customers: customers.filter((c) => c.status === status),
  }))

  return (
    <div className="space-y-4">
      {groups.map(({ status, customers: groupCustomers }) => {
        const config = STATUS_CONFIG[status]
        const isEmpty = groupCustomers.length === 0
        // Empty groups always render their muted body, regardless of the
        // saved collapse flag — there's nothing meaningful to hide.
        const isCollapsed = collapsed.has(status) && !isEmpty
        const headingId = `group-${status}-heading`

        return (
          <section key={status} aria-labelledby={headingId}>
            <button
              type="button"
              onClick={() => toggle(status)}
              aria-expanded={!isCollapsed}
              aria-controls={`group-${status}-body`}
              disabled={isEmpty}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors",
                !isEmpty && "hover:bg-muted/50",
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
                    isEmpty ? "text-muted-foreground/50" : "text-muted-foreground"
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
                {groupCustomers.length}
              </span>
            </button>

            {!isCollapsed && (
              <div id={`group-${status}-body`} className="mt-2">
                {isEmpty ? (
                  <p className="px-2 pb-2 text-sm text-muted-foreground">
                    No customers in this group.
                  </p>
                ) : (
                  <CustomerTable
                    customers={groupCustomers}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                    hideHeader
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
