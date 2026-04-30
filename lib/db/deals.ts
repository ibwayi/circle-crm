import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { escapeIlike } from "@/lib/db/_utils"

type Client = SupabaseClient<Database>

export type Deal = Database["public"]["Tables"]["deals"]["Row"]
export type DealInsert = Database["public"]["Tables"]["deals"]["Insert"]
export type DealUpdate = Database["public"]["Tables"]["deals"]["Update"]

// gen-types reports `stage` as `string` (CHECK constraints aren't reflected,
// same story as customers.status in 1.0). The DB enforces the union — we
// narrow it in app code.
export type DealStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost"

type Company = Database["public"]["Tables"]["companies"]["Row"]
type Contact = Database["public"]["Tables"]["contacts"]["Row"]

// List view shape: each deal joined with its company summary AND its
// primary contact summary, surfaced as flat properties so the kanban card
// can render "Q4 Project · Bytewise · Sarah Hoffmann" without N+1 queries.
export type DealCompanySummary = { id: string; name: string }
export type DealPrimaryContactSummary = {
  id: string
  first_name: string
  last_name: string | null
}

export type DealWithRelations = Deal & {
  company: DealCompanySummary | null
  primary_contact: DealPrimaryContactSummary | null
}

// Detail view shape: full company + ALL linked contacts (with is_primary).
export type ContactWithPrimaryFlag = Contact & { is_primary: boolean }

export type DealWithFullRelations = {
  deal: Deal
  company: Company | null
  contacts: ContactWithPrimaryFlag[]
}

export type DealStats = {
  activeCount: number
  activePipelineEur: number
  wonThisMonthCount: number
  wonThisMonthEur: number
  lostThisMonthCount: number
  lostThisMonthEur: number
  byStage: Record<string, number>
}

// Stable, case-insensitive contact ordering: primary first, then NULLS
// FIRST on last_name (mononyms float), then last_name, then first_name.
function compareContactsByPrimaryThenName(
  a: ContactWithPrimaryFlag,
  b: ContactWithPrimaryFlag
): number {
  if (a.is_primary && !b.is_primary) return -1
  if (!a.is_primary && b.is_primary) return 1
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

export async function listDeals(
  client: Client,
  opts?: {
    stage?: DealStage | DealStage[]
    search?: string
    companyId?: string | null
    contactId?: string
  }
): Promise<DealWithRelations[]> {
  // Contact filter goes through the deal_contacts junction. Supabase JS
  // doesn't support arbitrary subqueries, so we resolve junction → deal_id
  // first and use .in('id', dealIds) on the main query. Two queries; one
  // round-trip is the minimum for this case.
  let dealIdAllowList: string[] | null = null
  if (opts?.contactId) {
    const { data: junctions, error: jErr } = await client
      .from("deal_contacts")
      .select("deal_id")
      .eq("contact_id", opts.contactId)
    if (jErr) throw jErr
    dealIdAllowList = (junctions ?? []).map((j) => j.deal_id)
    if (dealIdAllowList.length === 0) return []
  }

  // Nested select pulls company summary AND every junction row (with the
  // contact summary). We post-process to surface only the primary as a
  // flat property — the kanban card needs that, not the full junction
  // array.
  let query = client
    .from("deals")
    .select(
      "*, company:companies(id, name), deal_contacts(is_primary, contact:contacts(id, first_name, last_name))"
    )

  if (opts?.stage) {
    if (Array.isArray(opts.stage)) {
      query = query.in("stage", opts.stage)
    } else {
      query = query.eq("stage", opts.stage)
    }
  }

  // Three-state companyId (mirrors listContacts).
  if (opts?.companyId === null) {
    query = query.is("company_id", null)
  } else if (typeof opts?.companyId === "string") {
    query = query.eq("company_id", opts.companyId)
  }

  if (opts?.search && opts.search.trim().length > 0) {
    const term = escapeIlike(opts.search.trim())
    query = query.ilike("title", `%${term}%`)
  }

  if (dealIdAllowList) {
    query = query.in("id", dealIdAllowList)
  }

  query = query.order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) throw error

  // Post-process: each row arrives as
  //   Deal & { company: { id, name } | null, deal_contacts: Array<...> }
  // We strip deal_contacts and surface primary_contact as a flat prop.
  type RawRow = Deal & {
    company: DealCompanySummary | null
    deal_contacts: Array<{
      is_primary: boolean
      contact: DealPrimaryContactSummary | null
    }>
  }

  // Build the result explicitly rather than destructuring-and-discarding.
  // The explicit field listing acts as a contract with DealWithRelations:
  // adding a column to the schema lights up a TS error here, which is
  // useful — the alternative (a destructure-and-spread that drops
  // deal_contacts) trips the no-unused-vars lint without a clean fix.
  return (data as unknown as RawRow[]).map((row): DealWithRelations => {
    const primary = row.deal_contacts.find((dc) => dc.is_primary)
    const primary_contact = primary?.contact ?? null
    return {
      id: row.id,
      user_id: row.user_id,
      company_id: row.company_id,
      title: row.title,
      value_eur: row.value_eur,
      stage: row.stage,
      priority: row.priority,
      source: row.source,
      expected_close_date: row.expected_close_date,
      probability: row.probability,
      closed_at: row.closed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      company: row.company,
      primary_contact,
    }
  })
}

