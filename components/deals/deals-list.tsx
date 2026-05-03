"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Columns3, LayoutList, Rows3, Search, TrendingUp } from "lucide-react"

import { AddDealButton } from "@/components/deals/add-deal-button"
import { DealGroupsView } from "@/components/deals/deal-groups-view"
import { DealKanban } from "@/components/deals/deal-kanban"
import {
  DealTable,
  type DealSortField,
  type SortDirection,
} from "@/components/deals/deal-table"
import { CompanyCombobox } from "@/components/shared/company-combobox"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Toggle } from "@/components/ui/toggle"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { DealStage, DealWithRelations } from "@/lib/db/deals"
import { DEAL_SOURCES } from "@/lib/validations/deal"
import { AlertCircle } from "lucide-react"

type TabValue = "all" | DealStage
type View = "table" | "groups" | "kanban"

export type DealCounts = {
  all: number
  lead: number
  qualified: number
  proposal: number
  negotiation: number
  won: number
  lost: number
}

const TABS: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "lead", label: "Lead" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

const VIEW_STORAGE_KEY = "circle:deals-view"
const VIEW_STORAGE_EVENT = "circle:deals-view-change"
const SSR_VIEW: View = "table"

function isView(v: string): v is View {
  return v === "table" || v === "groups" || v === "kanban"
}

let cachedViewRaw: string | null | undefined = undefined
let cachedView: View = SSR_VIEW

function readView(): View {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(VIEW_STORAGE_KEY)
  } catch {
    raw = null
  }
  if (raw === cachedViewRaw) return cachedView
  cachedViewRaw = raw
  cachedView = raw && isView(raw) ? raw : SSR_VIEW
  return cachedView
}

function subscribeView(callback: () => void): () => void {
  window.addEventListener("storage", callback)
  window.addEventListener(VIEW_STORAGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(VIEW_STORAGE_EVENT, callback)
  }
}

function getServerView(): View {
  return SSR_VIEW
}

