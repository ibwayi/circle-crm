import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"]
export type WorkspaceInsert =
  Database["public"]["Tables"]["workspaces"]["Insert"]
export type WorkspaceUpdate =
  Database["public"]["Tables"]["workspaces"]["Update"]

export type WorkspaceMember =
  Database["public"]["Tables"]["workspace_members"]["Row"]

export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

/**
 * One workspace + the role the current user has in it. Returned by
 * listMyWorkspaces — every consumer either renders the role badge
 * or uses it for client-side permission gating, so coupling them
 * here saves a second query per render.
 */
export type WorkspaceWithRole = Workspace & { role: WorkspaceRole }

/**
 * Workspaces the current user is a member of, ordered by oldest
 * membership first (so the workspace switcher's first slot is
 * stable across renders). Joined to `workspace_members` to surface
 * the user's role.
 *
 * RLS on workspace_members scopes to `user_id = auth.uid()` only
 * indirectly — the policy is "members can view co-members within
 * shared workspaces", which means a user sees their OWN membership
 * rows plus every other member of any workspace they're in. The
 * `.eq("user_id", auth.uid())`-equivalent narrowing isn't possible
 * without an `auth.uid()` rpc; instead we filter on the joined
 * `workspaces.owner_id`/`workspace_members.user_id` shape via the
 * Supabase JS subquery pattern.
 *
 * Simpler approach used here: query `workspace_members` filtered
 * by the active session via `auth.getUser()`-fed user_id. RLS
 * approves the read because the policy allows seeing co-members.
 */
export async function listMyWorkspaces(
  client: Client
): Promise<WorkspaceWithRole[]> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return []

  const { data, error } = await client
    .from("workspace_members")
    .select("role, joined_at, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
  if (error) throw error

  type Row = {
    role: WorkspaceRole
    joined_at: string
    workspace: Workspace
  }
  return ((data ?? []) as Row[])
    .filter((r) => r.workspace !== null)
    .map((r) => ({ ...r.workspace, role: r.role }))
}

export async function getWorkspace(
  client: Client,
  id: string
): Promise<Workspace | null> {
  const { data, error } = await client
    .from("workspaces")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Returns the current user's role in the given workspace, or null
 * if they aren't a member. Used for client-side permission gates
 * (showing/hiding the Settings link, the Delete button, etc.).
 *
 * Server-side equivalent for RLS gating is the `workspace_role`
 * SECURITY DEFINER function (0015) — that's the source of truth;
 * this helper exists so client code doesn't have to call an RPC
 * for every render.
 */
export async function getCurrentUserRole(
  client: Client,
  workspaceId: string
): Promise<WorkspaceRole | null> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const { data, error } = await client
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw error
  return (data?.role as WorkspaceRole | null) ?? null
}

/**
 * Create a new workspace. The caller becomes the sole owner.
 *
 * Two INSERTs in sequence because supabase-js doesn't expose
 * multi-statement transactions client-side:
 *   1. INSERT workspaces (RLS check: auth.uid() = owner_id)
 *   2. INSERT workspace_members (role='owner')
 *
 * If step 2 fails after step 1, the workspace exists with no
 * owner-membership — orphaned for the user (won't appear in their
 * list). Acceptable risk at this scale; a 2.3-admin workflow can
 * tidy up. The signup trigger uses the same two-INSERT pattern in
 * SQL where it's atomic by virtue of being inside the trigger.
 */
export async function createWorkspace(
  client: Client,
  name: string
): Promise<Workspace> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const trimmed = name.trim()
  if (trimmed.length === 0) throw new Error("Workspace name is required")

  const { data: workspace, error: wErr } = await client
    .from("workspaces")
    .insert({ name: trimmed, owner_id: user.id })
    .select()
    .single()
  if (wErr) throw wErr

  const { error: mErr } = await client
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "owner",
    })
  if (mErr) throw mErr

  return workspace
}

export async function updateWorkspace(
  client: Client,
  id: string,
  patch: { name?: string }
): Promise<Workspace> {
  const update: WorkspaceUpdate = {}
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim()
    if (trimmed.length === 0) throw new Error("Workspace name is required")
    update.name = trimmed
  }

  const { data, error } = await client
    .from("workspaces")
    .update(update)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Delete a workspace + cascade everything in it (companies,
 * contacts, deals, tasks, notes, saved_views — all have
 * ON DELETE CASCADE on their workspace_id refs). RLS gates this
 * to the owner only.
 */
export async function deleteWorkspace(
  client: Client,
  id: string
): Promise<void> {
  const { error } = await client.from("workspaces").delete().eq("id", id)
  if (error) throw error
}

/**
 * Members of a workspace. Phase 31 returns the raw membership
 * shape (no auth.users join — that's a Phase 33 concern, requires
 * a SECURITY DEFINER function or a public.users view to safely
 * expose email/display_name).
 */
export async function listWorkspaceMembers(
  client: Client,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await client
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("joined_at", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addMember(
  client: Client,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  const { data, error } = await client
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, user_id: userId, role })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMemberRole(
  client: Client,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  const { data, error } = await client
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeMember(
  client: Client,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await client
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
  if (error) throw error
}

/**
 * Internal helper: the current user's "primary" workspace — the
 * oldest one they're a member of. Used by entity helpers
 * (createCompany, etc.) as the fallback when the caller doesn't
 * specify a workspace_id explicitly.
 *
 * Phase 31 transitional: every existing user has exactly one
 * workspace post-migration, so this function returns the obvious
 * answer. Phase 32+ will start passing workspace_id explicitly
 * from the workspace-aware UI.
 */
export async function getPrimaryWorkspaceId(
  client: Client
): Promise<string> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    throw new Error(
      "User has no workspace memberships — signup trigger may have failed"
    )
  }
  return data.workspace_id
}
