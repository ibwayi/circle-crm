-- Migration: 0004_contacts
-- Purpose:   Add the contacts table.
--
-- Contacts are people. They CAN belong to a Company (company_id is
-- nullable — supports private contacts and freelancers). last_name is
-- nullable to allow mononym contacts.
--
-- Cross-table ownership: when company_id is set, the linked company must
-- belong to the same user. Mirrors the notes_check_ownership pattern from
-- 0001 (SECURITY DEFINER, IS DISTINCT FROM, BEFORE INSERT OR UPDATE).
-- When company_id is NULL the check is a no-op — the optional FK is
-- genuinely optional.

CREATE TABLE public.contacts (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    uuid         REFERENCES public.companies(id) ON DELETE SET NULL,
  first_name    text         NOT NULL,
  last_name     text,
  email         text,
  phone         text,
  position      text,
  linkedin_url  text,
  birthday      date,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX contacts_user_id_idx     ON public.contacts (user_id);
CREATE INDEX contacts_company_id_idx  ON public.contacts (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX contacts_email_lower_idx ON public.contacts (lower(email)) WHERE email IS NOT NULL;

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cross-table ownership: contact.user_id must match company.user_id when
-- company_id is set. SECURITY DEFINER lets the SELECT bypass RLS so the
-- check works even for service-role callers (which the data migration in
-- 0008 will use).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.contacts_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_user_id uuid;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO company_user_id
  FROM public.companies
  WHERE id = NEW.company_id;

  IF company_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'contacts.user_id must match companies.user_id (company % is owned by %, contact claims %)',
      NEW.company_id, company_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER contacts_check_ownership_trigger
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.contacts_check_ownership();

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts"
  ON public.contacts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
