"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  CheckCircle2,
  Columns3,
  LayoutDashboard,
  ListTodo,
  Plus,
  Users,
} from "lucide-react"

import { useCommandPalette } from "@/lib/hooks/use-command-palette"
import { createClient } from "@/lib/supabase/client"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { StageBadge, type DealStage } from "@/components/deals/stage-badge"

type DealHit = {
  id: string
  title: string
  stage: DealStage
  company_name: string | null
}
type ContactHit = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
}
type CompanyHit = {
  id: string
  name: string
  industry: string | null
}

type SearchResults = {
  deals: DealHit[]
  contacts: ContactHit[]
  companies: CompanyHit[]
}

const EMPTY_RESULTS: SearchResults = { deals: [], contacts: [], companies: [] }

// Per-entity result cap. Five gives "the relevant ones" without
// flooding the listbox; users refine the query if they need more.
const RESULT_LIMIT = 5

// Debounce so each keystroke doesn't spawn a query trio.
const SEARCH_DEBOUNCE_MS = 200

/**
 * Global Cmd+K palette. Mounted once at the app layout level so the
 * shortcut and topbar button work from every page.
 *
 * Three states by query:
 *   * empty query  → render only Aktionen + Navigation groups
 *   * with query   → run the parallel entity search and render hits
 *                    under Deals / Kontakte / Firmen headings (cmdk
 *                    filters Aktionen + Navigation client-side via
 *                    the standard fuzzy match)
 *
 * Searches run client-side via the Supabase browser client. RLS
 * scopes results to the signed-in user, so we don't need a server
 * action — a direct supabase-js call shaves the server round-trip and
 * the palette feels instant (~50-150ms at portfolio scale).
 */
