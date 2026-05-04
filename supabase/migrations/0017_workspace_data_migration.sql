-- Migration: 0017_workspace_data_migration
-- Purpose:   Release 2.2 Phase 31, part 3 of 3 — the data move + RLS
--            rewrite + signup trigger. After this migration:
--              * every existing user owns a personal workspace
--              * every entity row has its workspace_id assigned
--              * workspace_id columns are NOT NULL
--              * old user-id-only RLS is replaced with workspace-aware
--                policies (helpers from 0015 do the membership/role
--                checks)
--              * new auth.users INSERTs trigger workspace creation
--
-- Section ordering matters and is INTENTIONAL — most of these steps
-- can't be re-ordered without breaking the migration:
--
--   A. DISABLE RLS on the 7 tables we're touching. Without this the
--      migration role would be unable to see/update existing rows
--      via the old user_id-only policies once we start switching
--      semantics.
--   B. Backfill loop: per existing user, create a workspace +
--      workspace_member, then UPDATE each entity table to point at
--      that workspace.
--   C. Mark workspace_id NOT NULL on every entity table. Verifies
--      the backfill was complete (NOT NULL fails loudly otherwise).
--   D. Drop the 7 old `user_id = auth.uid()` policies and replace
--      with workspace-aware policies. Per-table notes inline.
--   E. Re-enable RLS on the same 7 tables.
--   F. After-INSERT trigger on auth.users so every new account
--      lands with a workspace + owner membership.
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.
--
-- Reversibility: PARTIAL — the workspace tables can be dropped (see
-- 0015), the workspace_id columns can be dropped (see 0016), but
-- the migrated user_id assignments are unchanged so the data is
-- still in place. The OLD `user_id = auth.uid()` policies would
-- need to be reinstated manually from the prior migration files.

-- =============================================================================
-- Section A: DISABLE RLS during backfill + RLS rewrite
-- =============================================================================

ALTER TABLE public.companies      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views    DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Section B: Backfill — per-user workspace + entity-table assignment
-- =============================================================================

DO $$
DECLARE
  user_record   RECORD;
  new_workspace_id uuid;
  workspace_name   text;
BEGIN
  FOR user_record IN SELECT id, email FROM auth.users LOOP
    -- Demo account gets a distinct workspace label so the cron job
    -- can find it by name match if the UUID lookup ever fails.
    IF user_record.email = 'demo@circle.app' THEN
      workspace_name := 'Demo Workspace';
    ELSE
      workspace_name := 'Mein Workspace';
    END IF;

    INSERT INTO public.workspaces (name, owner_id)
    VALUES (workspace_name, user_record.id)
    RETURNING id INTO new_workspace_id;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, user_record.id, 'owner');

    -- Every entity row owned by this user goes to this workspace.
    -- saved_views explicitly included — Phase 29 missed the Phase 31
    -- workspace concept, so its rows need the same backfill.
    UPDATE public.companies   SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    UPDATE public.contacts    SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    UPDATE public.deals       SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    UPDATE public.tasks       SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    UPDATE public.notes       SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
    UPDATE public.saved_views SET workspace_id = new_workspace_id WHERE user_id = user_record.id;
  END LOOP;
END $$;

-- =============================================================================
-- Section C: Make workspace_id NOT NULL
-- =============================================================================
-- These will fail loudly if the backfill missed any row. That's the
-- desired behaviour — better to abort the migration here than to
-- ship with a half-assigned dataset.

ALTER TABLE public.companies   ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.contacts    ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.deals       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.tasks       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.notes       ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE public.saved_views ALTER COLUMN workspace_id SET NOT NULL;

-- =============================================================================
-- Section D: Drop old user_id-only policies + write new workspace-aware ones
-- =============================================================================
-- Per-table policy contract (applies to companies, contacts, notes,
-- and the deals transitional shape):
--   * SELECT — every workspace member sees every row in the workspace
--   * INSERT — workspace member with role ∈ {owner, admin, member}.
--             Viewers can't write.
--   * UPDATE — same role gate as INSERT, but additionally requires
--             workspace membership for the post-update row (catches
--             attempts to move a row to a workspace the user isn't
--             in)
--   * DELETE — owners + admins only. Members can't bulk-erase.
--
-- Tasks add a standalone-private clause: tasks with deal_id IS NULL
-- are visible only to their creator (`user_id = auth.uid()`).
-- Deal-attached tasks follow workspace visibility transitionally;
-- Phase 35 narrows them by the deal's visibility enum.
--
-- saved_views is per-user (each user has their own bookmarks). One
-- FOR ALL policy gates by user_id AND workspace membership.
--
-- deal_contacts is a junction. RLS scopes via the joined deal's
-- workspace — no direct workspace_id column on the junction.
-- =============================================================================

-- ---------- companies ----------
DROP POLICY IF EXISTS "Users can manage own companies" ON public.companies;

CREATE POLICY "Workspace members can view companies"
  ON public.companies
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert companies"
  ON public.companies
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Workspace members can update companies"
  ON public.companies
  FOR UPDATE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY "Owners and admins can delete companies"
  ON public.companies
  FOR DELETE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin'));

-- ---------- contacts ----------
DROP POLICY IF EXISTS "Users can manage own contacts" ON public.contacts;

CREATE POLICY "Workspace members can view contacts"
  ON public.contacts
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert contacts"
  ON public.contacts
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Workspace members can update contacts"
  ON public.contacts
  FOR UPDATE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY "Owners and admins can delete contacts"
  ON public.contacts
  FOR DELETE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin'));

-- ---------- deals (transitional — Phase 35 will add visibility enum) ----------
DROP POLICY IF EXISTS "Users can manage own deals" ON public.deals;

CREATE POLICY "Workspace members can view deals"
  ON public.deals
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert deals"
  ON public.deals
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Workspace members can update deals"
  ON public.deals
  FOR UPDATE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY "Owners and admins can delete deals"
  ON public.deals
  FOR DELETE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin'));

-- ---------- deal_contacts (junction; scope via joined deal) ----------
DROP POLICY IF EXISTS "Users can manage own deal contacts" ON public.deal_contacts;

CREATE POLICY "Workspace members can view deal contacts"
  ON public.deal_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.is_workspace_member(d.workspace_id)
    )
  );

CREATE POLICY "Workspace members can insert deal contacts"
  ON public.deal_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.workspace_role(d.workspace_id) IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace members can update deal contacts"
  ON public.deal_contacts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.workspace_role(d.workspace_id) IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "Workspace members can delete deal contacts"
  ON public.deal_contacts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_contacts.deal_id
        AND public.workspace_role(d.workspace_id) IN ('owner', 'admin', 'member')
    )
  );

-- ---------- tasks (standalone tasks are private to owner) ----------
DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;

CREATE POLICY "Workspace members can view tasks"
  ON public.tasks
  FOR SELECT
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      deal_id IS NOT NULL  -- deal-attached: visible to all members
      OR user_id = auth.uid()  -- standalone: visible only to creator
    )
  );

CREATE POLICY "Workspace members can insert tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Workspace members can update tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
    AND (deal_id IS NOT NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
    AND (deal_id IS NOT NULL OR user_id = auth.uid())
  );

CREATE POLICY "Workspace members can delete tasks"
  ON public.tasks
  FOR DELETE
  USING (
    public.is_workspace_member(workspace_id)
    AND (
      user_id = auth.uid()  -- own task (standalone or otherwise)
      OR (
        deal_id IS NOT NULL
        AND public.workspace_role(workspace_id) IN ('owner', 'admin')
      )
    )
  );

-- ---------- notes ----------
DROP POLICY IF EXISTS "Users can manage own notes" ON public.notes;

CREATE POLICY "Workspace members can view notes"
  ON public.notes
  FOR SELECT
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "Workspace members can insert notes"
  ON public.notes
  FOR INSERT
  WITH CHECK (
    public.workspace_role(workspace_id) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Workspace members can update notes"
  ON public.notes
  FOR UPDATE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'))
  WITH CHECK (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

CREATE POLICY "Workspace members can delete notes"
  ON public.notes
  FOR DELETE
  USING (public.workspace_role(workspace_id) IN ('owner', 'admin', 'member'));

-- ---------- saved_views (per-user-per-workspace) ----------
DROP POLICY IF EXISTS "Users can manage own saved views" ON public.saved_views;

CREATE POLICY "Users can manage own saved views"
  ON public.saved_views
  FOR ALL
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id))
  WITH CHECK (user_id = auth.uid() AND public.is_workspace_member(workspace_id));

-- =============================================================================
-- Section E: Re-enable RLS
-- =============================================================================

ALTER TABLE public.companies      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_contacts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_views    ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Section F: auth.users → workspace creation trigger
-- =============================================================================
-- After-INSERT trigger so every new account lands with a workspace +
-- owner membership in a single transaction. Functions on auth.users
-- need SECURITY DEFINER to write into public.* (the auth user
-- doesn't have direct INSERT rights on those tables) — Supabase's
-- standard pattern for post-signup hooks.

CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES ('Mein Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_create_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_workspace();
