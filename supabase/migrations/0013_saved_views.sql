-- Migration: 0013_saved_views
-- Purpose:   Release 2.1 Phase 29 — per-user named filter+sort
--            presets for entity list pages.
--
-- One row per saved view. `entity` discriminates which list page the
-- view belongs to (a view named "High-priority Q4" only makes sense
-- on /deals; the same name on /contacts is a different row). filters
-- and sort are JSONB so the schema doesn't have to track per-page
-- filter shape — the entity page knows how to interpret its own
-- payload. ON DELETE CASCADE so deleted accounts leave no orphans.
--
-- Storage convention used by the v1 helpers:
--   * filters: Record<string, string> mirroring URL searchParams
--     (excluding sort/dir). Empty {} means "no filters set, just a
--     bare list view".
--   * sort: { key: string, dir: "asc" | "desc" } | null. Only deals
--     uses it currently; other entities pass NULL.
--
-- RLS: each user manages only their own views. No cross-user share
-- in v1 — that's a 2.2-multi-user feature.
--
-- Reversibility: DROP TABLE public.saved_views CASCADE.
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.

CREATE TABLE public.saved_views (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity      text         NOT NULL CHECK (entity IN ('deals', 'contacts', 'companies', 'tasks')),
  name        text         NOT NULL,
  filters     jsonb        NOT NULL DEFAULT '{}'::jsonb,
  sort        jsonb,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Lookup index for "give me this user's views for this entity" —
-- the dominant query pattern (every entity list page does this on
-- render).
CREATE INDEX saved_views_user_entity_idx
  ON public.saved_views (user_id, entity);

CREATE TRIGGER saved_views_set_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved views"
  ON public.saved_views
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
