"use server"

import { revalidatePath } from "next/cache"

import {
  completeTask,
  createTask,
  deleteTask,
  getDealRevalidationTargets,
  getTask,
  uncompleteTask,
  updateTask,
  type CreateTaskInput,
  type TaskParent,
  type TaskPriority,
} from "@/lib/db/tasks"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// Caller-shape for create/update actions. The form encodes the parent as
// a single string (see lib/validations/task.ts) and we decode here at
// the action boundary so client code never has to touch FK columns.
export type TaskActionInput = {
  title: string
  notes?: string | null
  due_date?: string | null
  due_time?: string | null
  priority?: TaskPriority
  parent: TaskParent
}

export type TaskActionResult =
  | { ok: true; taskId: string }
  | { ok: false; error: string }

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

/**
 * Revalidate every page that might surface this task: /tasks and
 * /dashboard always; the deal page when there is one; AND — new in
 * 24.7 — the deal's company page + the deal's primary-contact page,
 * since both surface the task transitively now.
 *
 * Takes a Supabase client so we can resolve the deal's company / primary
 * contact in a single query. Skipped for standalone tasks (no parent →
 * no transitive surfaces).
 */
async function revalidateForParent(
  client: SupabaseClient<Database>,
  parent: TaskParent
): Promise<void> {
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  if (parent.type === "standalone") return

  revalidatePath(`/deals/${parent.dealId}`)
  const { companyId, primaryContactId } = await getDealRevalidationTargets(
    client,
    parent.dealId
  )
  if (companyId) revalidatePath(`/companies/${companyId}`)
  if (primaryContactId) revalidatePath(`/contacts/${primaryContactId}`)
}

function inputToCreate(input: TaskActionInput): CreateTaskInput {
  return {
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    dueDate: input.due_date?.trim() || null,
    dueTime: input.due_time?.trim() || null,
    priority: input.priority ?? "medium",
    parent: input.parent,
  }
}

export async function createTaskAction(
  input: TaskActionInput
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  if (input.title.trim().length === 0) {
    return { ok: false, error: "Title is required." }
  }

  try {
    const task = await createTask(supabase, user.id, inputToCreate(input))
    await revalidateForParent(supabase, input.parent)
    return { ok: true, taskId: task.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateTaskAction(
  id: string,
  input: TaskActionInput
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  if (input.title.trim().length === 0) {
    return { ok: false, error: "Title is required." }
  }

  try {
    // Look up the prior parent so we can revalidate the page the task
    // was MOVING AWAY FROM in addition to the new parent's page. Without
    // this, a deal→standalone reassignment would leave the old deal's
    // detail page (and its company / primary contact pages) stale until
    // the next refresh.
    const previous = await getTask(supabase, id)
    const task = await updateTask(supabase, id, inputToCreate(input))
    if (previous) {
      const previousParent: TaskParent =
        previous.deal_id !== null
          ? { type: "deal", dealId: previous.deal_id }
          : { type: "standalone" }
      await revalidateForParent(supabase, previousParent)
    }
    await revalidateForParent(supabase, input.parent)
    return { ok: true, taskId: task.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function completeTaskAction(
  id: string
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const task = await completeTask(supabase, id)
    await revalidateForParent(supabase, parentFromTask(task))
    return { ok: true, taskId: task.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function uncompleteTaskAction(
  id: string
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const task = await uncompleteTask(supabase, id)
    await revalidateForParent(supabase, parentFromTask(task))
    return { ok: true, taskId: task.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

// Quick date-only mutation for the inline-reschedule popover on task
// rows. Reuses the partial-update helper from lib/db so it doesn't
// need to round-trip the full TaskActionInput.
export async function rescheduleTaskAction(
  id: string,
  dueDate: string | null
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const task = await updateTask(supabase, id, { dueDate })
    await revalidateForParent(supabase, parentFromTask(task))
    return { ok: true, taskId: task.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteTaskAction(
  id: string
): Promise<TaskActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    // Look up the parent before we delete so the right pages get a
    // revalidate signal — once deleted, we can't reconstruct the FK.
    const task = await getTask(supabase, id)
    await deleteTask(supabase, id)
    if (task) await revalidateForParent(supabase, parentFromTask(task))
    else {
      revalidatePath("/tasks")
      revalidatePath("/dashboard")
    }
    return { ok: true, taskId: id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

// Translate a stored Task row's deal_id back into a TaskParent.
function parentFromTask(task: { deal_id: string | null }): TaskParent {
  if (task.deal_id !== null) return { type: "deal", dealId: task.deal_id }
  return { type: "standalone" }
}

// -----------------------------------------------------------------------------
// Phase 29 — bulk actions for the multi-select UX on /tasks. RLS
// scopes by user_id; the queries don't need explicit filters. Each
// helper revalidates /tasks + /dashboard. Skipping the per-deal /
// per-company / per-contact revalidation here because bulk operations
// from /tasks rarely touch a single deal page (and the user can refresh
// if they navigate over).
// -----------------------------------------------------------------------------

export type BulkTasksActionResult =
  | { ok: true; affected: number }
  | { ok: false; error: string }

export async function bulkCompleteTasksAction(
  ids: string[]
): Promise<BulkTasksActionResult> {
  if (ids.length === 0) return { ok: true, affected: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const { error } = await supabase
      .from("tasks")
      .update({ completed_at: new Date().toISOString() })
      .in("id", ids)
    if (error) throw error
    revalidatePath("/tasks")
    revalidatePath("/dashboard")
    return { ok: true, affected: ids.length }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function bulkUncompleteTasksAction(
  ids: string[]
): Promise<BulkTasksActionResult> {
  if (ids.length === 0) return { ok: true, affected: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const { error } = await supabase
      .from("tasks")
      .update({ completed_at: null })
      .in("id", ids)
    if (error) throw error
    revalidatePath("/tasks")
    revalidatePath("/dashboard")
    return { ok: true, affected: ids.length }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function bulkDeleteTasksAction(
  ids: string[]
): Promise<BulkTasksActionResult> {
  if (ids.length === 0) return { ok: true, affected: 0 }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    const { error } = await supabase.from("tasks").delete().in("id", ids)
    if (error) throw error
    revalidatePath("/tasks")
    revalidatePath("/dashboard")
    return { ok: true, affected: ids.length }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
