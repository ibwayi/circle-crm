"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Columns3, LayoutList, Rows3, Search, Users } from "lucide-react"

import { CustomerGroupsView } from "@/components/customers/customer-groups-view"
import {
  CustomerTable,
  type SortDirection,
  type SortField,
} from "@/components/customers/customer-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import type { Customer, CustomerStatus } from "@/lib/db/customers"

type TabValue = "all" | CustomerStatus
type View = "table" | "groups" | "kanban"

type Counts = {
  all: number
  lead: number
  customer: number
  closed: number
}

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lead", label: "Leads" },
  { value: "customer", label: "Customers" },
  { value: "closed", label: "Closed" },
]

const VIEW_STORAGE_KEY = "circle:customer-view-default"

function isView(v: string): v is View {
  return v === "table" || v === "groups" || v === "kanban"
}

function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay)
    },
    [delay]
  )
}

export function CustomerList({
  customers,
  counts,
  initialStatus,
  initialSearch,
  sortField,
  sortDirection,
}: {
  customers: Customer[]
  counts: Counts
  initialStatus: TabValue
  initialSearch: string
  sortField: SortField
  sortDirection: SortDirection
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(initialSearch)

  // View preference persists in localStorage. Read post-mount to avoid
  // hydration mismatch — see TICKETS.md T-8.1.
  const [view, setView] = useState<View>("table")
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY)
    if (stored && isView(stored)) {
      setView(stored)
    }
  }, [])

  function changeView(next: View) {
    setView(next)
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      // Ignore quota errors.
    }
  }

  const updateUrl = useCallback(
    (next: {
      status?: TabValue
      search?: string
      sort?: SortField
      dir?: SortDirection
    }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (next.status !== undefined) {
        if (next.status === "all") {
          params.delete("status")
        } else {
          params.set("status", next.status)
        }
      }

      if (next.search !== undefined) {
        if (next.search.trim()) {
          params.set("search", next.search)
        } else {
          params.delete("search")
        }
      }

      if (next.sort !== undefined && next.dir !== undefined) {
        if (next.sort === "updated_at" && next.dir === "desc") {
          params.delete("sort")
          params.delete("dir")
        } else {
          params.set("sort", next.sort)
          params.set("dir", next.dir)
        }
      }

      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const debouncedSearchUpdate = useDebouncedCallback((value: string) => {
    updateUrl({ search: value })
  }, 200)

  function handleSearchChange(value: string) {
    setSearchInput(value)
    debouncedSearchUpdate(value)
  }

  function handleTabChange(value: string) {
    updateUrl({ status: value as TabValue })
  }

  function handleSortChange(field: SortField) {
    if (field === sortField) {
      const nextDir: SortDirection = sortDirection === "asc" ? "desc" : "asc"
      updateUrl({ sort: field, dir: nextDir })
    } else {
      updateUrl({ sort: field, dir: "desc" })
    }
  }

  // Status tabs are useful in Table view (narrow the rows). In Groups view
  // each section already shows its own count, and in Kanban the whole point
  // is seeing all three columns side-by-side — so the status filter would
  // hide entire columns. Tabs hide for those views; the URL ?status param
  // is preserved so switching back to Table restores the filter.
  const showStatusTabs = view === "table"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showStatusTabs ? (
          <Tabs value={initialStatus} onValueChange={handleTabChange}>
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {counts[tab.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : (
          <div aria-hidden="true" />
        )}

        <div className="flex items-center gap-3 sm:flex-row-reverse">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="pl-9"
              aria-label="Search customers"
            />
          </div>

          <ToggleGroup
            value={[view]}
            onValueChange={(arr) => {
              // Base UI's ToggleGroup always emits a string[] (it defaults
              // to single-select when `multiple` is false). Ignore an empty
              // array — the user toggled the active item off, but we want
              // exactly one view always selected.
              const next = arr[0]
              if (next && isView(next)) changeView(next)
            }}
            aria-label="View mode"
            className="shrink-0"
          >
            <ToggleGroupItem value="table" aria-label="Table view">
              <Rows3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Table</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="groups" aria-label="Groups view">
              <LayoutList className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Groups</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban view">
              <Columns3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Kanban</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {customers.length === 0 ? (
        <CustomerEmpty
          searched={initialSearch.length > 0 || initialStatus !== "all"}
        />
      ) : view === "groups" ? (
        <CustomerGroupsView
          customers={customers}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      ) : view === "kanban" ? (
        <KanbanStub />
      ) : (
        <CustomerTable
          customers={customers}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      )}
    </div>
  )
}

function CustomerEmpty({ searched }: { searched: boolean }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Users
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-medium">
            {searched ? "No customers match your filters" : "No customers yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searched
              ? "Try a different status or clear your search."
              : "Customer creation ships in Phase 6."}
          </p>
        </div>
        {!searched && (
          <Button type="button" disabled title="Coming in Phase 6">
            Add Customer
          </Button>
        )}
      </div>
    </div>
  )
}

// Kanban view — replaced with the real implementation in the next commit.
function KanbanStub() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
      Kanban view ships in the next commit.
    </div>
  )
}
