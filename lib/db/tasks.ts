import type { SupabaseClient } from "@supabase/supabase-js"
import { format } from "date-fns"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]

export type TaskPriority = "low" | "medium" | "high"

/**
 * 3-state task status (Phase 29.5). The DB stores this as a CHECK-
 * constrained text column; the TypeScript union here keeps callers
 * honest at compile time. `completed_at` is still set/cleared
 * automatically by `setTaskStatus` so date-based queries continue
 * to work — status is the source of truth, completed_at is metadata.
 */
export type TaskStatus = "open" | "in_progress" | "completed"

export const TASK_STATUSES: readonly TaskStatus[] = [
  "open",
  "in_progress",
  "completed",
] as const

export function isTaskStatus(s: string): s is TaskStatus {
  return s === "open" || s === "in_progress" || s === "completed"
}

/**
 * A task either lives on a Deal or stands alone as a personal todo.
 * Phase 24.7 collapsed the previous {deal, contact, company, standalone}
 * union — the schema now has only `deal_id` and Company / Primary
 * Contact context is surfaced transitively via `getTaskDealContexts`.
 */
export type TaskParent =
  | { type: "deal"; dealId: string }
  | { type: "standalone" }

/**
 * Caller-domain shape for creating a task. `userId` is intentionally
 * absent — the calling layer (server action) is responsible for sourcing
 * it from the session and passing it to `createTask` as a separate arg.
 * RLS rejects rows where user_id ≠ auth.uid() at runtime as the safety
 * net.
 *
 * `dueDate` is `yyyy-MM-dd` (date-only — Postgres `date`). `dueTime` is
 * `HH:mm:ss` (Postgres `time`). Both nullable.
 */
export type CreateTaskInput = {
  title: string
  notes?: string | null
  dueDate?: string | null
  dueTime?: string | null
  priority?: TaskPriority
  parent: TaskParent
}

export type TaskStats = {
  dueToday: number
  overdue: number
  inProgress: number
  upcoming: number
  completed: number
}

/**
 * Read-only context surfaced for a deal-task on /tasks, the dashboard,
 * and the contact/company detail pages. Built once per page from the
 * tasks' deal_ids via `getTaskDealContexts` and passed to TaskRow.
 */
export type TaskDealContext = {
  dealId: string
  dealTitle: string
  companyId: string | null
  companyName: string | null
  primaryContactId: string | null
  primaryContactName: string | null
}

