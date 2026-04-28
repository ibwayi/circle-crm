-- Migration: 0001_init_schema
-- Purpose:   Initial schema for Circle CRM.
--
-- Creates:
--   * public.set_updated_at()        — reusable trigger function that
--                                       stamps updated_at on every row
--                                       update.
--   * public.notes_check_ownership() — enforces notes.user_id =
--                                       customers.user_id at the DB
--                                       layer (cross-table CHECK
--                                       constraints aren't supported in
--                                       Postgres, so this runs as a
--                                       BEFORE INSERT OR UPDATE trigger).
--   * public.customers               — one row per customer record,
--                                       owned by the authenticated user
--                                       (auth.users).
--   * public.notes                   — many-to-one notes attached to a
--                                       customer, also owned by the user.
--
-- Notes:
--   * gen_random_uuid() is built into Postgres 13+ — no extension needed.
--   * Row Level Security is enabled in the next migration (0002_rls.sql);
--     this file only sets up structure, indexes, and triggers.

-- -----------------------------------------------------------------------------
-- Reusable trigger: keep updated_at fresh on UPDATE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text           NOT NULL,
  email       text,
  phone       text,
  company     text,
  status      text           NOT NULL DEFAULT 'lead'
                             CHECK (status IN ('lead', 'customer', 'closed')),
  value_eur   numeric(10, 2),
  created_at  timestamptz    NOT NULL DEFAULT now(),
  updated_at  timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX customers_user_id_idx ON public.customers (user_id);
CREATE INDEX customers_status_idx  ON public.customers (status);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notes
-- -----------------------------------------------------------------------------
CREATE TABLE public.notes (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid         NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       text         NOT NULL,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX notes_customer_id_idx ON public.notes (customer_id);
CREATE INDEX notes_user_id_idx     ON public.notes (user_id);

-- -----------------------------------------------------------------------------
-- Cross-table ownership check: notes.user_id must match customers.user_id.
--
-- Postgres CHECK constraints can't reference another table, so we enforce
-- the invariant via a trigger. RLS already prevents normal user sessions
-- from inserting a note against someone else's customer (via the WITH CHECK
-- on notes plus the USING on customers), but service-role connections
-- (seed scripts, admin tasks) bypass RLS — this trigger runs regardless
-- and protects ownership consistency at the database layer.
--
-- SECURITY DEFINER lets the function read customers without RLS so the
-- check works even when the calling session can't see the row directly
-- (which would otherwise return NULL and slip past the comparison).
-- IS DISTINCT FROM treats the missing-customer case as a mismatch and
-- raises, instead of silently passing.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notes_check_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_user_id uuid;
BEGIN
  SELECT user_id INTO customer_user_id
  FROM public.customers
  WHERE id = NEW.customer_id;

  IF customer_user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION
      'notes.user_id must match customers.user_id (customer % is owned by %, note claims %)',
      NEW.customer_id, customer_user_id, NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notes_check_ownership_trigger
  BEFORE INSERT OR UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.notes_check_ownership();
