import { Building2 } from "lucide-react"

import { AddCompanyButton } from "@/components/companies/add-company-button"
import { CompaniesSearch } from "@/components/companies/companies-search"
import { CompanyList } from "@/components/companies/company-list"
import { SavedViews } from "@/components/shared/saved-views"
import { listCompaniesWithCounts } from "@/lib/db/companies"
import { listSavedViews } from "@/lib/db/saved-views"
import { createClient } from "@/lib/supabase/server"

export default async function CompaniesPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise — must await.
  searchParams: Promise<{ search?: string }>
}) {
  const params = await searchParams
  const search = params.search?.trim() || undefined
  // Cmd+K's `?new=true` is consumed client-side by AddCompanyButton
  // via useAutoOpenFromQuery.

  const supabase = await createClient()
  const [companies, savedViews] = await Promise.all([
    listCompaniesWithCounts(supabase, { search }),
    listSavedViews(supabase, "companies"),
  ])

  const isFiltered = Boolean(search)
  const showWelcome = companies.length === 0 && !isFiltered
  const showNoResults = companies.length === 0 && isFiltered

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Companies</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organisations you&apos;re working with.
          </p>
        </div>
        <AddCompanyButton />
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <CompaniesSearch initialValue={search ?? ""} />
        <div className="ml-auto">
          <SavedViews entity="companies" views={savedViews} />
        </div>
      </div>

      {showWelcome ? (
        <CompanyEmptyWelcome />
      ) : showNoResults ? (
        <CompanyEmptyNoResults query={search ?? ""} />
      ) : (
        <CompanyList companies={companies} />
      )}
    </div>
  )
}

function CompanyEmptyWelcome() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Building2
            className="h-5 w-5 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-sm font-medium">No companies yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first company to start linking contacts and deals.
          </p>
        </div>
        <AddCompanyButton />
      </div>
    </div>
  )
}

function CompanyEmptyNoResults({ query }: { query: string }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium">
          No companies match &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-muted-foreground">
          Try a different search term.
        </p>
      </div>
    </div>
  )
}