// Today as `yyyy-MM-dd` in local time. Postgres `date` is timezone-naive,
// so comparing against a local-time date string avoids the UTC-shift trap
// the date picker docs spell out (a German user's "today" at 23:00 must
// not become "tomorrow" via a toISOString detour).
function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export async function listTasks(
  client: Client,
  opts?: {
    /** ISO yyyy-MM-dd; filters where due_date <= dueBy */
    dueBy?: string
    /** true → completed only; false → open only; undefined/null → both */
    completed?: boolean | null
    dealId?: string
  }
): Promise<Task[]> {
  let query = client.from("tasks").select("*")

  if (opts?.dueBy) {
    query = query.lte("due_date", opts.dueBy)
  }

  // Phase 29.5: `completed` semantically means "is this task done?"
  // and now maps onto status — true → status='completed', false →
  // status IN ('open', 'in_progress'). Callers that want only
  // in_progress pass the new `inProgress: true` instead.
  if (opts?.completed === true) {
    query = query.eq("status", "completed")
  } else if (opts?.completed === false) {
    query = query.in("status", ["open", "in_progress"])
  }
  // completed === null or undefined → no filter (all three statuses)

  if (opts?.dealId) query = query.eq("deal_id", opts.dealId)

  // Sort: open first, then by due_date asc (NULLS LAST), then created_at desc.
  query = query
    .order("completed_at", { ascending: true, nullsFirst: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function listTasksForDeal(
  client: Client,
  dealId: string
): Promise<Task[]> {
  return listTasks(client, { dealId, completed: false })
}

/**
 * Tasks attached to any deal that belongs to this company. Used on the
 * Company detail page — the company itself can no longer be a task's
 * parent (Phase 24.7), but tasks on the company's deals are surfaced
 * transitively in a read-only list.
 *
 * Two round-trips: deal_ids first, then a single .in() query for tasks.
 * Same shape as listDeals's contactId filter — Supabase JS doesn't
 * support arbitrary subqueries, so the junction-then-main pattern is
 * the minimum.
 */
export async function listTasksForCompanyTransitive(
  client: Client,
  companyId: string
): Promise<Task[]> {
  const { data: deals, error: dErr } = await client
    .from("deals")
    .select("id")
    .eq("company_id", companyId)
  if (dErr) throw dErr
  const dealIds = (deals ?? []).map((d) => d.id)
  if (dealIds.length === 0) return []

  const { data, error } = await client
    .from("tasks")
    .select("*")
    .in("status", ["open", "in_progress"])
    .in("deal_id", dealIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

/**
 * Tasks attached to any deal that the contact participates in (via the
 * deal_contacts junction). Used on the Contact detail page — same
 * transitive-read-only model as `listTasksForCompanyTransitive`.
 */
export async function listTasksForContactTransitive(
  client: Client,
  contactId: string
): Promise<Task[]> {
  const { data: junctions, error: jErr } = await client
    .from("deal_contacts")
    .select("deal_id")
    .eq("contact_id", contactId)
  if (jErr) throw jErr
  const dealIds = (junctions ?? []).map((j) => j.deal_id)
  if (dealIds.length === 0) return []

  const { data, error } = await client
    .from("tasks")
    .select("*")
    .in("status", ["open", "in_progress"])
    .in("deal_id", dealIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listStandaloneTasks(client: Client): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .is("deal_id", null)
    .in("status", ["open", "in_progress"])
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

// Bucket queries for the /tasks page tabs and the dashboard widgets.
// Each is a thin wrapper over .from("tasks") — kept here (not inline in
// pages) per the WORKFLOW rule that all DB calls live in lib/db.

// Phase 29.5: bucket queries filter on status. The 5 tabs partition
// the user's tasks without overlap:
//   * Heute        → status='open' AND due_date=today
//   * Überfällig   → status='open' AND due_date<today
//   * In Bearbeitung → status='in_progress' (regardless of due_date)
//   * Demnächst    → status='open' AND (due_date>today OR due_date IS NULL)
//   * Erledigt     → status='completed'
// An in_progress task with due_date=today shows ONLY in "In
// Bearbeitung" — moving it there is the user's signal that they're
// actively on it; the date no longer drives where it lives.

export async function listTasksDueToday(client: Client): Promise<Task[]> {
  const today = todayIso()
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .eq("due_date", today)
    .order("due_time", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listOverdueTasks(client: Client): Promise<Task[]> {
  const today = todayIso()
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .lt("due_date", today)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listInProgressTasks(client: Client): Promise<Task[]> {
  // No date filter — once a task is in_progress, the user has chosen
  // to actively work on it; the bucket follows the status, not the
  // calendar. Sort by due_date so the most-urgent in-progress work
  // floats to the top.
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("status", "in_progress")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listUpcomingTasks(client: Client): Promise<Task[]> {
  const today = todayIso()
  // Open tasks where due_date > today OR due_date IS NULL. supabase-js's
  // .or() takes a comma-separated PostgREST string.
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("status", "open")
    .or(`due_date.gt.${today},due_date.is.null`)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function listCompletedTasks(client: Client): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
  if (error) throw error
  return data
}

export async function getTask(
  client: Client,
  id: string
): Promise<Task | null> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Translate a CreateTaskInput into a typed Insert row. Shared between
 * createTask (full insert) and updateTask (partial re-parent).
 *
 * The row type allows `string | null | undefined` because the generated
 * Insert / Update types mark deal_id as optional (default NULL). We
 * always assign explicitly so the standalone case overwrites a
 * previously-set deal_id on update.
 */
function applyParent(
  row: { deal_id?: string | null },
  parent: TaskParent
): void {
  row.deal_id = parent.type === "deal" ? parent.dealId : null
}

export async function createTask(
  client: Client,
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const insert: TaskInsert = {
    user_id: userId,
    title: input.title,
    notes: input.notes ?? null,
    due_date: input.dueDate ?? null,
    due_time: input.dueTime ?? null,
    priority: input.priority ?? "medium",
    deal_id: null,
  }
  applyParent(insert, input.parent)

  const { data, error } = await client
    .from("tasks")
    .insert(insert)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(
  client: Client,
  id: string,
  input: Partial<CreateTaskInput>
): Promise<Task> {
  // Only fields explicitly present in `input` are written. The Update
  // type already has every field optional, so we can copy fields one by
  // one without zeroing out unrelated columns.
  const update: TaskUpdate = {}
  if (input.title !== undefined) update.title = input.title
  if (input.notes !== undefined) update.notes = input.notes
  if (input.dueDate !== undefined) update.due_date = input.dueDate
  if (input.dueTime !== undefined) update.due_time = input.dueTime
  if (input.priority !== undefined) update.priority = input.priority

  if (input.parent !== undefined) {
    const parentSlot: { deal_id: string | null } = { deal_id: null }
    applyParent(parentSlot, input.parent)
    update.deal_id = parentSlot.deal_id
  }

  const { data, error } = await client
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Update a task's status. Source of truth is the `status` column;
 * this helper also keeps `completed_at` in sync for legacy queries
 * + the eventual activity timeline:
 *   * status='completed' → completed_at=now()
 *   * status='open' or 'in_progress' → completed_at=null
 *
 * Single-update so the two columns can never drift. Phase 29.5.
 */
export async function setTaskStatus(
  client: Client,
  id: string,
  status: TaskStatus
): Promise<Task> {
  const update: TaskUpdate = {
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
  }
  const { data, error } = await client
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Back-compat wrappers — kept so callers that just want "mark this
// done / undone" don't have to import the full TaskStatus union.
export async function completeTask(
  client: Client,
  id: string
): Promise<Task> {
  return setTaskStatus(client, id, "completed")
}

export async function uncompleteTask(
  client: Client,
  id: string
): Promise<Task> {
  return setTaskStatus(client, id, "open")
}

export async function deleteTask(client: Client, id: string): Promise<void> {
  const { error } = await client.from("tasks").delete().eq("id", id)
  if (error) throw error
}

export async function getTaskStats(
  client: Client,
  userId: string
): Promise<TaskStats> {
  // Single query + JS aggregation, mirroring getDealStats. At portfolio
  // scale (≤200 tasks per user) this is faster + simpler than five
  // parallel COUNT queries — fewer round-trips, single read of "today",
  // and the aggregation logic stays in one readable place.
  //
  // Phase 29.5: status partitions the rows into 5 buckets. The
  // bucketing here matches the bucket queries above so /tasks tabs
  // and the dashboard counter agree.
  const { data, error } = await client
    .from("tasks")
    .select("due_date, status")
    .eq("user_id", userId)
  if (error) throw error

  const today = todayIso()
  const stats: TaskStats = {
    dueToday: 0,
    overdue: 0,
    inProgress: 0,
    upcoming: 0,
    completed: 0,
  }

  for (const row of data ?? []) {
    if (row.status === "completed") {
      stats.completed++
      continue
    }
    if (row.status === "in_progress") {
      stats.inProgress++
      continue
    }
    // status === "open" from here on.
    if (row.due_date === null) {
      stats.upcoming++
      continue
    }
    if (row.due_date === today) {
      stats.dueToday++
    } else if (row.due_date < today) {
      stats.overdue++
    } else {
      stats.upcoming++
    }
  }

  return stats
}

/**
 * Batch-fetch the deal-side context (deal title, company, primary
 * contact) for a set of task deal_ids. Returns a Map keyed by deal_id
 * so pages can `contexts.get(task.deal_id)` per row in O(1).
 *
 * Single round-trip for the full set — primary-contact resolution
 * happens in JS over the joined `deal_contacts` rows. Empty `dealIds`
 * short-circuits to an empty map.
 */
export async function getTaskDealContexts(
  client: Client,
  dealIds: string[]
): Promise<Map<string, TaskDealContext>> {
  const map = new Map<string, TaskDealContext>()
  if (dealIds.length === 0) return map

  // Dedupe: the caller may pass overlapping IDs from /tasks's bucket
  // queries, no point asking the DB twice for the same deal.
  const unique = Array.from(new Set(dealIds))

  const { data, error } = await client
    .from("deals")
    .select(
      "id, title, company:companies(id, name), deal_contacts(is_primary, contact:contacts(id, first_name, last_name))"
    )
    .in("id", unique)
  if (error) throw error

  type Row = {
    id: string
    title: string
    company: { id: string; name: string } | null
    deal_contacts: Array<{
      is_primary: boolean
      contact: { id: string; first_name: string; last_name: string | null } | null
    }>
  }

  for (const row of (data ?? []) as Row[]) {
    const primary = row.deal_contacts.find((dc) => dc.is_primary)
    const primaryContact = primary?.contact ?? null
    const primaryContactName = primaryContact
      ? [primaryContact.first_name, primaryContact.last_name]
          .filter(Boolean)
          .join(" ")
      : null

    map.set(row.id, {
      dealId: row.id,
      dealTitle: row.title,
      companyId: row.company?.id ?? null,
      companyName: row.company?.name ?? null,
      primaryContactId: primaryContact?.id ?? null,
      primaryContactName,
    })
  }

  return map
}

/**
 * Resolve the revalidation targets for a deal-task. Used by the server
 * actions when a task is created / updated / deleted on a deal so the
 * deal's company page and primary-contact page (which surface the task
 * transitively) refresh too.
 */
export async function getDealRevalidationTargets(
  client: Client,
  dealId: string
): Promise<{ companyId: string | null; primaryContactId: string | null }> {
  const { data, error } = await client
    .from("deals")
    .select(
      "company_id, deal_contacts(is_primary, contact_id)"
    )
    .eq("id", dealId)
    .maybeSingle()
  if (error) throw error
  if (!data) return { companyId: null, primaryContactId: null }

  type Row = {
    company_id: string | null
    deal_contacts: Array<{ is_primary: boolean; contact_id: string }>
  }
  const row = data as Row
  const primary = row.deal_contacts.find((dc) => dc.is_primary)
  return {
    companyId: row.company_id,
    primaryContactId: primary?.contact_id ?? null,
  }
}
