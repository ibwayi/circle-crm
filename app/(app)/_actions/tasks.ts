"use server"

import { revalidatePath } from "next/cache"

import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  uncompleteTask,
  updateTask,
  type CreateTaskInput,
  type TaskParent,
  type TaskPriority,
} from "@/lib/db/tasks"
import { createClient } from "@/lib/supabase/server"

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

// Revalidate every page that might surface this task. Always /tasks and
// /dashboard (both bucket and stat-card surfaces). Plus the parent
// detail page if any.
function revalidateForParent(parent: TaskParent): void {
  revalidatePath("/tasks")
  revalidatePath("/dashboard")
  switch (parent.type) {
    case "deal":
      revalidatePath(`/deals/${parent.dealId}`)
      break
    case "contact":
      revalidatePath(`/contacts/${parent.contactId}`)
      break
    case "company":
      revalidatePath(`/companies/${parent.companyId}`)
      break
    case "standalone":
      // Already revalidated /tasks + /dashboard.
      break
  }
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
    revalidateForParent(input.parent)
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
    // this, a deal→contact reassignment would leave the old deal's
    // detail page stale until the next refresh.
    const previous = await getTask(supabase, id)
    const task = await updateTask(supabase, id, inputToCreate(input))
    if (previous) {
      const previousParent: TaskParent =
        previous.deal_id !== null
          ? { type: "deal", dealId: previous.deal_id }
          : previous.contact_id !== null
            ? { type: "contact", contactId: previous.contact_id }
            : previous.company_id !== null
              ? { type: "company", companyId: previous.company_id }
              : { type: "standalone" }
      revalidateForParent(previousParent)
    }
    revalidateForParent(input.parent)
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
    revalidateForParent(parentFromTask(task))
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
    revalidateForParent(parentFromTask(task))
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
    revalidateForParent(parentFromTask(task))
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
    // revalidate signal — once deleted, we can't reconstruct the FKs.
    const task = await getTask(supabase, id)
    await deleteTask(supabase, id)
    if (task) revalidateForParent(parentFromTask(task))
    else {
      revalidatePath("/tasks")
      revalidatePath("/dashboard")
    }
    return { ok: true, taskId: id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

// Translate a stored Task row's FK columns back into a TaskParent.
// The DB CHECK guarantees at most one is set, so the order doesn't
// matter — the first match wins.
function parentFromTask(task: {
  deal_id: string | null
  contact_id: string | null
  company_id: string | null
}): TaskParent {
  if (task.deal_id !== null) return { type: "deal", dealId: task.deal_id }
  if (task.contact_id !== null)
    return { type: "contact", contactId: task.contact_id }
  if (task.company_id !== null)
    return { type: "company", companyId: task.company_id }
  return { type: "standalone" }
}