export async function getDeal(
  client: Client,
  id: string
): Promise<DealWithFullRelations | null> {
  const { data: deal, error: dealErr } = await client
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (dealErr) throw dealErr
  if (!deal) return null

  // Async IIFEs for Promise.all — supabase-js builders are PromiseLike
  // not Promise; wrapping in async functions returns real Promises.
  const companyPromise = (async (): Promise<Company | null> => {
    if (deal.company_id === null) return null
    const res = await client
      .from("companies")
      .select("*")
      .eq("id", deal.company_id)
      .maybeSingle()
    if (res.error) throw res.error
    return res.data
  })()

  const contactsPromise = (async (): Promise<ContactWithPrimaryFlag[]> => {
    const res = await client
      .from("deal_contacts")
      .select("is_primary, contact:contacts(*)")
      .eq("deal_id", id)
    if (res.error) throw res.error
    const rows = (res.data ?? []) as Array<{
      is_primary: boolean
      contact: Contact | null
    }>
    return rows.flatMap((row) =>
      row.contact ? [{ ...row.contact, is_primary: row.is_primary }] : []
    )
  })()

  const [company, contacts] = await Promise.all([companyPromise, contactsPromise])
  contacts.sort(compareContactsByPrimaryThenName)

  return { deal, company, contacts }
}

export async function createDeal(
  client: Client,
  input: DealInsert,
  primaryContactId?: string
): Promise<Deal> {
  const { data: deal, error } = await client
    .from("deals")
    .insert(input)
    .select()
    .single()
  if (error) throw error

  if (primaryContactId) {
    // Two-step (Supabase JS has no transaction primitive). Partial-failure
    // case: deal exists, junction missing — caller can set primary later
    // from the deal detail UI. We re-throw so the toast surfaces.
    const { error: jErr } = await client.from("deal_contacts").insert({
      deal_id: deal.id,
      contact_id: primaryContactId,
      user_id: input.user_id,
      is_primary: true,
    })
    if (jErr) throw jErr
  }

  return deal
}

