-- Migration: 0010_tasks
-- Purpose:   Release 2.1 Phase 23 — add the `tasks` table for the
--            Tasks/Reminders feature ("Wiedervorlage").
--
-- Tasks are polymorphic: each task can attach to AT MOST one parent of
-- {deal, contact, company}. Standalone tasks (no parent) are valid — they
-- represent the user's personal todos, not tied to any CRM entity.
--
-- This is the at-most-one variant of the polymorphic FK pattern. ADR-010
-- documented the exactly-one variant for notes (notes always have a
-- parent). The two flavours share the same shape — three nullable FKs +
-- a CHECK constraint counting non-nulls — they differ only in the
-- comparison: notes use `= 1`, tasks use `<= 1`.
--
-- Other design choices, mirrored from the 2.0 schema:
--   * `set_updated_at` trigger reuses the shared function from 0001.
--   * Cross-table ownership trigger mirrors the 3-branch
--     `notes_check_ownership` from 0009, with an early return for the
--     standalone case (no parent → nothing to validate).
--   * `completed_at` is helper-managed, NOT trigger-managed. Per Phase 23
--     spec, the `completeTask(id)` and `uncompleteTask(id)` helpers do
--     the SET/clear explicitly. This differs from `deals.closed_at`
--     (0005), which is trigger-stamped on stage transitions — tasks
--     don't have a stage to transition through, just a binary flag.
--
-- This migration is REVERSIBLE. To undo:
--   DROP TABLE public.tasks CASCADE;  -- drops the trigger function too
--                                     -- (it's tasks-specific, unlike
--                                     -- the shared set_updated_at).

CREATE TABLE public.tasks (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text         NOT NULL,
  notes         text,
  due_date      date,
  due_time      time,
  completed_at  timestamptz,
  priority      text         NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high')),
  deal_id       uuid         REFERENCES public.deals(id)     ON DELETE CASCADE,
  contact_id    uuid         REFERENCES public.contacts(id)  ON DELETE CASCADE,
  company_id    uuid         REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),

  -- At-most-one parent. The structure mirrors notes_exactly_one_parent
  -- (0009) — same column-count expression, different comparison. A row
  -- with all three FKs NULL is a standalone task; rows with two or three
  -- FKs set are rejected.
  CONSTRAINT tasks_at_most_one_parent CHECK (
    (deal_id    IS NOT NULL)::int +
    (contact_id IS NOT NULL)::int +
    (company_id IS NOT NULL)::int
    <= 1
  )
);

-- Indexes:
--   * user_id        — RLS scans every read; full B-tree is mandatory.
--   * due_date       — drives "due today / overdue / upcoming" queries
--                      from getTaskStats. Nullable column; B-tree on a
--                      nullable column still uses the index for IS NULL
--                      checks (Postgres ≥ 8.3).
--   * completed_at   — separates open from done. Same index works for
--                      both `IS NULL` (open) and `IS NOT NULL` (done)
--                      filters.
--   * deal/contact/company_id — partial indexes (WHERE NOT NULL) because
--     the polymorphic shape means most rows have NULL for any given FK.
--     Same pattern as notes' partial FK indexes from 0007.
CREATE INDEX tasks_user_id_idx       ON public.tasks (user_id);
CREATE INDEX tasks_due_date_idx      ON public.tasks (due_date);
CREATE INDEX tasks_completed_at_idx  ON public.tasks (completed_at);
CREATE INDEX tasks_deal_id_idx       ON public.tasks (deal_id)    WHERE deal_id    IS NOT NULL;
CREATE INDEX tasks_contact_id_idx    ON public.tasks (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX tasks_company_id_idx    ON public.tasks (company_id) WHERE company_id IS NOT NULL;

-- updated_at trigger reuses the shared function from 0001.
CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cross-table ownership check. Walks the FK that's set (if any) and
-- verifies the parent's user_id matches NEW.user_id. The standalone case
-- (all three FKs NULL) returns early — there's nothing to validate.
--
-- Mirrors notes_check_ownership() from 0009 (the simplified 3-branch
-- version). Difference: the notes trigger raises in the "no parent"
-- branch (notes always have a parent — enforced by `= 1` CHECK). Tasks
-- accept "no parent" as valid via the early return.
--
-- SECURITY DEFINER so the function reads the parent table even when
-- the caller's RLS would normally deny it (e.g. service-role insertions
-- during seeding). The CHECK constraint above already guarantees at
-- most one FK is set, so the IF / ELSIF chain is unambiguous.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tasks_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
  parent_label   text;
BEGIN
  -- Standalone task — no parent to validate against.
  IF NEW.deal_id IS NULL
     AND NEW.contact_id IS NULL
     AND NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.deal_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.deals WHERE id = NEW.deal_id;
    parent_label := format('deal %s', NEW.deal_id);
  ELSIF NEW.contact_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.contacts WHERE id = NEW.contact_id;
    parent_label := format('contact %s', NEW.contact_id);
  ELSE
    -- company_id is non-NULL by elimination (the CHECK guarantees at
    -- most one is set, and the standalone branch handled all-NULL).
    SELECT user_id INTO parent_user_id FROM public.companies WHERE id = NEW.company_id;
    parent_label := format('company %s', NEW.company_id);
  END IF;

  IF parent_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'tasks.user_id must match parent user_id (% owned by %, task claims %)',
      parent_label, parent_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_check_ownership_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_check_ownership();

-- -----------------------------------------------------------------------------
-- RLS: a single ALL-policy scoped to the row owner. Same shape as every
-- other entity table in this schema.
-- -----------------------------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks"
  ON public.tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