export function CommandPalette() {
  const router = useRouter()
  const { open, setOpen, toggle } = useCommandPalette()

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [searching, setSearching] = useState(false)

  // Cmd+K (Mac) / Ctrl+K (Win/Linux) opens the palette. Skipped when
  // the focus is on a contentEditable surface so power users typing in
  // a rich-text field aren't interrupted (we don't ship one yet — this
  // is forward-friendly).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      const isModK =
        (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)
      if (!isModK) return
      const target = e.target as HTMLElement | null
      if (target?.isContentEditable) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [toggle])

  // Search effect — debounced. The empty-query reset and the
  // dialog-close reset both happen in callbacks (handleQueryChange /
  // handleOpenChange) rather than in this effect, because the React
  // 19 lint rule `react-hooks/set-state-in-effect` flags synchronous
  // setState inside an effect body. Async setState (inside the
  // setTimeout below) is fine since it happens on a later tick.
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length === 0) return

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    let cancelled = false
    searchTimerRef.current = setTimeout(async () => {
      const next = await runSearch(trimmed)
      if (cancelled) return
      setResults(next)
      setSearching(false)
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [query])

  function handleQueryChange(next: string): void {
    setQuery(next)
    if (next.trim().length === 0) {
      setResults(EMPTY_RESULTS)
      setSearching(false)
    } else {
      // Flip the spinner state synchronously so users see immediate
      // feedback even before the debounce fires.
      setSearching(true)
    }
  }

  function handleOpenChange(next: boolean): void {
    setOpen(next)
    if (!next) {
      setQuery("")
      setResults(EMPTY_RESULTS)
      setSearching(false)
    }
  }

  function go(href: string): void {
    setOpen(false)
    router.push(href)
  }

  const showResults = query.trim().length > 0
  const totalHits =
    results.deals.length + results.contacts.length + results.companies.length

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Befehlspalette"
      description="Suche nach Deals, Kontakten, Firmen — oder führe eine Aktion aus."
    >
      {/* The wrapped CommandDialog only handles dialog plumbing; we
          mount the cmdk Command primitive ourselves so the children
          live inside cmdk's context. cmdk's built-in fuzzy filter
          handles the Aktionen + Navigation rows; for entities we
          push the searchable text into each item's `value` prop so
          the same filter pass narrows them too. */}
      <Command>
        <CommandInput
          placeholder="Suchen oder Aktion ausführen…"
          value={query}
          onValueChange={handleQueryChange}
        />
        <CommandList>
        {showResults && totalHits === 0 && !searching && (
          <CommandEmpty>Keine Treffer.</CommandEmpty>
        )}

        {showResults && results.deals.length > 0 && (
          <CommandGroup heading="Deals">
            {results.deals.map((d) => (
              // value carries the searchable surface (title + company)
              // so cmdk's built-in filter doesn't hide a real hit while
              // matching against a UUID. Trailing id makes it unique.
              <CommandItem
                key={d.id}
                value={`${d.title} ${d.company_name ?? ""} deal-${d.id}`}
                onSelect={() => go(`/deals/${d.id}`)}
              >
                <Columns3 className="text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 truncate">{d.title}</span>
                {d.company_name && (
                  <span className="text-xs text-muted-foreground">
                    {d.company_name}
                  </span>
                )}
                <StageBadge
                  stage={d.stage}
                  className="ml-2 px-1.5 py-0 text-[10px]"
                />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && results.contacts.length > 0 && (
          <CommandGroup heading="Kontakte">
            {results.contacts.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ")
              return (
                <CommandItem
                  key={c.id}
                  value={`${name} ${c.email ?? ""} contact-${c.id}`}
                  onSelect={() => go(`/contacts/${c.id}`)}
                >
                  <Users className="text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 truncate">{name}</span>
                  {c.email && (
                    <span className="text-xs text-muted-foreground">
                      {c.email}
                    </span>
                  )}
                </CommandItem>
              )
            })}
          </CommandGroup>
        )}

        {showResults && results.companies.length > 0 && (
          <CommandGroup heading="Firmen">
            {results.companies.map((co) => (
              <CommandItem
                key={co.id}
                value={`${co.name} ${co.industry ?? ""} company-${co.id}`}
                onSelect={() => go(`/companies/${co.id}`)}
              >
                <Building2
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{co.name}</span>
                {co.industry && (
                  <span className="text-xs text-muted-foreground">
                    {co.industry}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && totalHits > 0 && <CommandSeparator />}

        <CommandGroup heading="Aktionen">
          <CommandItem
            value="action-add-deal"
            onSelect={() => go("/deals?new=true")}
            keywords={["neu", "deal", "anlegen", "erstellen"]}
          >
            <Plus aria-hidden="true" />
            Neuen Deal anlegen
          </CommandItem>
          <CommandItem
            value="action-add-contact"
            onSelect={() => go("/contacts?new=true")}
            keywords={["neu", "kontakt", "anlegen", "erstellen", "person"]}
          >
            <Plus aria-hidden="true" />
            Neuen Kontakt anlegen
          </CommandItem>
          <CommandItem
            value="action-add-company"
            onSelect={() => go("/companies?new=true")}
            keywords={["neu", "firma", "anlegen", "erstellen"]}
          >
            <Plus aria-hidden="true" />
            Neue Firma anlegen
          </CommandItem>
          <CommandItem
            value="action-add-task"
            onSelect={() => go("/tasks?new=true")}
            keywords={["neu", "aufgabe", "task", "anlegen", "erstellen"]}
          >
            <CheckCircle2 aria-hidden="true" />
            Neue Aufgabe anlegen
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigation">
          <CommandItem
            value="nav-dashboard"
            onSelect={() => go("/dashboard")}
            keywords={["start", "übersicht"]}
          >
            <LayoutDashboard aria-hidden="true" />
            Dashboard
          </CommandItem>
          <CommandItem
            value="nav-pipeline"
            onSelect={() => go("/deals")}
            keywords={["deals", "pipeline"]}
          >
            <Columns3 aria-hidden="true" />
            Pipeline
          </CommandItem>
          <CommandItem
            value="nav-tasks"
            onSelect={() => go("/tasks")}
            keywords={["aufgaben", "tasks", "todo"]}
          >
            <ListTodo aria-hidden="true" />
            Aufgaben
          </CommandItem>
          <CommandItem
            value="nav-companies"
            onSelect={() => go("/companies")}
            keywords={["firmen", "companies", "unternehmen"]}
          >
            <Building2 aria-hidden="true" />
            Firmen
          </CommandItem>
          <CommandItem
            value="nav-contacts"
            onSelect={() => go("/contacts")}
            keywords={["kontakte", "contacts", "personen", "people"]}
          >
            <Users aria-hidden="true" />
            Kontakte
          </CommandItem>
        </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/**
 * Parallel-fetch up to RESULT_LIMIT hits from each entity table. RLS
 * scopes to the signed-in user so we don't need to filter user_id
 * here — same convention as the existing list helpers in lib/db.
 *
 * Contact search is multi-field (first/last name + email) via PostgREST
 * `.or()`. Company industry isn't searched because it's a low-cardinality
 * label — name carries all the signal worth typing. Deal source is
 * similar; only title is searched there.
 */
async function runSearch(query: string): Promise<SearchResults> {
  const supabase = createClient()
  const term = `%${escapeIlike(query)}%`

  const [dealsRes, contactsRes, companiesRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, stage, company:companies(name)")
      .ilike("title", term)
      .limit(RESULT_LIMIT),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, email")
      .or(
        `first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term}`
      )
      .limit(RESULT_LIMIT),
    supabase
      .from("companies")
      .select("id, name, industry")
      .ilike("name", term)
      .limit(RESULT_LIMIT),
  ])

  type DealsRow = {
    id: string
    title: string
    stage: string
    company: { name: string } | null
  }

  return {
    deals: ((dealsRes.data ?? []) as DealsRow[]).map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage as DealStage,
      company_name: d.company?.name ?? null,
    })),
    contacts: contactsRes.data ?? [],
    companies: companiesRes.data ?? [],
  }
}

// Escape PostgREST ilike wildcards so a user typing "50%" finds rows
// with literal "50%" rather than "anything containing 50". Same logic
// as lib/db/_utils.ts but inlined here to avoid pulling a server-only
// module into the client bundle.
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`)
}
