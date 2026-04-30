-- Migration: 0009_drop_customers
-- Purpose:   Final step of Release 2.0's schema migration. Drops the legacy
--            customers table, the notes.customer_id column, and the
--            _migrated_from_customer_id marker on contacts. Simplifies the
--            polymorphic notes CHECK and ownership trigger to three FKs.
--
-- Pre-conditions (verified before applying):
--   * Migration 0008 ran cleanly. All customer rows were re-parented into
--     contacts (1:1) and deals (1:1), with notes either re-pointed to the
--     deal or kept on the customer (notes that didn't fit the migration
--     pattern). Pre-migration counts in 0008's footer matched post-migration.
--   * No application code references the customers table after Phase 16.
--     /customers and /customers/[id] became 307 redirects to /deals; the
--     customers/* components, server actions, and the dashboard's customer
--     stat cards were deleted in commit 89169ea.
--   * The application's deployed build (commit 3d22c46 on Vercel) has been
--     manually verified by the user to work end-to-end without the customers
--     table — login, all four entity routes, note CRUD across the three
--     remaining parent types.
--   * Pre-drop CSV backups of `customers` and `notes` (rows where
--     customer_id IS NOT NULL) were taken on 2026-04-30, locally. Not
--     committed.
--
-- Strategy:
--   * Five ordered steps. Each is independently safe but the order matters:
--       (1) Drop the four-FK CHECK constraint on notes — otherwise step (2)
--           can't proceed (the constraint mentions customer_id).
--       (2) Drop notes.customer_id. This also drops the FK reference to
--           customers, so by step (6) there are no inbound FKs left.
--       (3) Re-add the CHECK constraint with the three-FK shape. From this
--           point onward, every notes row must reference exactly one of
--           company / contact / deal.
--       (4) Replace notes_check_ownership() with a three-branch version.
--           CREATE OR REPLACE keeps the trigger object from 0001 attached;
--           no DROP TRIGGER / CREATE TRIGGER dance needed.
--       (5) Drop the marker column + index on contacts. They served only as
--           an audit trail during the 0008 migration window.
--       (6) DROP TABLE public.customers CASCADE. The CASCADE handles the
--           RLS policy from 0002 and the customers_set_updated_at trigger
--           defensively — the FK from notes is already gone after step (2).
--           The shared set_updated_at() function survives (other tables
--           still use it).
--
-- This migration is IRREVERSIBLE. Once step (6) runs, the customers table
-- and any data still in it (notes that were intentionally left on the
-- customer arm by 0008) are permanently gone. The pre-drop backup is the
-- only recovery path.
--
-- Post-apply: regenerate Supabase types in the next commit
-- (`pnpm dlx supabase gen types typescript`). Expected diff:
--   * `customers` removed from Database['public']['Tables'].
--   * `notes` row no longer has `customer_id`.
--   * `contacts` row no longer has `_migrated_from_customer_id`.

-- -----------------------------------------------------------------------------
-- (1) Drop the four-FK CHECK so we can drop the column it references.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notes
  DROP CONSTRAINT IF EXISTS notes_exactly_one_parent;

-- -----------------------------------------------------------------------------
-- (2) Drop the customer_id column (and its FK to customers) from notes.
--     The supporting partial index from 0007 used company_id / contact_id /
--     deal_id, not customer_id, so nothing to drop alongside.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notes
  DROP COLUMN IF EXISTS customer_id;

-- -----------------------------------------------------------------------------
-- (3) Re-add the CHECK on the three-FK shape. The expression's structure is
--     identical to 0007's — just one fewer term in the sum.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notes
  ADD CONSTRAINT notes_exactly_one_parent
  CHECK (
    (company_id IS NOT NULL)::int +
    (contact_id IS NOT NULL)::int +
    (deal_id    IS NOT NULL)::int
    = 1
  );

-- -----------------------------------------------------------------------------
-- (4) Replace notes_check_ownership() with a three-branch version. The
--     trigger object from 0001 (notes_check_ownership_trigger) keeps its
--     name and target — only the function body changes. CREATE OR REPLACE
--     under the same name picks up automatically.
--
--     The customer branch is gone; the ELSE branch's error message is
--     updated to reflect the three remaining parent types. The CHECK
--     constraint already guarantees exactly one FK is set, but we still
--     raise explicitly so a future bug (constraint accidentally dropped,
--     etc.) doesn't silently let parentless notes through.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notes_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_user_id uuid;
  parent_label   text;
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.companies WHERE id = NEW.company_id;
    parent_label := format('company %s', NEW.company_id);
  ELSIF NEW.contact_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.contacts WHERE id = NEW.contact_id;
    parent_label := format('contact %s', NEW.contact_id);
  ELSIF NEW.deal_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.deals WHERE id = NEW.deal_id;
    parent_label := format('deal %s', NEW.deal_id);
  ELSE
    RAISE EXCEPTION
      'notes must reference exactly one parent (company/contact/deal)';
  END IF;

  IF parent_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'notes.user_id must match parent user_id (% owned by %, note claims %)',
      parent_label, parent_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- (5) Drop the migration marker column + its partial index from contacts.
--     These existed only to provide an audit trail while 0008 was in the
--     process-of-being-applied window. With customers gone in (6), there's
--     nothing left to point back to anyway.
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS contacts_migrated_from_customer_idx;

ALTER TABLE public.contacts
  DROP COLUMN IF EXISTS _migrated_from_customer_id;

-- -----------------------------------------------------------------------------
-- (6) Final step: drop the customers table.
--
--     CASCADE drops the RLS policy "Users can manage own customers" (0002),
--     the customers_set_updated_at trigger (0001), and the
--     customers_user_id_idx / customers_status_idx indexes (0001). The
--     shared public.set_updated_at() function is NOT dropped — it's still
--     used by companies, contacts, and deals.
--
--     After this point, the customers table is permanently gone.
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.customers CASCADE;
