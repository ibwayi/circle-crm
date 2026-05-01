import type { SupabaseClient } from "@supabase/supabase-js"
import { format } from "date-fns"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Task = Database["public"]["Tables"]["tasks"]["Row"]
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"]
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"]

export type TaskPriority = "low" | "medium" | "high"

/**
 * Discriminated union for a task's parent. Mirrors `NotesTarget` from the
 * actions layer but adds a fourth arm: `standalone` (no parent — a
 * personal todo). The DB-level CHECK from migration 0010 enforces
 * at-most-one of (deal_id, contact_id, company_id) is set; the union
 * catches the easy mistakes at compile time.
 */
export type TaskParent =
  | { type: "deal"; dealId: string }
  | { type: "contact"; contactId: string }
  | { type: "company"; companyId: string }
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
  upcoming: number
  completed: number
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
    contactId?: string
    companyId?: string
  }
): Promise<Task[]> {
  let query = client.from("tasks").select("*")

  if (opts?.dueBy) {
    query = query.lte("due_date", opts.dueBy)
  }

  if (opts?.completed === true) {
    query = query.not("completed_at", "is", null)
  } else if (opts?.completed === false) {
    query = query.is("completed_at", null)
  }
  // completed === null or undefined → no filter (both)

  if (opts?.dealId) query = query.eq("deal_id", opts.dealId)
  if (opts?.contactId) query = query.eq("contact_id", opts.contactId)
  if (opts?.companyId) query = query.eq("company_id", opts.companyId)

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

export async function listTasksForContact(
  client: Client,
  contactId: string
): Promise<Task[]> {
  return listTasks(client, { contactId, completed: false })
}

export async function listTasksForCompany(
  client: Client,
  companyId: string
): Promise<Task[]> {
  return listTasks(client, { companyId, completed: false })
}

export async function listStandaloneTasks(client: Client): Promise<Task[]> {
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .is("deal_id", null)
    .is("contact_id", null)
    .is("company_id", null)
    .is("completed_at", null)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

// Bucket queries for the /tasks page tabs and the dashboard widgets.
// Each is a thin wrapper over .from("tasks") — kept here (not inline in
// pages) per the WORKFLOW rule that all DB calls live in lib/db.

export async function listTasksDueToday(client: Client): Promise<Task[]> {
  const today = todayIso()
  const { data, error } = await client
    .from("tasks")
    .select("*")
    .is("completed_at", null)
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
    .is("completed_at", null)
    .lt("due_date", today)
    .order("due_date", { ascending: true })
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
    .is("completed_at", null)
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
    .not("completed_at", "is", null)
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
 * Translate a CreateTaskInput into a typed Insert row. Pulled out of
 * createTask so updateTask can reuse the parent-FK translation logic.
 */
function applyParent(
  row: { deal_id: string | null; contact_id: string | null; company_id: string | null },
  parent: TaskParent
): void {
  // Always set all three columns so callers don't have to think about
  // the "previous parent" they might be overwriting on update. The CHECK
  // constraint enforces at-most-one.
  row.deal_id = null
  row.contact_id = null
  row.company_id = null
  switch (parent.type) {
    case "deal":
      row.deal_id = parent.dealId
      break
    case "contact":
      row.contact_id = parent.contactId
      break
    case "company":
      row.company_id = parent.companyId
      break
    case "standalone":
      // All three already null.
      break
  }
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
    contact_id: null,
    company_id: null,
  }
  applyParent(insert as Required<typeof insert>, input.parent)

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
    // Re-parenting: set all three FK columns so the row never sits in a
    // stale-parent state mid-update. Unsetting via "standalone" leaves
    // all three null (caller's intent).
    const parentSlot: { deal_id: string | null; contact_id: string | null; company_id: string | null } = {
      deal_id: null,
      contact_id: null,
      company_id: null,
    }
    applyParent(parentSlot, input.parent)
    update.deal_id = parentSlot.deal_id
    update.contact_id = parentSlot.contact_id
    update.company_id = parentSlot.company_id
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

export async function completeTask(
  client: Client,
  id: string
): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uncompleteTask(
  client: Client,
  id: string
): Promise<Task> {
  const { data, error } = await client
    .from("tasks")
    .update({ completed_at: null })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
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
  // scale (≤200 tasks per user) this is faster + simpler than four
  // parallel COUNT queries — fewer round-trips, single read of "today",
  // and the aggregation logic stays in one readable place.
  const { data, error } = await client
    .from("tasks")
    .select("due_date, completed_at")
    .eq("user_id", userId)
  if (error) throw error

  const today = todayIso()
  const stats: TaskStats = {
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
  }

  for (const row of data ?? []) {
    if (row.completed_at !== null) {
      stats.completed++
      continue
    }
    // Open tasks only from here on.
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

