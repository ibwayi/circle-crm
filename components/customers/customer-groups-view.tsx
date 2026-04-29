"use client"

import { useEffect, useState } from "react"
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
const STATUS_ORDER: CustomerStatus[] = ["lead", "customer", "closed"]

function readCollapsed(): Set<CustomerStatus> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(
      parsed.filter(
        (s): s is CustomerStatus =>
          s === "lead" || s === "customer" || s === "closed"
      )
    )
  } catch {
    return new Set()
  }
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
  const [collapsed, setCollapsed] = useState<Set<CustomerStatus>>(new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCollapsed(readCollapsed())
  }, [])

  function toggle(status: CustomerStatus) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(Array.from(next))
        )
      } catch {
        // Ignore quota errors; in-memory state still works for the session.
      }
      return next
    })
  }

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
        // saved collapse flag — see TICKETS.md T-8.2 deviation note.
        const isCollapsed = mounted && collapsed.has(status) && !isEmpty
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
