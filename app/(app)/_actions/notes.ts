"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createNote, deleteNote, type CreateNoteInput } from "@/lib/db/notes"

// Discriminated union mirroring CreateNoteInput (without `userId` — the
// action injects that from the session). Keeping the action's surface in
// terms of "target" rather than four parallel functions means the client
// component holds a single addNoteAction reference and the server is the
// only place that has to know which FK column maps to which entity.
export type NotesTarget =
  | { type: "customer"; customerId: string }
  | { type: "company"; companyId: string }
  | { type: "contact"; contactId: string }
  | { type: "deal"; dealId: string }

export type NoteActionResult =
  | { ok: true; noteId: string }
  | { ok: false; error: string }

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

function pathForTarget(target: NotesTarget): string {
  switch (target.type) {
    case "customer":
      return `/customers/${target.customerId}`
    case "company":
      return `/companies/${target.companyId}`
    case "contact":
      return `/contacts/${target.contactId}`
    case "deal":
      return `/deals/${target.dealId}`
  }
}

function createInputForTarget(
  target: NotesTarget,
  content: string,
  userId: string
): CreateNoteInput {
  switch (target.type) {
    case "customer":
      return { customerId: target.customerId, content, userId }
    case "company":
      return { companyId: target.companyId, content, userId }
    case "contact":
      return { contactId: target.contactId, content, userId }
    case "deal":
      return { dealId: target.dealId, content, userId }
  }
}

export async function addNoteAction(
  target: NotesTarget,
  content: string
): Promise<NoteActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return { ok: false, error: "Note can't be empty." }
  }

  try {
    const note = await createNote(
      supabase,
      createInputForTarget(target, trimmed, user.id)
    )
    revalidatePath(pathForTarget(target))
    return { ok: true, noteId: note.id }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteNoteAction(
  noteId: string,
  target: NotesTarget
): Promise<NoteActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await deleteNote(supabase, noteId)
    revalidatePath(pathForTarget(target))
    return { ok: true, noteId }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
