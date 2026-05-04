"use server"

import { revalidatePath } from "next/cache"

import {
  createSavedView,
  deleteSavedView,
  updateSavedView,
  type SavedView,
  type SavedViewInput,
} from "@/lib/db/saved-views"
import { createClient } from "@/lib/supabase/server"

export type SavedViewActionResult =
  | { ok: true; view: SavedView }
  | { ok: false; error: string }

export type SavedViewSimpleResult =
  | { ok: true }
  | { ok: false; error: string }

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

// Each saved-view mutation revalidates the entity's list page so the
// client's `useRouter().refresh()` after the action picks up the new
// dropdown contents on next render.
function revalidateEntityPath(entity: SavedViewInput["entity"]): void {
  revalidatePath(`/${entity}`)
}

export async function createSavedViewAction(
  input: SavedViewInput
): Promise<SavedViewActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  if (input.name.trim().length === 0) {
    return { ok: false, error: "Name ist erforderlich." }
  }
  if (input.name.length > 80) {
    return { ok: false, error: "Name ist zu lang (max. 80 Zeichen)." }
  }

  try {
    const view = await createSavedView(supabase, user.id, input)
    revalidateEntityPath(input.entity)
    return { ok: true, view }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function updateSavedViewAction(
  id: string,
  input: { name: string; entity: SavedViewInput["entity"] }
): Promise<SavedViewActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  if (input.name.trim().length === 0) {
    return { ok: false, error: "Name ist erforderlich." }
  }
  if (input.name.length > 80) {
    return { ok: false, error: "Name ist zu lang (max. 80 Zeichen)." }
  }

  try {
    const view = await updateSavedView(supabase, id, { name: input.name })
    revalidateEntityPath(input.entity)
    return { ok: true, view }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

export async function deleteSavedViewAction(
  id: string,
  entity: SavedViewInput["entity"]
): Promise<SavedViewSimpleResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await deleteSavedView(supabase, id)
    revalidateEntityPath(entity)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
