import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Contact = Database["public"]["Tables"]["contacts"]["Row"]
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"]
export type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"]

type Company = Database["public"]["Tables"]["companies"]["Row"]
type Deal = Database["public"]["Tables"]["deals"]["Row"]

// List view shape: contact rows joined with the related company's id+name
// so the table can render "Sarah Hoffmann · Bytewise GmbH" without a
// second round-trip.
export type ContactWithCompanySummary = Contact & {
  company: { id: string; name: string } | null
}

// Detail view shape: full contact + full company (or null) + deals it's
// involved in (with the junction's is_primary flag surfaced).
export type DealWithPrimaryFlag = Deal & { is_primary: boolean }

export type ContactWithRelations = {
  contact: Contact
  company: Company | null
  deals: DealWithPrimaryFlag[]
}

// Escape ilike wildcards so user input can't broaden the search.
function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`)
}

// Stable, case-insensitive contact ordering: NULLS FIRST on last_name
// (mononym contacts float to the top), then last_name, then first_name.
function compareContactsByName(a: Contact, b: Contact): number {
  const aLast = a.last_name
  const bLast = b.last_name
  if (aLast === null && bLast !== null) return -1
  if (aLast !== null && bLast === null) return 1
  if (aLast !== null && bLast !== null) {
    const cmp = aLast.localeCompare(bLast, undefined, { sensitivity: "base" })
    if (cmp !== 0) return cmp
  }
  return a.first_name.localeCompare(b.first_name, undefined, {
    sensitivity: "base",
  })
}

export async function listContacts(
  client: Client,
  opts?: { search?: string; companyId?: string | null }
): Promise<ContactWithCompanySummary[]> {
  // The select string asks Supabase to join the related company's id+name
  // through the contacts.company_id FK. supabase-js infers the relationship
  // from the generated types' Relationships array; the FK is unambiguous
  // (only one path from contacts to companies).
  let query = client
    .from("contacts")
    .select("*, company:companies(id, name)")

  // Three-state companyId filter:
  //   undefined → no filter
  //   null      → only contacts with no company
  //   string    → contacts at that company
  if (opts?.companyId === null) {
    query = query.is("company_id", null)
  } else if (typeof opts?.companyId === "string") {
    query = query.eq("company_id", opts.companyId)
  }

  if (opts?.search && opts.search.trim().length > 0) {
    const term = escapeIlike(opts.search.trim())
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,position.ilike.%${term}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as ContactWithCompanySummary[]
  return [...rows].sort(compareContactsByName)
}

export async function getContact(
  client: Client,
  id: string
): Promise<ContactWithRelations | null> {
  const { data: contact, error: contactError } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (contactError) throw contactError
  if (!contact) return null

  // Company + deals fetched in parallel. Async IIFEs because supabase-js
  // builders are PromiseLike, not Promise — TS won't slot them into a
  // Promise<T>-typed Promise.all without an extra await.
  const companyPromise = (async (): Promise<Company | null> => {
    if (contact.company_id === null) return null
    const res = await client
      .from("companies")
      .select("*")
      .eq("id", contact.company_id)
      .maybeSingle()
    if (res.error) throw res.error
    return res.data
  })()

  // Deals via the deal_contacts junction. The select pulls is_primary
  // from the junction and the full deal row from the FK relationship.
  const dealsPromise = (async () => {
    const res = await client
      .from("deal_contacts")
      .select("is_primary, deal:deals(*)")
      .eq("contact_id", id)
    if (res.error) throw res.error
    return res.data ?? []
  })()

  const [company, junctionRows] = await Promise.all([
    companyPromise,
    dealsPromise,
  ])

  // Flatten junction rows into Deal & { is_primary } objects. flatMap
  // drops any rows where the nested deal is null (defensive — RLS + FK
  // make this unreachable in practice).
  const deals: DealWithPrimaryFlag[] = junctionRows.flatMap((row) => {
    const deal = row.deal as Deal | null
    if (!deal) return []
    return [{ ...deal, is_primary: row.is_primary }]
  })

  // Most-recent first; same convention as getCompany.
  deals.sort((a, b) => b.created_at.localeCompare(a.created_at))

  return { contact, company, deals }
}

export async function createContact(
  client: Client,
  input: ContactInsert
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateContact(
  client: Client,
  id: string,
  input: ContactUpdate
): Promise<Contact> {
  const { data, error } = await client
    .from("contacts")
    .update(input)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteContact(client: Client, id: string): Promise<void> {
  // deal_contacts has ON DELETE CASCADE on contact_id — junction rows
  // disappear automatically. Deals themselves survive (they may end up
  // with no primary contact, which is acceptable per the schema).
  const { error } = await client.from("contacts").delete().eq("id", id)
  if (error) throw error
}
