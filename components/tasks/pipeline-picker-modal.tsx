"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import type { DealOption } from "@/components/shared/deal-combobox"
import { STAGE_CONFIG, STAGE_ORDER, StageBadge } from "@/components/deals/stage-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
})

type Filter = "all" | "active" | "closed"
const ACTIVE_STAGES = new Set(["lead", "qualified", "proposal", "negotiation"])
const CLOSED_STAGES = new Set(["won", "lost"])

// Pipeline-picker-specific shape: a deal option plus an optional value
// for the visual card. The combobox's DealOption doesn't carry value_eur
// (it's not relevant in the listbox row), so we extend it here.
export type PipelineDealOption = DealOption & {
  valueEur: number | null
}

export function PipelinePickerModal({
  open,
  onOpenChange,
  onSelect,
  deals,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (dealId: string) => void
  deals: PipelineDealOption[]
}) {
  const [search, setSearch] = useState("")
  // Active by default — most users opening this modal want their open
  // pipeline, not the closed history. ToggleGroup is multi-select by
  // default in base-nova; we read arr[0] for single-select.
  const [filter, setFilter] = useState<Filter>("active")

  // Filter + group in a single pass. Memo so retyping the search box
  // doesn't re-walk the deals array on every keystroke from sibling
  // re-renders (the input itself is uncontrolled-ish via `value`).
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matchesSearch = (d: PipelineDealOption) => {
      if (!q) return true
      return (
        d.title.toLowerCase().includes(q) ||
        (d.companyName?.toLowerCase().includes(q) ?? false) ||
        (d.primaryContactName?.toLowerCase().includes(q) ?? false)
      )
    }
    const matchesFilter = (d: PipelineDealOption) => {
      if (filter === "all") return true
      if (filter === "active") return ACTIVE_STAGES.has(d.stage)
      return CLOSED_STAGES.has(d.stage)
    }

    const buckets: Record<string, PipelineDealOption[]> = {}
    for (const stage of STAGE_ORDER) buckets[stage] = []
    for (const deal of deals) {
      if (!matchesSearch(deal) || !matchesFilter(deal)) continue
      buckets[deal.stage].push(deal)
    }
    return buckets
  }, [deals, search, filter])

  // Which stage columns to render. When the filter is "active" we hide
  // the won/lost columns entirely so the layout stays tight; "closed"
  // hides the four open stages.
  const visibleStages = STAGE_ORDER.filter((stage) => {
    if (filter === "active") return ACTIVE_STAGES.has(stage)
    if (filter === "closed") return CLOSED_STAGES.has(stage)
    return true
  })

  function handleFilterChange(arr: string[]): void {
    const next = (arr[0] as Filter | undefined) ?? filter
    setFilter(next)
  }

  function handleSelect(dealId: string): void {
    onSelect(dealId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Deal auswählen</DialogTitle>
          <DialogDescription>
            Wähle einen Deal aus der Pipeline. Klicke auf eine Karte, um
            die Aufgabe daran zu hängen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Deal, Firma oder Kontakt suchen…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ToggleGroup
            value={[filter]}
            onValueChange={handleFilterChange}
            className="self-start sm:self-auto"
          >
            <ToggleGroupItem value="active">Aktiv</ToggleGroupItem>
            <ToggleGroupItem value="closed">Geschlossen</ToggleGroupItem>
            <ToggleGroupItem value="all">Alle</ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Scrollable body — at narrow widths the grid collapses to one
            column (stage-by-stage stack), at sm+ each visible stage gets
            its own column. The container scrolls vertically; cards never
            scroll horizontally. */}
        <div className="flex-1 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
          <div
            className={cn(
              "grid gap-3",
              visibleStages.length === 1
                ? "grid-cols-1"
                : visibleStages.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            )}
          >
            {visibleStages.map((stage) => {
              const stageDeals = grouped[stage] ?? []
              return (
                <section
                  key={stage}
                  aria-labelledby={`pp-stage-${stage}`}
                  className="flex min-w-0 flex-col gap-2"
                >
                  <header className="flex items-center justify-between gap-2 px-1">
                    <h4
                      id={`pp-stage-${stage}`}
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {STAGE_CONFIG[stage].label}
                    </h4>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {stageDeals.length}
                    </span>
                  </header>
                  {stageDeals.length === 0 ? (
                    <p className="rounded-md border border-dashed border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
                      Keine Deals
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {stageDeals.map((deal) => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onSelect={() => handleSelect(deal.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DealCard({
  deal,
  onSelect,
}: {
  deal: PipelineDealOption
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full cursor-pointer flex-col gap-1.5 rounded-md border border-border bg-card p-3 text-left transition-colors",
        "hover:border-foreground/20 hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{deal.title}</p>
        <StageBadge
          stage={deal.stage}
          className="shrink-0 px-1.5 py-0 text-[10px]"
        />
      </div>
      {(deal.companyName || deal.primaryContactName) && (
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {[deal.companyName, deal.primaryContactName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {deal.valueEur !== null && (
        <p className="text-xs tabular-nums text-muted-foreground">
          {eurFormatter.format(deal.valueEur)}
        </p>
      )}
    </button>
  )
}
