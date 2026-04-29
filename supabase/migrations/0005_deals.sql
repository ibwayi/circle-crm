-- Migration: 0005_deals
-- Purpose:   Add the deals table — pipeline opportunities.
--
-- Deals optionally link to one Company (company_id nullable). The M:N
-- relationship to Contacts is captured in the deal_contacts junction
-- (0006). Stage is a six-value text+CHECK union — same modelling style
-- as 1.0's customers.status; CHECK is easier to alter than a Postgres
-- ENUM if we ever want to add a stage.
--
-- value_eur is numeric(12, 2) — wider than customers.value_eur(10,2)
-- since real B2B deals can run into the millions.
--
-- Two triggers fire on this table:
--   1. set_updated_at  — reuses the 0001 function.
--   2. set_closed_at   — symmetric: enters won/lost → closed_at = now();
--                        leaves won/lost (rare reopen) → closed_at = NULL.
--                        Fires on INSERT too so a deal created directly
--                        in won/lost (e.g. backfill) is internally
--                        consistent.

CREATE TABLE public.deals (
  id                    uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id            uuid         REFERENCES public.companies(id) ON DELETE SET NULL,
  title                 text         NOT NULL,
  value_eur             numeric(12, 2),
  stage                 text         NOT NULL DEFAULT 'lead'
                                     CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  priority              text         NOT NULL DEFAULT 'medium'
                                     CHECK (priority IN ('low', 'medium', 'high')),
  source                text,
  expected_close_date   date,
  probability           smallint     CHECK (probability IS NULL OR (probability >= 0 AND probability <= 100)),
  closed_at             timestamptz,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX deals_user_id_idx              ON public.deals (user_id);
CREATE INDEX deals_stage_idx                ON public.deals (stage);
CREATE INDEX deals_company_id_idx           ON public.deals (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX deals_expected_close_date_idx  ON public.deals (expected_close_date)
  WHERE expected_close_date IS NOT NULL;

CREATE TRIGGER deals_set_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- closed_at automation. Symmetric so a reopened won deal doesn't keep a
-- stale close timestamp. On INSERT, OLD is NULL — handled by the explicit
-- `OLD.stage IS NULL OR ...` branch. On `BEFORE UPDATE OF stage` the
-- trigger only fires when stage actually changes, so unrelated UPDATEs
-- (e.g. editing title) don't pay the trigger cost.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deals_set_closed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.stage IN ('won', 'lost')
     AND (OLD.stage IS NULL OR OLD.stage NOT IN ('won', 'lost')) THEN
    NEW.closed_at := now();
  ELSIF NEW.stage NOT IN ('won', 'lost')
        AND OLD.stage IS NOT NULL
        AND OLD.stage IN ('won', 'lost') THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_set_closed_at_trigger
  BEFORE INSERT OR UPDATE OF stage ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.deals_set_closed_at();

-- -----------------------------------------------------------------------------
-- Cross-table ownership: deal.user_id must match company.user_id when
-- company_id is set.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deals_check_ownership()
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
      'deals.user_id must match companies.user_id (company % is owned by %, deal claims %)',
      NEW.company_id, company_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_check_ownership_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.deals_check_ownership();

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own deals"
  ON public.deals
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
