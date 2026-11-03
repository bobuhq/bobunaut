-- Isolated schema fixture. No production data or credentials.
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE TABLE auth.identities (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users,
 provider text NOT NULL, provider_id text NOT NULL, identity_data jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider, provider_id)
);
CREATE TABLE public.builder_profiles (
 builder_id uuid PRIMARY KEY REFERENCES auth.users,
 personal_gp bigint NOT NULL DEFAULT 0 CHECK(personal_gp >= 0),
 eligible_network_gp bigint NOT NULL DEFAULT 0, pending_network_gp bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 gp bigint NOT NULL DEFAULT 0 CHECK(gp >= 0)
);
CREATE TABLE public.builder_social_identities (
 builder_id uuid REFERENCES public.builder_profiles, provider text NOT NULL,
 provider_user_id text NOT NULL, username text, verified boolean NOT NULL DEFAULT false,
 verified_at timestamptz, reward_claimed boolean NOT NULL DEFAULT false,
 reward_claimed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT builder_social_identities_builder_id_provider_key UNIQUE(builder_id,provider),
 UNIQUE(provider, provider_user_id)
);
