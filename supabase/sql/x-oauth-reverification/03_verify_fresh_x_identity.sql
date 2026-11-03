-- BOBU X OAuth Reverification
-- Fresh identity verification only.
-- Does not award GP or modify verification status.

BEGIN;

CREATE OR REPLACE FUNCTION public.verify_fresh_x_oauth_identity(
  p_builder_id uuid,
  p_provider_user_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reset public.builder_x_oauth_resets%ROWTYPE;
  v_new_identity_id uuid;
BEGIN
  SELECT *
  INTO v_reset
  FROM public.builder_x_oauth_resets
  WHERE builder_id = p_builder_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF p_provider_user_id IS DISTINCT FROM v_reset.old_provider_user_id THEN
    RETURN false;
  END IF;

  IF v_reset.status = 'rewarded' THEN
    RETURN false;
  END IF;

  SELECT ai.id
  INTO v_new_identity_id
  FROM auth.identities ai
  WHERE ai.user_id = p_builder_id
    AND ai.provider = 'x'
    AND ai.id <> v_reset.old_auth_identity_id
    AND ai.created_at > v_reset.reset_at
    AND ai.provider_id = p_provider_user_id
    AND (ai.identity_data ->> 'sub' IS NULL
         OR ai.identity_data ->> 'sub' = p_provider_user_id)
  ORDER BY ai.created_at DESC
  LIMIT 1;

  RETURN v_new_identity_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION
  public.verify_fresh_x_oauth_identity(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.verify_fresh_x_oauth_identity(uuid, text)
TO service_role;

COMMIT;
