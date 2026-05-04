import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { escapeIlike } from "@/lib/db/_utils"
import { getPrimaryWorkspaceId } from "@/lib/db/workspaces"

type Client = SupabaseClient<Database>

export type Company = Database["public"]["Tables"]["companies"]["Row"]
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"]
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"]

type Contact = Database["public"]["Tables"]["contacts"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

export type CompanyWithRelations = {
  company: Company
  contacts: Contact[]
  deals: Deal[]
}

// List-view shape: a Company row plus the two counts the table renders
// (linked contacts and active deals). Active = stage NOT IN ('won','lost').
export type CompanyWithCounts = Company & {
  contact_count: number
  active_deal_count: number
}

export async function listCompanies(
  client: Client,
  opts?: { search?: string }
): Promise<Company[]> {
  let query = client.from("companies").select("*")

  if (opts?.search && opts.search.trim().length > 0) {
    const term = escapeIlike(opts.search.trim())
    query = query.ilike("name", `%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error
  // Sort case-insensitively in JS so diacritics + lower/upper collate
  // correctly. At portfolio scale this is cheap; if the row count grows
  // we'd switch to a Postgres `lower(name)` expression index + ORDER BY
  // server-side.
  return [...data].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
}

export async function listCompaniesWithCounts(
  client: Client,
  opts?: { search?: string }
): Promise<CompanyWithCounts[]> {
  // Two-step: first fetch companies (and apply search/sort), then batch-
  // fetch contact + deal rows scoped to those company ids and tally them
  // in JS. This is two extra round-trips over plain listCompanies, but
  // it avoids N+1 — and at portfolio scale (≤ a couple hundred companies
  // per user) it's cheaper than equivalent count() subqueries.
  const companies = await listCompanies(client, opts)
  if (companies.length === 0) return []

  const companyIds = companies.map((c) => c.id)

  const [contactsRes, dealsRes] = await Promise.all([
    client.from("contacts").select("company_id").in("company_id", companyIds),
    client
      .from("deals")
      .select("company_id, stage")
      .in("company_id", companyIds),
  ])

  if (contactsRes.error) throw contactsRes.error
  if (dealsRes.error) throw dealsRes.error

  const contactCounts = new Map<string, number>()
  for (const row of contactsRes.data ?? []) {
    if (row.company_id) {
      contactCounts.set(
        row.company_id,
        (contactCounts.get(row.company_id) ?? 0) + 1
      )
    }
  }

  const activeDealCounts = new Map<string, number>()
  for (const row of dealsRes.data ?? []) {
    if (
      row.company_id &&
      row.stage !== "won" &&
      row.stage !== "lost"
    ) {
      activeDealCounts.set(
        row.company_id,
        (activeDealCounts.get(row.company_id) ?? 0) + 1
      )
    }
  }

  return companies.map((c) => ({
    ...c,
    contact_count: contactCounts.get(c.id) ?? 0,
    active_deal_count: activeDealCounts.get(c.id) ?? 0,
  }))
}

export async function getCompany(
  client: Client,
  id: string
): Promise<CompanyWithRelations | null> {
  // Three queries in parallel. If the company doesn't exist the contact
  // and deal queries return empty arrays under RLS — no leak.
  const [companyResult, contactsResult, dealsResult] = await Promise.all([
    client.from("companies").select("*").eq("id", id).maybeSingle(),
    client.from("contacts").select("*").eq("company_id", id),
    client
      .from("deals")
      .select("*")
      .eq("company_id", id)
      .order("created_at", { ascending: false }),
  ])

  if (companyResult.error) throw companyResult.error
  if (!companyResult.data) return null
  if (contactsResult.error) throw contactsResult.error
  if (dealsResult.error) throw dealsResult.error

  // Sort: NULLS FIRST on last_name (mononyms float), then last_name,
  // then first_name. Case-insensitive for proper Unicode collation.
  const contacts = [...(contactsResult.data ?? [])].sort((a, b) => {
    const aLast = a.last_name
    const bLast = b.last_name
    if (aLast === null && bLast !== null) return -1
    if (aLast !== null && bLast === null) return 1
    if (aLast !== null && bLast !== null) {
      const cmp = aLast.localeCompare(bLast, undefined, {
        sensitivity: "base",
      })
      if (cmp !== 0) return cmp
    }
    return a.first_name.localeCompare(b.first_name, undefined, {
      sensitivity: "base",
    })
  })

  return {
    company: companyResult.data,
    contacts,
    deals: dealsResult.data ?? [],
  }
}

export async function createCompany(
  client: Client,
  input: Omit<CompanyInsert, "workspace_id"> & { workspace_id?: string }
): Promise<Company> {
  // Phase 31: workspace_id is NOT NULL on the table. Callers (server
  // actions) typically don't know the active workspace yet — Phase 32
  // wires that explicitly via getActiveWorkspaceId. Until then, the
  // helper falls back to the user's primary workspace.
  const workspace_id =
    input.workspace_id ?? (await getPrimaryWorkspaceId(client))
  const { data, error } = await client
    .from("companies")
    .insert({ ...input, workspace_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCompany(
  client: Client,
  id: string,
  input: CompanyUpdate
): Promise<Company> {
  // user_id is in the Update shape but RLS's WITH CHECK rejects any
  // change that flips it to a different user — we don't filter at the
  // app layer.
  const { data, error } = await client
    .from("companies")
    .update(input)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCompany(client: Client, id: string): Promise<void> {
  // ON DELETE SET NULL on contacts.company_id and deals.company_id —
  // children survive as company-less, no cascade-delete.
  const { error } = await client.from("companies").delete().eq("id", id)
  if (error) throw error
}
