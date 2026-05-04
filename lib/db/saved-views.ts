import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import { getPrimaryWorkspaceId } from "@/lib/db/workspaces"

type Client = SupabaseClient<Database>

/**
 * Discriminates which entity list page a saved view belongs to. The
 * CHECK constraint on saved_views.entity enforces the same set in
 * the database. Kept narrow so a callsite passing a typo gets a
 * compile error before runtime.
 */
export type SavedViewEntity = "deals" | "contacts" | "companies" | "tasks"

/**
 * Sort payload stored alongside filters. Only /deals exposes a
 * column-sortable table at v1, so this is null for contacts /
 * companies / tasks. dir mirrors the SortDirection enum from the
 * deals table.
 */
export type SavedViewSort = {
  key: string
  dir: "asc" | "desc"
}

export type SavedView = {
  id: string
  user_id: string
  entity: SavedViewEntity
  name: string
  /**
   * URL searchParams to apply on load — `Record<string, string>`.
   * Empty object means "no filters set, just a plain list view".
   * Excludes sort/dir; those live in `sort`.
   */
  filters: Record<string, string>
  sort: SavedViewSort | null
  created_at: string
  updated_at: string
}

export type SavedViewInput = {
  entity: SavedViewEntity
  name: string
  filters: Record<string, string>
  sort: SavedViewSort | null
}

type Row = Database["public"]["Tables"]["saved_views"]["Row"]

// Narrow the JSONB return values back into the typed shapes. The
// supabase generator types JSONB as `Json` (a recursive union), which
// is correct but unhelpful at the call site. Centralising the cast
// here keeps the rest of the code unaware of the database's loose
// JSON type.
function rowToSavedView(row: Row): SavedView {
  return {
    id: row.id,
    user_id: row.user_id,
    entity: row.entity as SavedViewEntity,
    name: row.name,
    filters: (row.filters ?? {}) as Record<string, string>,
    sort: (row.sort ?? null) as SavedViewSort | null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * List the signed-in user's saved views for one entity. Sorted by
 * created_at ASC so the dropdown order matches the order in which
 * the user saved them (most-recent at the bottom — they remember the
 * last one they made).
 */
export async function listSavedViews(
  client: Client,
  entity: SavedViewEntity
): Promise<SavedView[]> {
  const { data, error } = await client
    .from("saved_views")
    .select("*")
    .eq("entity", entity)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map(rowToSavedView)
}

export async function getSavedView(
  client: Client,
  id: string
): Promise<SavedView | null> {
  const { data, error } = await client
    .from("saved_views")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data ? rowToSavedView(data) : null
}

export async function createSavedView(
  client: Client,
  userId: string,
  input: SavedViewInput,
  workspaceId?: string
): Promise<SavedView> {
  // Phase 31 transitional: saved_views are scoped per-user-per-workspace.
  // When the caller doesn't pass workspaceId, fall back to the user's
  // primary workspace. Phase 32 will thread the active workspace
  // through every saved-views action.
  const workspace_id =
    workspaceId ?? (await getPrimaryWorkspaceId(client))
  const { data, error } = await client
    .from("saved_views")
    .insert({
      user_id: userId,
      workspace_id,
      entity: input.entity,
      name: input.name.trim(),
      filters: input.filters,
      sort: input.sort,
    })
    .select()
    .single()
  if (error) throw error
  return rowToSavedView(data)
}

/**
 * Partial update — undefined fields are not written. Used for both
 * "rename a view" (name only) and a hypothetical future "update the
 * filters of this saved view to match what's currently in the URL"
 * (filters + sort).
 */
export async function updateSavedView(
  client: Client,
  id: string,
  input: Partial<Omit<SavedViewInput, "entity">>
): Promise<SavedView> {
  const update: Database["public"]["Tables"]["saved_views"]["Update"] = {}
  if (input.name !== undefined) update.name = input.name.trim()
  if (input.filters !== undefined) update.filters = input.filters
  if (input.sort !== undefined) update.sort = input.sort

  const { data, error } = await client
    .from("saved_views")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return rowToSavedView(data)
}

export async function deleteSavedView(
  client: Client,
  id: string
): Promise<void> {
  const { error } = await client.from("saved_views").delete().eq("id", id)
  if (error) throw error
}
