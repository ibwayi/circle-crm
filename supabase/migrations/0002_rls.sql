-- Migration: 0002_rls
-- Purpose:   Row Level Security — per-user data isolation enforced
--            at the database layer.
--
-- Strategy:
--   Every row in customers and notes carries a user_id (FK to
--   auth.users). RLS policies restrict each session to rows it owns,
--   so even if the API code has a bug, the database refuses to leak
--   another user's data. This is our second line of defense after
--   the typed query helpers in lib/db/.
--
-- Coverage:
--   * FOR ALL covers SELECT, INSERT, UPDATE, DELETE.
--   * USING       — gates which rows a session can see / mutate.
--   * WITH CHECK  — gates the row that an INSERT/UPDATE wants to
--                   write. Specified explicitly even though it would
--                   default to USING — this makes the intent obvious
--                   to anyone reading the migration.

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own customers"
  ON public.customers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own notes"
  ON public.notes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
