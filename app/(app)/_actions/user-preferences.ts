"use server"

import { revalidatePath } from "next/cache"

import {
  upsertUserPreferences,
  type UserPreferencesInput,
} from "@/lib/db/user-preferences"
import { createClient } from "@/lib/supabase/server"

export type UserPreferencesActionResult =
  | { ok: true }
  | { ok: false; error: string }

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return "Something went wrong. Please try again."
}

/**
 * Save the signed-in user's preferences. Sparse — fields not present
 * in `input` are not written. Avatar uploads happen client-side
 * directly to Supabase Storage (RLS scoped to the user's folder); the
 * action only writes the resulting URL to user_preferences.
 *
 * Revalidation: every protected route reads at least the avatar +
 * display_name from preferences (sidebar account card, topbar user
 * menu). Plus /deals reads default_deal_view and the dashboard reads
 * stale_threshold_days. Cheaper to revalidate the whole `(app)`
 * layout than enumerate.
 */
export async function updateUserPreferencesAction(
  input: UserPreferencesInput
): Promise<UserPreferencesActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "You are no longer signed in." }

  try {
    await upsertUserPreferences(supabase, user.id, input)
    revalidatePath("/", "layout")
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}
