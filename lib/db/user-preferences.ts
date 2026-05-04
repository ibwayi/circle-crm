import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type UserPreferences =
  Database["public"]["Tables"]["user_preferences"]["Row"]
export type UserPreferencesInsert =
  Database["public"]["Tables"]["user_preferences"]["Insert"]
export type UserPreferencesUpdate =
  Database["public"]["Tables"]["user_preferences"]["Update"]

/**
 * Default deal view enum mirrors the View type in deals-list.tsx.
 * Kept as a separate union here so server-side preference reads
 * don't need to import a "use client" file.
 */
export type DefaultDealView = "table" | "groups" | "kanban"

/**
 * Caller-domain shape for upserting preferences. `userId` is
 * intentionally absent — the calling layer (server action) is
 * responsible for sourcing it from the session and passing it as a
 * separate arg. RLS rejects rows where user_id ≠ auth.uid() at
 * runtime as the safety net.
 *
 * All fields optional so the form can save partials (the user might
 * only update their display name without touching avatar or
 * defaults). Empty string is treated as "clear this field" by the
 * helpers — converted to null before write.
 */
export type UserPreferencesInput = {
  displayName?: string | null
  avatarUrl?: string | null
  defaultDealView?: DefaultDealView | null
  staleThresholdDays?: number | null
}

/**
 * Fetch the signed-in user's preferences row. Returns null for
 * first-time users (no row yet) — the caller is responsible for
 * rendering sensible defaults rather than crashing on null. See the
 * profile page + sidebar account card for examples.
 *
 * Single row; PRIMARY KEY (user_id) means at most one match. RLS
 * scopes the query so we don't need to filter user_id explicitly,
 * but we do for clarity (and so the same call shape works if the
 * caller has a Supabase client without the user's session).
 */
export async function getUserPreferences(
  client: Client,
  userId: string
): Promise<UserPreferences | null> {
  const { data, error } = await client
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Insert-or-update the preferences row. UPSERT on (user_id) so the
 * first save creates the row and subsequent saves replace the named
 * fields. Fields omitted from `input` are NOT cleared — the helper
 * builds a sparse update object so a "save display name" call leaves
 * the avatar URL untouched.
 *
 * Empty-string values in `input` are normalised to null before
 * write — the form passes "" for cleared text fields, and Postgres
 * treats "" as a non-null value which would defeat the CHECK
 * constraint on default_deal_view (an empty string isn't in the
 * allowed list).
 */
export async function upsertUserPreferences(
  client: Client,
  userId: string,
  input: UserPreferencesInput
): Promise<UserPreferences> {
  const row: UserPreferencesInsert = { user_id: userId }
  if (input.displayName !== undefined)
    row.display_name = normaliseString(input.displayName)
  if (input.avatarUrl !== undefined)
    row.avatar_url = normaliseString(input.avatarUrl)
  if (input.defaultDealView !== undefined)
    row.default_deal_view = input.defaultDealView
  if (input.staleThresholdDays !== undefined)
    row.stale_threshold_days = input.staleThresholdDays

  const { data, error } = await client
    .from("user_preferences")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single()
  if (error) throw error
  return data
}

function normaliseString(s: string | null): string | null {
  if (s === null) return null
  const trimmed = s.trim()
  return trimmed.length === 0 ? null : trimmed
}
