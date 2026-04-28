"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Search, Users } from "lucide-react"

import { CustomerTable } from "@/components/customers/customer-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Customer, CustomerStatus } from "@/lib/db/customers"

type TabValue = "all" | CustomerStatus

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

// Inline debounce — no library needed. The ref pattern keeps the returned
// callback stable across renders so we don't re-arm a new timeout on every
// keystroke.
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
}: {
  customers: Customer[]
  counts: Counts
  initialStatus: TabValue
  initialSearch: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(initialSearch)

  const updateUrl = useCallback(
    (next: { status?: TabValue; search?: string }) => {
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="relative w-full sm:max-w-xs">
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
      </div>

      {customers.length === 0 ? (
        <CustomerEmpty searched={initialSearch.length > 0 || initialStatus !== "all"} />
      ) : (
        <CustomerTable customers={customers} />
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