function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number
): (...args: Args) => void {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

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

// Sentinel for the "Alle Quellen / Alle Firmen" default in the filter
// dropdowns. Base UI's Select disallows an empty string item value.
const FILTER_ALL = "__all__"

export function DealsList({
  deals,
  counts,
  initialStage,
  initialSearch,
  initialSource,
  initialCompanyId,
  initialStaleOnly,
  sortField,
  sortDirection,
  companies,
  contacts,
}: {
  deals: DealWithRelations[]
  counts: DealCounts
  initialStage: TabValue
  initialSearch: string
  initialSource: string | undefined
  initialCompanyId: string | null
  initialStaleOnly: boolean
  sortField: DealSortField
  sortDirection: SortDirection
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchInput, setSearchInput] = useState(initialSearch)

  const view = useSyncExternalStore(subscribeView, readView, getServerView)

  const changeView = useCallback((next: View) => {
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next)
      window.dispatchEvent(new Event(VIEW_STORAGE_EVENT))
    } catch {
      // Ignore quota errors.
    }
  }, [])

  const updateUrl = useCallback(
    (next: {
      stage?: TabValue
      search?: string
      source?: string | null // null means "drop the filter"
      companyId?: string | null // null means "drop the filter"
      sort?: DealSortField
      dir?: SortDirection
      staleOnly?: boolean
    }) => {
      const params = new URLSearchParams(searchParams.toString())

      if (next.stage !== undefined) {
        if (next.stage === "all") {
          params.delete("stage")
        } else {
          params.set("stage", next.stage)
        }
      }

      if (next.search !== undefined) {
        if (next.search.trim()) {
          params.set("search", next.search)
        } else {
          params.delete("search")
        }
      }

      if (next.source !== undefined) {
        if (next.source === null) {
          params.delete("source")
        } else {
          params.set("source", next.source)
        }
      }

      if (next.companyId !== undefined) {
        if (next.companyId === null) {
          params.delete("company")
        } else {
          params.set("company", next.companyId)
        }
      }

      if (next.sort !== undefined && next.dir !== undefined) {
        // Default sort: stage ASC, then created_at DESC. We persist a
        // sort param only when the user has overridden the default.
        if (next.sort === "stage" && next.dir === "asc") {
          params.delete("sort")
          params.delete("dir")
        } else {
          params.set("sort", next.sort)
          params.set("dir", next.dir)
        }
      }

      if (next.staleOnly !== undefined) {
        if (next.staleOnly) {
          params.set("stale", "true")
        } else {
          params.delete("stale")
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
    updateUrl({ stage: value as TabValue })
  }

  function handleSortChange(field: DealSortField) {
    if (field === sortField) {
      const nextDir: SortDirection = sortDirection === "asc" ? "desc" : "asc"
      updateUrl({ sort: field, dir: nextDir })
    } else {
      updateUrl({ sort: field, dir: "desc" })
    }
  }

  function handleClearFilters() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("stage")
    params.delete("search")
    params.delete("source")
    params.delete("company")
    params.delete("stale")
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    setSearchInput("")
  }

  function handleSourceChange(next: string | null) {
    if (next === null || next === FILTER_ALL) {
      updateUrl({ source: null })
    } else {
      updateUrl({ source: next })
    }
  }

  function handleCompanyChange(next: string | null) {
    updateUrl({ companyId: next })
  }

  function handleStaleToggle(pressed: boolean) {
    updateUrl({ staleOnly: pressed })
  }

  // Stage tabs make sense in Table view (narrow the rows). In Groups and
  // Kanban every stage already has its own column or section, so a single-
  // stage filter would just hide the rest of the pipeline. We hide tabs in
  // those views; the URL ?stage param is preserved so swapping back to
  // Table restores the filter.
  const showStageTabs = view === "table"

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {showStageTabs ? (
          <Tabs value={initialStage} onValueChange={handleTabChange}>
            <TabsList className="flex-wrap">
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
              placeholder="Search by title…"
              className="pl-9"
              aria-label="Search deals"
            />
          </div>

          <ToggleGroup
            value={[view]}
            onValueChange={(arr) => {
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

      {/* Filter row: source + company. Wraps below the toolbar on
          narrow viewports. Both filters preserve the URL state pattern
          and survive view switches. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={initialSource ?? FILTER_ALL}
          onValueChange={handleSourceChange}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Alle Quellen">
              {(v: string | null) => {
                if (v === null || v === FILTER_ALL) return "Alle Quellen"
                return v
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>Alle Quellen</SelectItem>
            {DEAL_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-full sm:w-[260px]">
          <CompanyCombobox
            value={initialCompanyId}
            onChange={handleCompanyChange}
            companies={companies}
            placeholder="Alle Firmen"
            noneLabel="Alle Firmen"
          />
        </div>

        {/* Stale toggle. Single Toggle (not a 2-state ToggleGroup) — the
            label is descriptive enough that an active/inactive state is
            obvious; ToggleGroup would imply mutual exclusion with
            something else. Pressed state is signalled via the base
            UI's data-pressed → bg-muted treatment baked into the
            Toggle variants. */}
        <Toggle
          pressed={initialStaleOnly}
          onPressedChange={handleStaleToggle}
          variant="outline"
          aria-label="Nur vernachlässigte Deals anzeigen"
          className="self-start sm:self-auto"
        >
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <span>Nur vernachlässigt</span>
        </Toggle>
      </div>

      {deals.length === 0 ? (
        <DealsEmpty
          searched={initialSearch.length > 0 || initialStage !== "all"}
          onClearFilters={handleClearFilters}
          companies={companies}
          contacts={contacts}
        />
      ) : view === "groups" ? (
        <DealGroupsView
          deals={deals}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      ) : view === "kanban" ? (
        <DealKanban deals={deals} />
      ) : (
        <DealTable
          deals={deals}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />
      )}
    </div>
  )
}

function DealsEmpty({
  searched,
  onClearFilters,
  companies,
  contacts,
}: {
  searched: boolean
  onClearFilters: () => void
  companies: { id: string; name: string }[]
  contacts: ContactOption[]
}) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <TrendingUp
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-medium">
            {searched ? "No deals match these filters" : "Build your pipeline"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {searched
              ? "Try a different stage or clear your search."
              : "Add your first deal to start tracking opportunities."}
          </p>
        </div>
        {searched ? (
          <Button type="button" variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <AddDealButton companies={companies} contacts={contacts} />
        )}
      </div>
    </div>
  )
}
