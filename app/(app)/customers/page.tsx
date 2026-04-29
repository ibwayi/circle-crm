import { AddCustomerButton } from "@/components/customers/add-customer-button"
import { CustomerList } from "@/components/customers/customer-list"
import type {
  SortDirection,
  SortField,
} from "@/components/customers/customer-table"
import { listCustomers, type CustomerStatus } from "@/lib/db/customers"
import { createClient } from "@/lib/supabase/server"

const VALID_STATUSES: readonly CustomerStatus[] = ["lead", "customer", "closed"]
const VALID_SORT_FIELDS: readonly SortField[] = [
  "name",
  "value_eur",
  "updated_at",
]
const VALID_SORT_DIRS: readonly SortDirection[] = ["asc", "desc"]

function parseStatus(raw: string | undefined): CustomerStatus | undefined {
  if (raw && VALID_STATUSES.includes(raw as CustomerStatus)) {
    return raw as CustomerStatus
  }
  return undefined
}

function parseSortField(raw: string | undefined): SortField {
  return raw && VALID_SORT_FIELDS.includes(raw as SortField)
    ? (raw as SortField)
    : "updated_at"
}

function parseSortDir(raw: string | undefined): SortDirection {
  return raw && VALID_SORT_DIRS.includes(raw as SortDirection)
    ? (raw as SortDirection)
    : "desc"
}

export default async function CustomersPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise — must await before access.
  searchParams: Promise<{
    status?: string
    search?: string
    sort?: string
    dir?: string
  }>
}) {
  const params = await searchParams
  const status = parseStatus(params.status)
  const search = params.search?.trim() || undefined
  const sortField = parseSortField(params.sort)
  const sortDirection = parseSortDir(params.dir)

  const supabase = await createClient()

  const filtered = await listCustomers(supabase, { status, search })

  // Counts are unfiltered. When no filters are active the unfiltered list IS
  // the filtered list, so the second query is skipped.
  const all = status || search ? await listCustomers(supabase) : filtered

  const counts = {
    all: all.length,
    lead: all.filter((c) => c.status === "lead").length,
    customer: all.filter((c) => c.status === "customer").length,
    closed: all.filter((c) => c.status === "closed").length,
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Customers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your pipeline.
          </p>
        </div>
        <AddCustomerButton />
      </header>

      <CustomerList
        customers={filtered}
        counts={counts}
        initialStatus={status ?? "all"}
        initialSearch={search ?? ""}
        sortField={sortField}
        sortDirection={sortDirection}
      />
    </div>
  )
}
