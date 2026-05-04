-- Migration: 0012_user_preferences
-- Purpose:   Release 2.1 Phase 28 — per-user preferences (display
--            name, avatar URL, default deal view, stale threshold).
--
-- Lives at the auth.users grain (one row per signed-in user). Keys
-- back via ON DELETE CASCADE so a deleted account leaves no orphan
-- preferences. RLS scopes by auth.uid() exactly like every other
-- entity table in this schema.
--
-- First-time-user contract: no row is auto-created on signup. The
-- profile page renders sensible defaults (display_name = email
-- local-part, default view = "table", threshold = 7 from
-- STALE_THRESHOLD_DEFAULT_DAYS) when getUserPreferences returns
-- null. The first save creates the row via UPSERT.
--
-- Phase 28 also provisions a Supabase Storage bucket "avatars"
-- (public, 2 MB max, image/jpeg|png|webp). Bucket policies are
-- applied separately via the SQL editor — see the Phase 28
-- handover or commit body for the full SQL.
--
-- Reversibility: DROP TABLE public.user_preferences CASCADE; (the
-- updated_at trigger function comes from 0001 and stays put).
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.

CREATE TABLE public.user_preferences (
  user_id              uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name         text,
  avatar_url           text,
  default_deal_view    text         CHECK (default_deal_view IN ('table', 'groups', 'kanban')),
  stale_threshold_days integer      CHECK (stale_threshold_days BETWEEN 1 AND 365) DEFAULT 7,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

-- Reuses the shared updated_at trigger function from 0001.
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: a single ALL-policy scoped to the row owner. Same shape as every
-- other entity table in this schema.
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
