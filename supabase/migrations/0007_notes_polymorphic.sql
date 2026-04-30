-- Migration: 0007_notes_polymorphic
-- Purpose:   Extend `notes` so each row can attach to a company, contact,
--            or deal — in addition to the legacy customer link.
--
-- Post-apply note (2026-04-30, after 0008 failed):
--   This migration missed making `notes.customer_id` nullable. The CHECK
--   constraint added below allows customer_id to be NULL when one of the
--   other three FKs is set, but the original 0001 schema declared
--   customer_id NOT NULL. Both constraints together blocked 0008's
--   re-parenting UPDATE (`SET customer_id = NULL, deal_id = ...`) with a
--   NOT NULL violation. Fixed in 0007a_notes_nullable_customer_id.sql —
--   kept as a separate file so applied migrations stay immutable in the
--   audit trail.
--
-- Strategy:
--   * Add three nullable FKs (company_id, contact_id, deal_id) alongside
--     the existing customer_id. customer_id stays through the transition
--     window so existing notes keep their parent reference.
--   * Add a CHECK constraint that exactly ONE of the four FKs is non-null.
--     The tag-counting expression handles any combination uniformly:
--       (col IS NOT NULL)::int summed across all four columns must equal 1.
--   * Replace the cross-table ownership trigger from 0001
--     (notes_check_ownership) with a polymorphic version that looks up the
--     parent's user_id based on whichever FK is set.
--
-- This migration is REVERSIBLE — it adds columns + a constraint and
-- replaces a function body. Nothing is dropped or destroyed. If the
-- polymorphic shape causes problems we can drop the new columns and the
-- constraint, then re-CREATE OR REPLACE the function with the 0001 body.
--
-- 0008 will populate deal_id for existing notes and NULL out customer_id
-- in the same UPDATE (atomic per row, so the CHECK never sees both set).
-- 0009 (Phase 16.5) drops customer_id and the four-column constraint, and
-- replaces the trigger function with a three-FK version.

ALTER TABLE public.notes
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  ADD COLUMN deal_id    uuid REFERENCES public.deals(id)    ON DELETE CASCADE;

CREATE INDEX notes_company_id_idx ON public.notes (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX notes_contact_id_idx ON public.notes (contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX notes_deal_id_idx    ON public.notes (deal_id)    WHERE deal_id    IS NOT NULL;

ALTER TABLE public.notes
  ADD CONSTRAINT notes_exactly_one_parent
  CHECK (
    (customer_id IS NOT NULL)::int +
    (company_id  IS NOT NULL)::int +
    (contact_id  IS NOT NULL)::int +
    (deal_id     IS NOT NULL)::int
    = 1
  );

-- -----------------------------------------------------------------------------
-- Polymorphic ownership check. Replaces the customer-only function from
-- 0001 — the trigger created in 0001 (notes_check_ownership_trigger) is
-- already attached to the notes table and will pick up the new body
-- automatically since we CREATE OR REPLACE under the same name.
--
-- The CHECK constraint above already guarantees exactly one FK is set,
-- but we still raise explicitly in the no-parent branch so a future bug
-- (constraint accidentally dropped, etc.) doesn't silently let parentless
-- notes through.
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
  IF NEW.customer_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id FROM public.customers WHERE id = NEW.customer_id;
    parent_label := format('customer %s', NEW.customer_id);
  ELSIF NEW.company_id IS NOT NULL THEN
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
      'notes must reference exactly one parent (customer/company/contact/deal)';
  END IF;

  IF parent_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'notes.user_id must match parent user_id (% owned by %, note claims %)',
      parent_label, parent_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- The trigger from 0001 keeps its name and target — only the function
-- body changed via CREATE OR REPLACE above. No DROP/CREATE TRIGGER needed.