export async function updateDeal(
  client: Client,
  id: string,
  input: DealUpdate
): Promise<Deal> {
  // Strip immutable fields:
  //   - user_id: RLS would reject anyway, but defensive layering.
  //   - closed_at: trigger-managed by deals_set_closed_at (0005);
  //     callers must not pass it.
  const {
    user_id: _userId,
    closed_at: _closedAt,
    ...safeInput
  } = input
  void _userId
  void _closedAt

  const { data, error } = await client
    .from("deals")
    .update(safeInput)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDealStage(
  client: Client,
  id: string,
  stage: DealStage
): Promise<Deal> {
  // Convenience for kanban drag-and-drop. The deals_set_closed_at trigger
  // from 0005 fires on this UPDATE OF stage and stamps/clears closed_at
  // as the deal enters or leaves won/lost.
  return updateDeal(client, id, { stage })
}

export async function deleteDeal(client: Client, id: string): Promise<void> {
  // Cascade on deal_contacts.deal_id → junction rows go away.
  // Cascade on notes.deal_id → notes attached to this deal go away.
  const { error } = await client.from("deals").delete().eq("id", id)
  if (error) throw error
}

export async function linkContactToDeal(
  client: Client,
  dealId: string,
  contactId: string,
  opts?: { isPrimary?: boolean }
): Promise<void> {
  const isPrimary = opts?.isPrimary ?? false

  if (isPrimary) {
    // Demote any existing primary first — the partial UNIQUE index on
    // (deal_id) WHERE is_primary = true would reject the insert otherwise.
    const { error: dErr } = await client
      .from("deal_contacts")
      .update({ is_primary: false })
      .eq("deal_id", dealId)
      .eq("is_primary", true)
    if (dErr) throw dErr
  }

  // The junction's user_id must match the deal's user_id (cross-table
  // ownership trigger from 0006). Look it up rather than asking the
  // caller — keeps the helper self-sufficient.
  const { data: deal, error: dealErr } = await client
    .from("deals")
    .select("user_id")
    .eq("id", dealId)
    .maybeSingle()
  if (dealErr) throw dealErr
  if (!deal) throw new Error(`Deal ${dealId} not found.`)

  const { error: insertErr } = await client.from("deal_contacts").insert({
    deal_id: dealId,
    contact_id: contactId,
    user_id: deal.user_id,
    is_primary: isPrimary,
  })
  if (insertErr) throw insertErr
}

export async function unlinkContactFromDeal(
  client: Client,
  dealId: string,
  contactId: string
): Promise<void> {
  // No re-promotion if the deleted contact was primary — leaving the
  // deal without a primary is acceptable; the user can promote another
  // contact via setDealPrimaryContact.
  const { error } = await client
    .from("deal_contacts")
    .delete()
    .eq("deal_id", dealId)
    .eq("contact_id", contactId)
  if (error) throw error
}

export async function setDealPrimaryContact(
  client: Client,
  dealId: string,
  contactId: string
): Promise<void> {
  // The contact must already be linked. We don't auto-link here — that's
  // linkContactToDeal's job. Throwing keeps the operation's intent clear:
  // "promote this existing link" vs "add a new one as primary."
  const { data: existing, error: checkErr } = await client
    .from("deal_contacts")
    .select("contact_id")
    .eq("deal_id", dealId)
    .eq("contact_id", contactId)
    .maybeSingle()
  if (checkErr) throw checkErr
  if (!existing) {
    throw new Error(
      `Contact ${contactId} is not linked to deal ${dealId}. Use linkContactToDeal first.`
    )
  }

  // Demote-then-promote, in that order, to satisfy the partial UNIQUE
  // index on (deal_id) WHERE is_primary = true.
  const { error: dErr } = await client
    .from("deal_contacts")
    .update({ is_primary: false })
    .eq("deal_id", dealId)
    .eq("is_primary", true)
  if (dErr) throw dErr

  const { error: pErr } = await client
    .from("deal_contacts")
    .update({ is_primary: true })
    .eq("deal_id", dealId)
    .eq("contact_id", contactId)
  if (pErr) throw pErr
}

export async function getDealStats(
  client: Client,
  opts?: { userId?: string }
): Promise<DealStats> {
  // One query for all deal rows, aggregate in JS. At portfolio scale
  // (≤200 deals per user), this is faster and simpler than five
  // separate count() queries — fewer round-trips, single source of
  // truth for the month boundary.
  let query = client.from("deals").select("stage, value_eur, closed_at")
  if (opts?.userId) {
    query = query.eq("user_id", opts.userId)
  }
  const { data, error } = await query
  if (error) throw error

  // First-of-month at local midnight in ISO. Postgres timestamps are
  // UTC; comparing an ISO string built in local time can drift by up to
  // an hour. For German users (UTC+1/+2) "this month" is close enough
  // that a sub-hour drift at the boundary doesn't matter for a stat.
  const now = new Date()
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  ).toISOString()

  const stats: DealStats = {
    activeCount: 0,
    activePipelineEur: 0,
    wonThisMonthCount: 0,
    wonThisMonthEur: 0,
    lostThisMonthCount: 0,
    lostThisMonthEur: 0,
    byStage: {},
  }

  for (const deal of data ?? []) {
    stats.byStage[deal.stage] = (stats.byStage[deal.stage] ?? 0) + 1

    if (deal.stage !== "won" && deal.stage !== "lost") {
      stats.activeCount++
      if (deal.value_eur !== null) stats.activePipelineEur += deal.value_eur
      continue
    }

    // Won/lost: only this-month closures contribute to the monthly stats.
    if (deal.closed_at !== null && deal.closed_at >= monthStart) {
      if (deal.stage === "won") {
        stats.wonThisMonthCount++
        if (deal.value_eur !== null) stats.wonThisMonthEur += deal.value_eur
      } else {
        stats.lostThisMonthCount++
        if (deal.value_eur !== null) stats.lostThisMonthEur += deal.value_eur
      }
    }
  }

  return stats
}
