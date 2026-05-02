-- Migration: 0011_tasks_simplify
-- Purpose:   Release 2.1 Phase 24.7 — collapse the tasks polymorphism
--            from {deal, contact, company, standalone} down to
--            {deal, standalone}.
--
-- Why now (post-Phase-24.6 smoke test):
--   The 3-parent model produced UI confusion that the context-aware
--   auto-fill in 24.6 papered over but never solved. In practice ~95%
--   of "task on a contact/company" intentions are really "task on the
--   deal that involves that contact/company". Promoting Deal to the
--   sole structural parent — and surfacing Company + Primary Contact
--   as *transitive* read-only context derived from the deal — gives a
--   simpler mental model with the same information density.
--
-- Effect on existing rows:
--   * Tasks with deal_id set        → unchanged (still deal-tasks).
--   * Tasks with contact_id set     → demoted to standalone (the
--                                     contact_id column disappears;
--                                     title/notes/due/priority survive).
--   * Tasks with company_id set     → demoted to standalone (same).
--   * Tasks with no parent          → unchanged (still standalone).
--
-- Pre-flight (counted manually before applying):
--   deal_tasks       = 0
--   contact_tasks    = 0
--   company_tasks    = 0
--   standalone_tasks = 1
--   → zero rows lose a parent link. The single standalone task is
--     unaffected.
--
-- This migration is DESTRUCTIVE for non-deal task parents (DROP COLUMN
-- removes the data unconditionally). For dev environments that's fine
-- given the pre-flight counts; for any environment with non-zero
-- contact/company tasks, take a backup first.
--
-- REVERSIBILITY: partial. The columns and indexes can be re-added with
-- 0010's definitions, and the 3-branch ownership trigger can be
-- restored from 0010. But the contact_id / company_id values that were
-- on rows at apply-time are gone — re-adding the columns gives NULL
-- everywhere. If a rollback is ever needed, restore tasks data from
-- the pre-migration backup, not from the schema alone.

-- -----------------------------------------------------------------------------
-- 1. Drop the at-most-one CHECK. With contact_id and company_id gone,
--    deal_id is the only nullable parent FK and needs no CHECK — NULL
--    means standalone, non-NULL means deal-task, both are valid.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_at_most_one_parent;

-- -----------------------------------------------------------------------------
-- 2. Drop the partial FK indexes for contact_id / company_id, then the
--    columns themselves. Indexes are dropped first because Postgres
--    drops them implicitly with the column anyway, but being explicit
--    documents the cleanup and matches the 0007/0010 index-naming style.
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.tasks_contact_id_idx;
DROP INDEX IF EXISTS public.tasks_company_id_idx;

ALTER TABLE public.tasks DROP COLUMN IF EXISTS contact_id;
ALTER TABLE public.tasks DROP COLUMN IF EXISTS company_id;

-- -----------------------------------------------------------------------------
-- 3. Rebuild the cross-table ownership trigger function. The 3-branch
--    IF/ELSIF chain from 0010 collapses to a single deal lookup with
--    an early return for the standalone case.
--
--    SECURITY DEFINER + search_path stay the same — the function still
--    needs to read public.deals across RLS during seeding/imports.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tasks_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
BEGIN
  -- Standalone task — no parent to validate against.
  IF NEW.deal_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO parent_user_id FROM public.deals WHERE id = NEW.deal_id;

  IF parent_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'tasks.user_id must match parent deal user_id (deal % owned by %, task claims %)',
      NEW.deal_id, parent_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger binding from 0010 (tasks_check_ownership_trigger) keeps
-- pointing at the same function name — CREATE OR REPLACE rewrites the
-- body in place, so no DROP/CREATE TRIGGER dance is needed.
