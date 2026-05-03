import { AddDealButton } from "@/components/deals/add-deal-button"
import type {
  DealSortField,
  SortDirection,
} from "@/components/deals/deal-table"
import { DealsList, type DealCounts } from "@/components/deals/deals-list"
import type { ContactOption } from "@/components/shared/contact-combobox"
import { listCompanies } from "@/lib/db/companies"
import { listContacts } from "@/lib/db/contacts"
import { listDeals, type DealStage } from "@/lib/db/deals"
import { createClient } from "@/lib/supabase/server"
import { DEAL_SOURCES } from "@/lib/validations/deal"

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

function parseSource(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return (DEAL_SOURCES as readonly string[]).includes(raw) ? raw : undefined
}

// Mirror /contacts: undefined = no filter, "" stays undefined, anything
// else is treated as a UUID. We don't surface "no company" as a separate
// state on /deals (would be redundant given the company-id selection UI).
function parseCompanyId(raw: string | undefined): string | null {
  return raw && raw.length > 0 ? raw : null
}

function parseStaleOnly(raw: string | undefined): boolean {
  return raw === "true"
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string
    search?: string
    source?: string
    company?: string
    sort?: string
    dir?: string
    stale?: string
  }>
}) {
  const params = await searchParams
  const stage = parseStage(params.stage)
  const search = params.search?.trim() || undefined
  const source = parseSource(params.source)
  const companyId = parseCompanyId(params.company)
  const sortField = parseSortField(params.sort)
  const sortDirection = parseSortDir(params.dir)
  const staleOnly = parseStaleOnly(params.stale)

  const supabase = await createClient()

  // The Add Deal dialog needs companies + contacts for its comboboxes.
  // Fetch alongside the main list so the page renders in one round-trip.
  const [filtered, companiesFull, contactsFull] = await Promise.all([
    listDeals(supabase, {
      stage,
      search,
      source,
      companyId: companyId ?? undefined,
      staleOnly: staleOnly || undefined,
    }),
    listCompanies(supabase),
    listContacts(supabase),
  ])

  // Counts are computed off an unfiltered set so the tab counters reflect
  // the full pipeline regardless of the active filter. When no filters are
  // active the unfiltered list IS the filtered list — skip the duplicate
  // round-trip.
  const all =
    stage || search || source || companyId || staleOnly
      ? await listDeals(supabase)
      : filtered

  const counts: DealCounts = {
    all: all.length,
    lead: all.filter((d) => d.stage === "lead").length,
    qualified: all.filter((d) => d.stage === "qualified").length,
    proposal: all.filter((d) => d.stage === "proposal").length,
    negotiation: all.filter((d) => d.stage === "negotiation").length,
    won: all.filter((d) => d.stage === "won").length,
    lost: all.filter((d) => d.stage === "lost").length,
  }

  const companies = companiesFull.map((c) => ({ id: c.id, name: c.name }))
  const contacts: ContactOption[] = contactsFull.map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    position: c.position,
    company_id: c.company_id,
    company_name: c.company?.name ?? null,
  }))

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deals across all stages.
          </p>
        </div>
        <AddDealButton companies={companies} contacts={contacts} />
      </header>

      <DealsList
        deals={filtered}
        counts={counts}
        initialStage={stage ?? "all"}
        initialSearch={search ?? ""}
        initialSource={source}
        initialCompanyId={companyId}
        initialStaleOnly={staleOnly}
        sortField={sortField}
        sortDirection={sortDirection}
        companies={companies}
        contacts={contacts}
      />
    </div>
  )
}
