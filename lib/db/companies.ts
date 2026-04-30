import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { escapeIlike } from "@/lib/db/_utils"

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
  input: CompanyInsert
): Promise<Company> {
  const { data, error } = await client
    .from("companies")
    .insert(input)
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
