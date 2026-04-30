import { Plus } from "lucide-react"

import { DealsList, type DealCounts } from "@/components/deals/deals-list"
import type {
  DealSortField,
  SortDirection,
} from "@/components/deals/deal-table"
import { Button } from "@/components/ui/button"
import { listDeals, type DealStage } from "@/lib/db/deals"
import { createClient } from "@/lib/supabase/server"

const VALID_STAGES: readonly DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]
const VALID_SORT_FIELDS: readonly DealSortField[] = [
  "title",
  "stage",
  "value_eur",
  "expected_close_date",
  "updated_at",
]
const VALID_SORT_DIRS: readonly SortDirection[] = ["asc", "desc"]

function parseStage(raw: string | undefined): DealStage | undefined {
  if (raw && VALID_STAGES.includes(raw as DealStage)) {
    return raw as DealStage
  }
  return undefined
}

function parseSortField(raw: string | undefined): DealSortField {
  return raw && VALID_SORT_FIELDS.includes(raw as DealSortField)
    ? (raw as DealSortField)
    : "stage"
}

function parseSortDir(raw: string | undefined): SortDirection {
  return raw && VALID_SORT_DIRS.includes(raw as SortDirection)
    ? (raw as SortDirection)
    : "asc"
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string
    search?: string
    sort?: string
    dir?: string
  }>
}) {
  const params = await searchParams
  const stage = parseStage(params.stage)
  const search = params.search?.trim() || undefined
  const sortField = parseSortField(params.sort)
  const sortDirection = parseSortDir(params.dir)

  const supabase = await createClient()

  const filtered = await listDeals(supabase, { stage, search })
  // Counts are computed off an unfiltered set so the tab counters reflect
  // the full pipeline regardless of the active filter. When no filters are
  // active the unfiltered list IS the filtered list — skip the duplicate
  // round-trip.
  const all = stage || search ? await listDeals(supabase) : filtered

  const counts: DealCounts = {
    all: all.length,
    lead: all.filter((d) => d.stage === "lead").length,
    qualified: all.filter((d) => d.stage === "qualified").length,
    proposal: all.filter((d) => d.stage === "proposal").length,
    negotiation: all.filter((d) => d.stage === "negotiation").length,
    won: all.filter((d) => d.stage === "won").length,
    lost: all.filter((d) => d.stage === "lost").length,
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deals across all stages.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled
          title="Add Deal UI coming in Phase 21"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add deal
        </Button>
      </header>

      <DealsList
        deals={filtered}
        counts={counts}
        initialStage={stage ?? "all"}
        initialSearch={search ?? ""}
        sortField={sortField}
        sortDirection={sortDirection}
      />
    </div>
  )
}
