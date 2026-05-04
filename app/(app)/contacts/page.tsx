import { Users } from "lucide-react"

import { AddContactButton } from "@/components/contacts/add-contact-button"
import { CompanyFilter } from "@/components/contacts/company-filter"
import { ContactsSearch } from "@/components/contacts/contacts-search"
import { ContactList } from "@/components/contacts/contact-list"
import { SavedViews } from "@/components/shared/saved-views"
import { listCompanies } from "@/lib/db/companies"
import { listContactsWithCounts } from "@/lib/db/contacts"
import { listSavedViews } from "@/lib/db/saved-views"
import { createClient } from "@/lib/supabase/server"

// Tri-state company filter:
//   undefined → no filter (all contacts)
//   "null"    → contacts with NO company (parsed to: companyId = null)
//   <uuid>    → contacts at that company
function parseCompanyParam(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined
  if (raw === "null") return null
  return raw
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; company?: string }>
}) {
  const params = await searchParams
  const search = params.search?.trim() || undefined
  const companyId = parseCompanyParam(params.company)
  // Cmd+K's `?new=true` is consumed client-side by AddContactButton
  // via useAutoOpenFromQuery.

  const supabase = await createClient()

  // Fetch companies once for the filter dropdown + the Add dialog combobox
  // — children get them via prop drilling rather than re-fetching.
  const [contacts, companiesFull, savedViews] = await Promise.all([
    listContactsWithCounts(supabase, { search, companyId }),
    listCompanies(supabase),
    listSavedViews(supabase, "contacts"),
  ])
  const companies = companiesFull.map((c) => ({ id: c.id, name: c.name }))

  const isFiltered = search !== undefined || companyId !== undefined
  const showWelcome = contacts.length === 0 && !isFiltered
  const showNoResults = contacts.length === 0 && isFiltered

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Contacts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People you&apos;re working with.
          </p>
        </div>
        <AddContactButton companies={companies} />
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <ContactsSearch initialValue={search ?? ""} />
        <CompanyFilter initialValue={companyId} companies={companies} />
        <div className="ml-auto">
          <SavedViews entity="contacts" views={savedViews} />
        </div>
      </div>

      {showWelcome ? (
        <ContactEmptyWelcome companies={companies} />
      ) : showNoResults ? (
        <ContactEmptyNoResults />
      ) : (
        <ContactList contacts={contacts} />
      )}
    </div>
  )
}

function ContactEmptyWelcome({
  companies,
}: {
  companies: { id: string; name: string }[]
}) {
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
          <p className="text-sm font-medium">No contacts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the people you&apos;re working with — they can be linked to
            a company or stand alone.
          </p>
        </div>
        <AddContactButton companies={companies} />
      </div>
    </div>
  )
}

function ContactEmptyNoResults() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center rounded-lg border border-dashed border-border bg-card">
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="text-sm font-medium">No contacts match these filters</p>
        <p className="text-sm text-muted-foreground">
          Try a different search term or clear the company filter.
        </p>
      </div>
    </div>
  )
}
