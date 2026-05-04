import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

/**
 * Resolves which workspace a server-rendered page should fetch
 * data from. The contract:
 *
 *   1. If the URL has `?workspace=<uuid>` AND the user is a member
 *      of that workspace, use it.
 *   2. Otherwise fall back to the user's primary workspace (oldest
 *      membership by joined_at).
 *   3. Returns null only if the user has zero memberships — which
 *      can't happen post-Phase-31 because the signup trigger
 *      guarantees every account has at least one workspace.
 *
 * Used by every entity list page in Phase 32+ as the first line of
 * its server component:
 *
 *   const workspaceId = await getActiveWorkspaceId(supabase, params)
 *
 * Then passed into the entity helpers (listDeals(supabase, { ...,
 * workspaceId })) for explicit narrowing on top of RLS.
 *
 * Phase 31 doesn't yet update pages — this helper is shipped as
 * scaffolding so Phase 32 can wire it in without re-touching the
 * data layer.
 */
export async function getActiveWorkspaceId(
  client: Client,
  searchParams?: { workspace?: string | null }
): Promise<string | null> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const { data: memberships, error } = await client
    .from("workspace_members")
    .select("workspace_id, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
  if (error) throw error

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id)
  if (workspaceIds.length === 0) return null

  // URL param wins if the user is a member of the requested workspace.
  // A non-member request silently falls through to the default —
  // that's safer than throwing or 403'ing on every old shared link.
  const requested = searchParams?.workspace
  if (requested && workspaceIds.includes(requested)) {
    return requested
  }

  return workspaceIds[0]
}
