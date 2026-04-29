-- Migration: 0003_companies
-- Purpose:   Add the companies table for Release 2.0.
--
-- Companies are optional throughout 2.0's data model — Contacts and Deals
-- can each exist without one. This table holds the org-level information
-- that multiple Contacts / Deals can share by reference.
--
-- The set_updated_at() trigger function from 0001 is reused.

CREATE TABLE public.companies (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text          NOT NULL,
  website      text,
  industry     text,
  phone        text,
  email        text,
  address      text,
  size_range   text          CHECK (
                               size_range IS NULL
                               OR size_range IN ('1-10', '11-50', '51-200', '201-1000', '1000+')
                             ),
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX companies_user_id_idx ON public.companies (user_id);
-- Case-insensitive index on name. Used during the 0008 data migration
-- ("find or create company by name per user_id") and for search/sort
-- by name later.
CREATE INDEX companies_name_lower_idx ON public.companies (lower(name));

CREATE TRIGGER companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own companies"
  ON public.companies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
