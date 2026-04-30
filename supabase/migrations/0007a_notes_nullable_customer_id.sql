-- Migration: 0007a_notes_nullable_customer_id
-- Purpose:   Fix gap in 0007 — make notes.customer_id nullable so the
--            polymorphic CHECK constraint can actually be satisfied
--            for non-customer-parented notes (company/contact/deal).
--
-- Why this wasn't caught in 0007 review: the CHECK constraint allows
-- customer_id to be NULL when one of the other three FKs is set, but
-- the original 0001 schema declared customer_id NOT NULL. Both
-- constraints together make it impossible to insert non-customer notes
-- AND impossible for 0008 to re-parent existing customer notes to deals.
--
-- Reversibility: trivial. ALTER COLUMN customer_id SET NOT NULL would
-- restore the original, but only if no rows have customer_id = NULL.

ALTER TABLE public.notes
  ALTER COLUMN customer_id DROP NOT NULL;
