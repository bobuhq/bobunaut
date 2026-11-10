-- BOBU Universe — Referral Cycle Security V2
-- Versioned snapshot of protections installed in production on 2026-11-10.
-- Security hardening: trigger functions execute with trusted owner permissions
-- so RLS cannot hide ancestor rows during cycle/consistency checks.
-- IMPORTANT: test in staging before applying to production; never edit old migrations.
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_referral_cycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cycle_exists boolean := false;
    v_old_referrer uuid;
    v_old_referred uuid;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.referrer_id IS NOT DISTINCT FROM OLD.referrer_id
           AND NEW.referred_id IS NOT DISTINCT FROM OLD.referred_id THEN
            RETURN NEW;
        END IF;
        v_old_referrer := OLD.referrer_id;
        v_old_referred := OLD.referred_id;
    END IF;

    IF NEW.referrer_id IS NULL OR NEW.referred_id IS NULL THEN
        RAISE EXCEPTION 'REFERRAL_INVALID_BUILDER' USING ERRCODE = '23514';
    END IF;
    IF NEW.referrer_id = NEW.referred_id THEN
        RAISE EXCEPTION 'REFERRAL_SELF_NOT_ALLOWED' USING ERRCODE = '23514';
    END IF;

    -- Shared transaction lock prevents concurrent inserts from creating a cycle.
    PERFORM pg_advisory_xact_lock(184612, 20261110);

    WITH RECURSIVE ancestry(builder_id, visited) AS (
        SELECT NEW.referrer_id, ARRAY[NEW.referrer_id]::uuid[]
        UNION ALL
        SELECT r.referrer_id, a.visited || r.referrer_id
        FROM ancestry a
        JOIN public.builder_referrals r ON r.referred_id = a.builder_id
        WHERE r.referrer_id <> ALL(a.visited)
          AND (
              v_old_referred IS NULL
              OR r.referred_id <> v_old_referred
              OR r.referrer_id <> v_old_referrer
          )
    )
    SELECT EXISTS (
        SELECT 1 FROM ancestry WHERE builder_id = NEW.referred_id
    ) INTO v_cycle_exists;

    IF v_cycle_exists THEN
        RAISE EXCEPTION 'REFERRAL_CYCLE_NOT_ALLOWED' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_referral_cycle_v1 ON public.builder_referrals;
CREATE TRIGGER prevent_referral_cycle_v1
BEFORE INSERT OR UPDATE OF referrer_id, referred_id
ON public.builder_referrals
FOR EACH ROW EXECUTE FUNCTION public.prevent_referral_cycle_v1();

CREATE OR REPLACE FUNCTION public.guard_builder_profile_referral_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cycle boolean := false;
BEGIN
    IF NEW.referred_by IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.builder_id = NEW.referred_by THEN
        RAISE EXCEPTION 'REFERRAL_SELF_NOT_ALLOWED' USING ERRCODE = '23514';
    END IF;

    PERFORM pg_advisory_xact_lock(184612, 20261110);

    WITH RECURSIVE ancestry(id, visited) AS (
        SELECT NEW.referred_by, ARRAY[NEW.referred_by]::uuid[]
        UNION ALL
        SELECT p.referred_by, a.visited || p.referred_by
        FROM ancestry a
        JOIN public.builder_profiles p ON p.builder_id = a.id
        WHERE p.referred_by IS NOT NULL
          AND p.referred_by <> ALL(a.visited)
    )
    SELECT EXISTS (
        SELECT 1 FROM ancestry WHERE id = NEW.builder_id
    ) INTO v_cycle;

    IF v_cycle THEN
        RAISE EXCEPTION 'REFERRAL_CYCLE_NOT_ALLOWED' USING ERRCODE = '23514';
    END IF;

    -- Invite attribution RPC inserts builder_referrals first, then updates profile.
    IF NOT EXISTS (
        SELECT 1 FROM public.builder_referrals r
        WHERE r.referred_id = NEW.builder_id
          AND r.referrer_id = NEW.referred_by
    ) THEN
        RAISE EXCEPTION 'REFERRAL_LINK_MISSING' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_builder_profile_referral_v2 ON public.builder_profiles;
CREATE TRIGGER guard_builder_profile_referral_v2
BEFORE INSERT OR UPDATE OF referred_by
ON public.builder_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_builder_profile_referral_v2();

CREATE OR REPLACE FUNCTION public.guard_referral_profile_consistency_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_referrer uuid;
BEGIN
    PERFORM pg_advisory_xact_lock(184612, 20261110);

    SELECT p.referred_by INTO v_profile_referrer
    FROM public.builder_profiles p
    WHERE p.builder_id = NEW.referred_id;

    IF v_profile_referrer IS NOT NULL
       AND v_profile_referrer <> NEW.referrer_id THEN
        RAISE EXCEPTION 'REFERRAL_PROFILE_CONFLICT' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_referral_profile_consistency_v2 ON public.builder_referrals;
CREATE TRIGGER guard_referral_profile_consistency_v2
BEFORE INSERT OR UPDATE OF referrer_id, referred_id
ON public.builder_referrals
FOR EACH ROW EXECUTE FUNCTION public.guard_referral_profile_consistency_v2();

-- Trigger functions are internal entry points, not callable RPCs.
REVOKE ALL ON FUNCTION public.prevent_referral_cycle_v1() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_builder_profile_referral_v2() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_referral_profile_consistency_v2() FROM PUBLIC, anon, authenticated;

COMMIT;
