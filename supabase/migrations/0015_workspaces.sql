-- Migration: 0015_workspaces
-- Purpose:   Release 2.2 Phase 31, part 1 of 3 — introduce the
--            multi-tenant workspace primitives. This migration is
--            additive only: no existing entity table is touched yet.
--            Backfill + RLS rewrite happen in 0017.
--
-- New tables:
--   * workspaces        — the tenant root. Owned by exactly one user
--                         (auth.users), but the owner relationship is
--                         informational; access control flows through
--                         workspace_members. owner_id has ON DELETE
--                         RESTRICT so a workspace can't lose its owner
--                         silently — the application has to reassign
--                         or delete the workspace first.
--   * workspace_members — junction. Composite PRIMARY KEY (workspace_id,
--                         user_id) means at most one role per
--                         membership (no duplicate joins). role is a
--                         CHECK-constrained text instead of an enum
--                         so we can extend it later without a schema
--                         migration (matches the deals.stage pattern).
--
-- Helper functions (SECURITY DEFINER):
--   * is_workspace_member(uuid)  — boolean membership check
--   * workspace_role(uuid)       — current user's role, or NULL
--   * current_user_workspaces()  — SETOF uuid for IN-list policies
--
-- These are SECURITY DEFINER so they can read workspace_members
-- without tripping that table's own RLS — otherwise the policies
-- below would be self-referential (membership policy queries
-- workspace_members → triggers RLS check → calls policy → infinite
-- loop). STABLE because they only read, no writes; the planner can
-- cache results within a single query. SET search_path = public is
-- a safety pin against schema-shadowing attacks (Supabase's
-- standard recommendation for SECURITY DEFINER functions).
--
-- RLS posture for the new tables:
--   * workspaces:        members can SELECT; any auth user can INSERT
--                        (creates own workspace); owners/admins can
--                        UPDATE; only the owner can DELETE.
--   * workspace_members: members see co-members; owners/admins can
--                        add/update; owners/admins or the user
--                        themself can remove.
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.
--
-- Reversibility:
--   DROP FUNCTION public.current_user_workspaces();
--   DROP FUNCTION public.workspace_role(uuid);
--   DROP FUNCTION public.is_workspace_member(uuid);
--   DROP TABLE public.workspace_members;
--   DROP TABLE public.workspaces;

-- =============================================================================
-- Section A: Tables
-- =============================================================================

CREATE TABLE public.workspaces (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text         NOT NULL,
  owner_id    uuid         NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX workspaces_owner_id_idx ON public.workspaces (owner_id);

-- Reuses the shared updated_at trigger function from 0001.
CREATE TRIGGER workspaces_set_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workspace_members (
  workspace_id  uuid         NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text         NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at     timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Reverse-direction lookup: "give me every workspace this user is in".
-- The composite PK already indexes (workspace_id, user_id); this one
-- supports the user_id-leading query that current_user_workspaces()
-- runs on every page load.
CREATE INDEX workspace_members_user_id_idx ON public.workspace_members (user_id);

-- =============================================================================
-- Section B: SECURITY DEFINER helper functions
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_role(_workspace_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_workspaces()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workspace_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_workspaces() TO authenticated;

-- =============================================================================
-- Section C: RLS policies
-- =============================================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their workspaces"
  ON public.workspaces
  FOR SELECT
  USING (public.is_workspace_member(id));

-- Anyone authenticated can create a workspace they own. The matching
-- workspace_members row (role='owner') must be inserted by the
-- application in the same transaction; the post-2.2 signup trigger
-- (added in 0017) handles this for new auth.users; the existing
-- backfill in 0017 handles it for current users.
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and admins can update workspace"
  ON public.workspaces
  FOR UPDATE
  USING (public.workspace_role(id) IN ('owner', 'admin'));

-- Only owners can delete; admin role can't tear down the workspace.
CREATE POLICY "Only owners can delete workspaces"
  ON public.workspaces
  FOR DELETE
  USING (owner_id = auth.uid());

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view co-members"
  ON public.workspace_members
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (public.workspace_role(workspace_id) IN ('owner', 'admin'));

CREATE POLICY "Owners and admins can update member roles"
  ON public.workspace_members
  FOR UPDATE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin'));

-- Self-removal is allowed (a member can leave a workspace they joined).
-- Owners can't be removed via this path because removing the owner
-- would orphan the workspace; the application must transfer ownership
-- before the owner leaves. (Not enforced at SQL level in v1; the UI
-- guards it. v2.3-admin will tighten this.)
CREATE POLICY "Owners and admins can remove members; users can remove themselves"
  ON public.workspace_members
  FOR DELETE
  USING (
    public.workspace_role(workspace_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );
