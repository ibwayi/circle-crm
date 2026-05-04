-- Migration: 0016_workspace_id_columns
-- Purpose:   Release 2.2 Phase 31, part 2 of 3 — add `workspace_id`
--            to every entity table that needs to be tenant-scoped.
--            Columns are NULLABLE in this migration so the backfill
--            in 0017 can assign workspaces to existing rows. The
--            NOT NULL constraint is added at the end of 0017, after
--            the backfill is verified.
--
-- Tables that get workspace_id (6 entity tables):
--   * companies     — visible to all workspace members (B+C model)
--   * contacts      — same
--   * deals         — visibility further narrowed in Phase 35
--                     (public/private/shared via deal_shares)
--   * tasks         — follow parent deal's visibility; standalone
--                     tasks are private to owner (enforced in 0017
--                     RLS, not at this column level)
--   * notes         — follow parent entity's visibility
--   * saved_views   — per-user-per-workspace; without workspace_id
--                     a saved view would leak across workspaces
--                     with potentially-different filter semantics
--
-- Tables that DO NOT get workspace_id:
--   * user_preferences — display name, avatar, default view, stale
--                        threshold are person-level, not workspace-
--                        level. A user has one preferences row that
--                        applies to every workspace they're in.
--   * deal_contacts    — junction; the deal's workspace is canonical.
--                        RLS will scope via the joined deal.
--   * workspaces / workspace_members — they ARE the workspace.
--
-- ON DELETE CASCADE on every workspace_id reference. Deleting a
-- workspace tears down its data — the application warns and confirms
-- in the Phase 33 settings UI; the schema enforces the consequence.
--
-- One per-table B-tree index on workspace_id. Every list query in
-- Phase 32+ filters by workspace_id first; the existing per-column
-- indexes (e.g. companies.user_id) stay because the new RLS still
-- references user_id for the "private deal" branch.
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.
--
-- Reversibility:
--   ALTER TABLE public.<each> DROP COLUMN workspace_id;
--   (drops the index automatically)

ALTER TABLE public.companies
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.contacts
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.deals
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.notes
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.saved_views
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Lookup indexes. Every entity-list query in Phase 32+ runs
-- `WHERE workspace_id = $1` (or via RLS on
-- current_user_workspaces()). B-tree on a UUID is the standard fit.
CREATE INDEX companies_workspace_id_idx   ON public.companies   (workspace_id);
CREATE INDEX contacts_workspace_id_idx    ON public.contacts    (workspace_id);
CREATE INDEX deals_workspace_id_idx       ON public.deals       (workspace_id);
CREATE INDEX tasks_workspace_id_idx       ON public.tasks       (workspace_id);
CREATE INDEX notes_workspace_id_idx       ON public.notes       (workspace_id);
CREATE INDEX saved_views_workspace_id_idx ON public.saved_views (workspace_id);
