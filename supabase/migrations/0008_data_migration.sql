-- Migration: 0008_data_migration
-- Purpose:   Migrate existing 1.0 customers into the 2.0 four-entity model
--            (Companies, Contacts, Deals, deal_contacts) and re-parent
--            existing notes onto the newly-created Deals.
--
-- Mapping rules:
--   * customers.company (text) → companies.name (case-insensitive
--     find-or-create per user_id). NULL or empty → no Company link.
--   * customers.name → contacts.first_name + contacts.last_name (split
--     on the FIRST space; if no space, the whole string is first_name
--     and last_name is NULL). "Anna von der Heide" → first="Anna",
--     last="von der Heide" — multi-word German surnames survive intact.
--     "Mary Jane Smith" → first="Mary", last="Jane Smith" — middle
--     names are absorbed into last_name (we have no middle field).
--   * customers.email / phone carry over to contacts.
--   * customers.value_eur → deals.value_eur. customers.created_at /
--     updated_at carry over to BOTH the contact AND the deal. For
--     won/lost migrated deals, deals.closed_at = customers.updated_at
--     so the original close dates are preserved (see "closed_at
--     handling" below).
--   * customers.status maps to deals.stage:
--       lead     → lead
--       customer → won
--       closed   → lost     ⚠ IMPERFECT mapping. 1.0's "closed" was
--                          ambiguous (could mean "deal won" or "deal
--                          dropped"). Defaulting to lost; the user
--                          should review migrated 'lost' deals
--                          manually post-migration and flip to 'won'
--                          where appropriate.
--   * Each customer becomes one Contact + one Deal + one
--     deal_contacts(is_primary=true) row. The migrated contact is
--     THE primary for the migrated deal.
--   * Existing notes with customer_id set get re-parented atomically:
--       UPDATE notes SET deal_id = <new deal>, customer_id = NULL
--     The four-column CHECK from 0007 never sees an intermediate state
--     because per-row UPDATE in Postgres is atomic on column values.
--
-- Idempotency:
--   A marker column `_migrated_from_customer_id` is added to contacts
--   (IF NOT EXISTS, so re-runs of this script don't fail). Each newly
--   created contact stores the source customer.id in this column.
--   Subsequent runs skip customers whose marker already exists in
--   contacts. The column survives THIS migration (deviation from the
--   T-14.7 spec which suggested dropping at end) — Phase 16.5's 0009
--   drops it together with customer_id and the customers table itself,
--   so the cleanup happens in one place. This makes 0008 truly safe to
--   re-run: ADD COLUMN IF NOT EXISTS handles "marker already there",
--   and the per-customer EXISTS check handles "this customer is done."
--
-- closed_at handling:
--   For migrated won/lost deals we want closed_at = customers.updated_at
--   (the user's actual historical close date), not the migration
--   timestamp. The deals_set_closed_at_trigger from 0005 would otherwise
--   overwrite the explicit value with now() because its
--   "OLD.stage IS NULL → set closed_at = now()" branch fires on every
--   INSERT into won/lost. To keep our explicit timestamp, the trigger
--   is DISABLED before the loop and ENABLED after. The DO block's
--   implicit transaction ensures the trigger state reverts cleanly if
--   any iteration raises.
--
-- Atomicity:
--   The whole DO $$ ... END $$ block runs in a single implicit
--   transaction. Any failure rolls back the entire migration — either
--   ALL customers migrate or NONE do.
--
-- Safety:
--   This migration does NOT drop the customers table or the
--   notes.customer_id column. Phase 16.5's 0009 does that, after the
--   app has been switched away from /customers in Phase 16.

-- -----------------------------------------------------------------------------
-- Idempotency marker on contacts. Just a uuid column for tracking; no FK
-- so it survives the customers table dropping in 0009.
-- -----------------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS _migrated_from_customer_id uuid;

CREATE INDEX IF NOT EXISTS contacts_migrated_from_customer_idx
  ON public.contacts (_migrated_from_customer_id)
  WHERE _migrated_from_customer_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Per-customer migration loop. PL/pgSQL gives us variables, conditional
-- skipping, and RAISE NOTICE for run-time visibility.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_customer            public.customers%ROWTYPE;
  v_clean_name          text;
  v_first_name          text;
  v_last_name           text;
  v_first_space         int;
  v_company_clean       text;
  v_company_id          uuid;
  v_contact_id          uuid;
  v_deal_id             uuid;
  v_deal_stage          text;
  v_deal_closed_at      timestamptz;
  v_notes_updated       int;
  v_total               int := 0;
  v_migrated            int := 0;
  v_skipped_already     int := 0;
  v_skipped_invalid     int := 0;
  v_companies_created   int := 0;
  v_companies_reused    int := 0;
  v_total_notes_updated int := 0;
BEGIN
  -- Disable the closed_at automation trigger so we can write the
  -- preserved historical close dates explicitly. ALTER TABLE inside a
  -- transaction is transactional — if the loop raises, the trigger
  -- state reverts along with the data.
  ALTER TABLE public.deals DISABLE TRIGGER deals_set_closed_at_trigger;

  FOR v_customer IN
    SELECT * FROM public.customers ORDER BY created_at
  LOOP
    v_total := v_total + 1;

    -- Already migrated? Skip.
    IF EXISTS (
      SELECT 1 FROM public.contacts
      WHERE _migrated_from_customer_id = v_customer.id
    ) THEN
      v_skipped_already := v_skipped_already + 1;
      CONTINUE;
    END IF;

    -- ---- Name handling ---------------------------------------------------
    v_clean_name := trim(v_customer.name);
    IF v_clean_name = '' THEN
      RAISE NOTICE 'Skipping customer % — empty name', v_customer.id;
      v_skipped_invalid := v_skipped_invalid + 1;
      CONTINUE;
    END IF;

    v_first_space := position(' ' in v_clean_name);
    IF v_first_space > 0 THEN
      v_first_name := substring(v_clean_name from 1 for v_first_space - 1);
      v_last_name  := trim(substring(v_clean_name from v_first_space + 1));
      IF v_last_name = '' THEN
        v_last_name := NULL;
      END IF;
    ELSE
      -- Mononym contact ("Anna" with no space).
      v_first_name := v_clean_name;
      v_last_name  := NULL;
    END IF;

    -- ---- Company find-or-create ------------------------------------------
    v_company_id := NULL;
    v_company_clean := trim(coalesce(v_customer.company, ''));
    IF v_company_clean <> '' THEN
      SELECT id INTO v_company_id
      FROM public.companies
      WHERE user_id = v_customer.user_id
        AND lower(name) = lower(v_company_clean)
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO public.companies (user_id, name)
        VALUES (v_customer.user_id, v_company_clean)
        RETURNING id INTO v_company_id;
        v_companies_created := v_companies_created + 1;
      ELSE
        v_companies_reused := v_companies_reused + 1;
      END IF;
    END IF;

    -- ---- Contact ---------------------------------------------------------
    INSERT INTO public.contacts (
      user_id,
      company_id,
      first_name,
      last_name,
      email,
      phone,
      created_at,
      updated_at,
      _migrated_from_customer_id
    )
    VALUES (
      v_customer.user_id,
      v_company_id,
      v_first_name,
      v_last_name,
      v_customer.email,
      v_customer.phone,
      v_customer.created_at,
      v_customer.updated_at,
      v_customer.id
    )
    RETURNING id INTO v_contact_id;

    -- ---- Stage mapping ---------------------------------------------------
    v_deal_stage := CASE v_customer.status
      WHEN 'lead'     THEN 'lead'
      WHEN 'customer' THEN 'won'
      WHEN 'closed'   THEN 'lost'
      ELSE 'lead'  -- defensive: future status values default to lead
    END;

    -- For won/lost deals, preserve the original customers.updated_at as
    -- the historical close date. For active stages closed_at is NULL.
    -- The trigger that would normally manage this column is disabled
    -- around the loop (see top of DO block).
    v_deal_closed_at := CASE
      WHEN v_deal_stage IN ('won', 'lost') THEN v_customer.updated_at
      ELSE NULL
    END;

    -- ---- Deal ------------------------------------------------------------
    INSERT INTO public.deals (
      user_id,
      company_id,
      title,
      value_eur,
      stage,
      priority,
      closed_at,
      created_at,
      updated_at
    )
    VALUES (
      v_customer.user_id,
      v_company_id,
      v_clean_name || ' — Deal',
      v_customer.value_eur,
      v_deal_stage,
      'medium',
      v_deal_closed_at,
      v_customer.created_at,
      v_customer.updated_at
    )
    RETURNING id INTO v_deal_id;

    -- ---- Junction: migrated contact is THE primary for the migrated deal
    INSERT INTO public.deal_contacts (
      deal_id,
      contact_id,
      user_id,
      is_primary,
      created_at
    )
    VALUES (
      v_deal_id,
      v_contact_id,
      v_customer.user_id,
      true,
      v_customer.created_at
    );

    -- ---- Re-parent notes -------------------------------------------------
    -- Per-row UPDATE is atomic on column values, so the four-column
    -- CHECK never sees both customer_id and deal_id non-null
    -- simultaneously.
    UPDATE public.notes
    SET deal_id     = v_deal_id,
        customer_id = NULL
    WHERE customer_id = v_customer.id;

    GET DIAGNOSTICS v_notes_updated = ROW_COUNT;
    v_total_notes_updated := v_total_notes_updated + v_notes_updated;

    v_migrated := v_migrated + 1;
  END LOOP;

  -- Restore the closed_at automation for ongoing app operation.
  ALTER TABLE public.deals ENABLE TRIGGER deals_set_closed_at_trigger;

  RAISE NOTICE
    'Migration summary: % seen, % migrated, % skipped (already), % skipped (invalid), % companies created, % companies reused, % notes re-parented',
    v_total,
    v_migrated,
    v_skipped_already,
    v_skipped_invalid,
    v_companies_created,
    v_companies_reused,
    v_total_notes_updated;
END
$$;

-- -----------------------------------------------------------------------------
-- Optional post-run sanity checks (uncomment to inspect interactively):
--
-- SELECT count(*) AS customers_total                 FROM public.customers;
-- SELECT count(*) AS contacts_from_migration         FROM public.contacts WHERE _migrated_from_customer_id IS NOT NULL;
-- SELECT count(*) AS deals_total                     FROM public.deals;
-- SELECT count(*) AS junction_rows                   FROM public.deal_contacts;
-- SELECT count(*) AS notes_still_on_customer         FROM public.notes WHERE customer_id IS NOT NULL;  -- expect 0 after migration
-- SELECT count(*) AS notes_now_on_deal               FROM public.notes WHERE deal_id     IS NOT NULL;
-- SELECT stage, count(*) FROM public.deals GROUP BY stage ORDER BY stage;
