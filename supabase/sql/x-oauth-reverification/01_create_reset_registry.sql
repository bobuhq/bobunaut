-- BOBU X OAuth Reverification
-- Step 1: Registry only
-- Does not reset verification or modify GP.

BEGIN;

CREATE TABLE public.builder_x_oauth_resets (
  builder_id uuid PRIMARY KEY
    REFERENCES public.builder_profiles(builder_id)
    ON DELETE RESTRICT,

  reset_at timestamptz NOT NULL DEFAULT now(),

  old_auth_identity_id uuid NOT NULL UNIQUE,

  old_provider_user_id text NOT NULL UNIQUE CHECK (btrim(old_provider_user_id) <> ''),

  previously_rewarded boolean NOT NULL,

  reward_idempotency_key text NOT NULL UNIQUE,

  status text NOT NULL DEFAULT 'pending'
    CHECK (
      status IN (
        'pending',
        'relinked',
        'rewarded'
      )
    ),

  reversed_at timestamptz,

  relinked_at timestamptz,

  rewarded_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT x_oauth_reset_reversal_state_check
    CHECK (
      (previously_rewarded = true AND reversed_at IS NOT NULL AND reversed_at = reset_at)
      OR
      (previously_rewarded = false AND reversed_at IS NULL)
    ),

  CONSTRAINT x_oauth_reset_reward_state_check
    CHECK (
      (status = 'pending' AND relinked_at IS NULL AND rewarded_at IS NULL)
      OR (status = 'relinked' AND relinked_at IS NOT NULL AND relinked_at >= reset_at AND rewarded_at IS NULL)
      OR (status = 'rewarded' AND relinked_at IS NOT NULL AND relinked_at >= reset_at AND rewarded_at IS NOT NULL AND rewarded_at >= relinked_at)
    )
);

CREATE INDEX IF NOT EXISTS
  idx_builder_x_oauth_resets_status
ON public.builder_x_oauth_resets(status);

ALTER TABLE public.builder_x_oauth_resets
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.builder_x_oauth_resets
FROM PUBLIC, anon, authenticated;

GRANT SELECT
ON TABLE public.builder_x_oauth_resets
TO service_role;

COMMENT ON TABLE public.builder_x_oauth_resets IS
  'Server-managed X OAuth reset registry. '
  'A new linked X identity must be verified '
  'before a replacement Genesis reward is granted.';

COMMIT;
