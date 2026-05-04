-- Migration: 0014_tasks_status
-- Purpose:   Release 2.1 Phase 29.5 — replace tasks.completed_at as
--            the sole status indicator with a 3-state status field.
--            open / in_progress / completed.
--
-- Mapping for existing rows:
--   completed_at IS NOT NULL → status='completed'
--   completed_at IS NULL     → status='open'
--   (No equivalent for in_progress in the old data — backfill is
--   binary; users move tasks into in_progress manually post-migration.)
--
-- completed_at COLUMN STAYS — it still records WHEN a task was
-- completed (handy for "completed in the last 7 days" queries and
-- for an eventual activity timeline). The semantics shift: status
-- becomes the source of truth; completed_at is metadata derived by
-- setTaskStatus(id, 'completed') in the helper layer.
--
-- Reversibility: drop tasks.status; the existing completed_at
-- semantics are preserved untouched.
--
-- This migration was applied manually via the Supabase SQL editor;
-- this file is the historical record matching that apply.

-- 1. Add the status column with a CHECK constraint.
ALTER TABLE public.tasks
  ADD COLUMN status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'completed'));

-- 2. Backfill from completed_at. After this every existing row has
--    a coherent status that matches its completion timestamp.
UPDATE public.tasks
  SET status = CASE
    WHEN completed_at IS NOT NULL THEN 'completed'
    ELSE 'open'
  END;

-- 3. Index for the dominant query pattern: "give me open AND
--    in_progress tasks" (the /tasks tabs except Erledigt). B-tree
--    on a low-cardinality enum is acceptable at portfolio scale.
CREATE INDEX tasks_status_idx ON public.tasks (status);
