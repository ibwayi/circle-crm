-- Migration: 0006_deal_contacts
-- Purpose:   M:N junction between deals and contacts.
--
-- A deal can have multiple contacts ("everyone involved in this deal"),
-- and one of them can be marked is_primary ("the main person"). The
-- "at most one primary per deal" invariant is enforced by a partial
-- UNIQUE index — cleaner than a CHECK because it works across rows.
--
-- user_id is denormalised onto the junction so RLS can match
-- `auth.uid() = user_id` without joining through deals or contacts.
-- The cross-table ownership trigger ensures the denormalisation stays
-- consistent: junction.user_id MUST equal deal.user_id AND
-- contact.user_id.

CREATE TABLE public.deal_contacts (
  deal_id     uuid         NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  contact_id  uuid         NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_primary  boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (deal_id, contact_id)
);

-- At-most-one primary contact per deal. Partial UNIQUE index because
-- (deal_id, is_primary=true) must be unique, but (deal_id, is_primary=false)
-- can repeat freely.
CREATE UNIQUE INDEX deal_contacts_one_primary_per_deal_idx
  ON public.deal_contacts (deal_id)
  WHERE is_primary = true;

-- "All deals this contact is part of" — hot lookup on the contact detail
-- page. (deal_id is already covered by the PK, no extra index needed.)
CREATE INDEX deal_contacts_contact_id_idx ON public.deal_contacts (contact_id);
CREATE INDEX deal_contacts_user_id_idx    ON public.deal_contacts (user_id);

-- -----------------------------------------------------------------------------
-- Cross-table ownership: junction.user_id MUST equal deal.user_id AND
-- contact.user_id. Same SECURITY DEFINER + IS DISTINCT FROM pattern as
-- notes_check_ownership in 0001 — the function reads through RLS so a
-- service-role caller (e.g. seed/migration scripts) is also enforced.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deal_contacts_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deal_user_id    uuid;
  contact_user_id uuid;
BEGIN
  SELECT user_id INTO deal_user_id
  FROM public.deals
  WHERE id = NEW.deal_id;

  IF deal_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'deal_contacts.user_id must match deals.user_id (deal % is owned by %, junction claims %)',
      NEW.deal_id, deal_user_id, NEW.user_id;
  END IF;

  SELECT user_id INTO contact_user_id
  FROM public.contacts
  WHERE id = NEW.contact_id;

  IF contact_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'deal_contacts.user_id must match contacts.user_id (contact % is owned by %, junction claims %)',
      NEW.contact_id, contact_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_contacts_check_ownership_trigger
  BEFORE INSERT OR UPDATE ON public.deal_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.deal_contacts_check_ownership();

ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deal contacts"
  ON public.deal_contacts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
