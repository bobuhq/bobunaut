-- BOBU X OAuth reset registry protection
-- Run only after 01_create_reset_registry.sql.
-- No GP or social verification changes.

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_x_oauth_reset_registry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'X OAuth reset records cannot be deleted';
  END IF;

  IF NEW.builder_id IS DISTINCT FROM OLD.builder_id
     OR NEW.reset_at IS DISTINCT FROM OLD.reset_at
     OR NEW.old_auth_identity_id IS DISTINCT FROM OLD.old_auth_identity_id
     OR NEW.old_provider_user_id IS DISTINCT FROM OLD.old_provider_user_id
     OR NEW.previously_rewarded IS DISTINCT FROM OLD.previously_rewarded
     OR NEW.reward_idempotency_key IS DISTINCT FROM OLD.reward_idempotency_key
     OR NEW.reversed_at IS DISTINCT FROM OLD.reversed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.relinked_at IS NOT NULL AND NEW.relinked_at IS DISTINCT FROM OLD.relinked_at)
  THEN
    RAISE EXCEPTION 'X OAuth reset identity and reward key are immutable';
  END IF;

  IF OLD.status = 'rewarded' THEN
    RAISE EXCEPTION 'Completed X OAuth resets cannot be modified';
  END IF;

  IF OLD.status = 'pending'
     AND NEW.status NOT IN ('pending', 'relinked')
  THEN
    RAISE EXCEPTION 'Invalid X OAuth reset status transition';
  END IF;

  IF OLD.status = 'relinked'
     AND NEW.status NOT IN ('relinked', 'rewarded')
  THEN
    RAISE EXCEPTION 'Invalid X OAuth reset status transition';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION
  public.protect_x_oauth_reset_registry()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS
  trg_protect_x_oauth_reset_registry
ON public.builder_x_oauth_resets;

CREATE TRIGGER trg_protect_x_oauth_reset_registry
BEFORE UPDATE OR DELETE
ON public.builder_x_oauth_resets
FOR EACH ROW
EXECUTE FUNCTION public.protect_x_oauth_reset_registry();

COMMIT;
