-- FitMatch initial schema
-- Canonical units: all lengths/circumferences in centimetres, weight in kilograms.
-- Display-unit conversion happens at the edge (API/UI), never in storage.

-- ─────────────────────────────────────────────────────────────
-- Lookup: measurement points
-- ─────────────────────────────────────────────────────────────
CREATE TABLE measurement_points (
  key            text PRIMARY KEY CHECK (key ~ '^[a-z_]+$'),
  label          text NOT NULL,
  region         text NOT NULL CHECK (region IN ('upper', 'lower', 'overall')),
  description    text NOT NULL,
  how_to_measure text NOT NULL,
  min_cm         numeric(6,1) NOT NULL CHECK (min_cm > 0),
  max_cm         numeric(6,1) NOT NULL,
  sort_order     smallint NOT NULL DEFAULT 0,
  CHECK (max_cm > min_cm)
);

-- ─────────────────────────────────────────────────────────────
-- Users, sessions, auth tokens
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL CHECK (position('@' IN email) > 1 AND length(email) <= 254),
  full_name         text NOT NULL CHECK (length(full_name) BETWEEN 1 AND 120),
  password_hash     text,
  google_sub        text UNIQUE,
  role              text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  gender_fit        text CHECK (gender_fit IN ('menswear', 'womenswear', 'unisex', 'no_preference')),
  preferred_unit    text NOT NULL DEFAULT 'cm' CHECK (preferred_unit IN ('cm', 'in')),
  email_verified_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
);
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE sessions (
  id           text PRIMARY KEY,               -- sha256(token); the raw token only lives in the cookie
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at   timestamptz NOT NULL,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('verify_email', 'reset_password')),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_tokens_user_kind_idx ON auth_tokens (user_id, kind);

-- ─────────────────────────────────────────────────────────────
-- Measurement profiles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE measurement_profiles (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name               text NOT NULL DEFAULT 'My profile' CHECK (length(name) BETWEEN 1 AND 60),
  is_primary         boolean NOT NULL DEFAULT false,
  height_cm          numeric(5,1) CHECK (height_cm BETWEEN 100 AND 250),
  weight_kg          numeric(5,1) CHECK (weight_kg BETWEEN 25 AND 300),
  age                smallint CHECK (age BETWEEN 13 AND 120),
  measurement_method text NOT NULL DEFAULT 'self' CHECK (measurement_method IN ('self', 'assisted', 'professional', 'estimated')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX measurement_profiles_user_idx ON measurement_profiles (user_id);
CREATE UNIQUE INDEX measurement_profiles_one_primary ON measurement_profiles (user_id) WHERE is_primary;

CREATE TABLE body_measurements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid NOT NULL REFERENCES measurement_profiles(id) ON DELETE CASCADE,
  measurement_key text NOT NULL REFERENCES measurement_points(key),
  value_cm        numeric(5,1) NOT NULL CHECK (value_cm > 0 AND value_cm < 300),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, measurement_key)
);

-- ─────────────────────────────────────────────────────────────
-- Catalogue: categories, brands, size charts
-- ─────────────────────────────────────────────────────────────
CREATE TABLE clothing_categories (
  id                    serial PRIMARY KEY,
  slug                  text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name                  text NOT NULL,
  garment_group         text NOT NULL CHECK (garment_group IN ('top', 'bottom', 'outerwear', 'formal')),
  required_measurements text[] NOT NULL,          -- body measurements needed for a reliable result
  measurement_weights   jsonb NOT NULL,           -- { measurement_key: weight } used by the engine
  sort_order            smallint NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Fit preference: one default per profile (category_id NULL) plus optional per-category overrides.
CREATE TABLE fit_preferences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES measurement_profiles(id) ON DELETE CASCADE,
  category_id integer REFERENCES clothing_categories(id) ON DELETE CASCADE,
  fit         text NOT NULL CHECK (fit IN ('slim', 'regular', 'relaxed', 'oversized')),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (profile_id, category_id)
);

CREATE TABLE brands (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name         text NOT NULL UNIQUE,
  country      text,
  website_url  text CHECK (website_url IS NULL OR website_url ~ '^https://'),
  description  text,
  sizing_notes text,
  logo_url     text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE brand_size_charts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id         integer NOT NULL REFERENCES clothing_categories(id),
  audience            text NOT NULL DEFAULT 'unisex' CHECK (audience IN ('menswear', 'womenswear', 'unisex')),
  name                text NOT NULL,
  measurement_basis   text NOT NULL DEFAULT 'body' CHECK (measurement_basis IN ('body', 'garment')),
  -- provenance
  source              text NOT NULL,
  source_url          text,
  collected_at        date NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verified_by         uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at         timestamptz,
  is_demo             boolean NOT NULL DEFAULT false,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, category_id, audience, name),
  CHECK (verification_status <> 'verified' OR verified_at IS NOT NULL)
);
CREATE INDEX brand_size_charts_lookup_idx ON brand_size_charts (brand_id, category_id);

CREATE TABLE size_chart_measurements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id        uuid NOT NULL REFERENCES brand_size_charts(id) ON DELETE CASCADE,
  size_label      text NOT NULL CHECK (length(size_label) BETWEEN 1 AND 12),
  sort_order      smallint NOT NULL,
  measurement_key text NOT NULL REFERENCES measurement_points(key),
  min_cm          numeric(5,1) NOT NULL CHECK (min_cm > 0),
  max_cm          numeric(5,1) NOT NULL,
  CHECK (max_cm >= min_cm),
  UNIQUE (chart_id, size_label, measurement_key)
);
CREATE INDEX size_chart_measurements_chart_idx ON size_chart_measurements (chart_id, sort_order);

-- ─────────────────────────────────────────────────────────────
-- Products
-- ─────────────────────────────────────────────────────────────
CREATE TABLE products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id   integer NOT NULL REFERENCES clothing_categories(id),
  size_chart_id uuid REFERENCES brand_size_charts(id) ON DELETE SET NULL,
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  name          text NOT NULL,
  description   text,
  fit_type      text NOT NULL CHECK (fit_type IN ('slim', 'regular', 'relaxed', 'oversized')),
  fabric        text,
  stretch       text NOT NULL DEFAULT 'none' CHECK (stretch IN ('none', 'low', 'medium', 'high')),
  audience      text NOT NULL DEFAULT 'unisex' CHECK (audience IN ('menswear', 'womenswear', 'unisex')),
  price_amount  numeric(10,2) CHECK (price_amount >= 0),
  currency      char(3) NOT NULL DEFAULT 'USD',
  image_urls    text[] NOT NULL DEFAULT '{}',
  colorway      text CHECK (colorway IS NULL OR colorway ~ '^#[0-9A-Fa-f]{6}$'),
  external_url  text CHECK (external_url IS NULL OR external_url ~ '^https://'),
  is_demo       boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_brand_idx ON products (brand_id);
CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_active_idx ON products (is_active, created_at DESC);

CREATE TABLE product_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_label text NOT NULL CHECK (length(size_label) BETWEEN 1 AND 12),
  sort_order smallint NOT NULL,
  is_offered boolean NOT NULL DEFAULT true,   -- size exists in the range; NOT live stock
  UNIQUE (product_id, size_label)
);
CREATE INDEX product_variants_product_idx ON product_variants (product_id, sort_order);

-- Garment (flat) measurements of a finished product, per size. Circumferences are full, not half.
CREATE TABLE product_measurements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id          uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  measurement_key     text NOT NULL REFERENCES measurement_points(key),
  value_cm            numeric(5,1) NOT NULL CHECK (value_cm > 0),
  tolerance_cm        numeric(4,1) NOT NULL DEFAULT 1.0 CHECK (tolerance_cm >= 0),
  source              text NOT NULL,
  collected_at        date NOT NULL,
  verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  UNIQUE (variant_id, measurement_key)
);

-- ─────────────────────────────────────────────────────────────
-- Recommendations, feedback, saved products, history
-- ─────────────────────────────────────────────────────────────
CREATE TABLE size_recommendations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id         uuid REFERENCES measurement_profiles(id) ON DELETE SET NULL,
  brand_id           uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id        integer NOT NULL REFERENCES clothing_categories(id),
  product_id         uuid REFERENCES products(id) ON DELETE SET NULL,
  status             text NOT NULL CHECK (status IN ('ok', 'insufficient_data')),
  recommended_size   text,
  alternative_size   text,
  match_quality      text CHECK (match_quality IN ('excellent', 'good', 'fair', 'poor')),
  confidence         text CHECK (confidence IN ('high', 'moderate', 'low')),
  score              numeric(6,3),
  fit_preference     text NOT NULL,
  engine_version     text NOT NULL,
  result             jsonb NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX size_recommendations_user_idx ON size_recommendations (user_id, created_at DESC);
CREATE INDEX size_recommendations_product_idx ON size_recommendations (product_id);

CREATE TABLE fit_feedback (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id            uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id         integer NOT NULL REFERENCES clothing_categories(id),
  product_id          uuid REFERENCES products(id) ON DELETE SET NULL,
  recommendation_id   uuid REFERENCES size_recommendations(id) ON DELETE SET NULL,
  recommended_size    text,
  purchased_size      text NOT NULL,
  overall_fit         text NOT NULL CHECK (overall_fit IN ('too_tight', 'slightly_tight', 'just_right', 'slightly_loose', 'too_loose')),
  length_fit          text NOT NULL CHECK (length_fit IN ('too_short', 'right', 'too_long')),
  shoulder_fit        text NOT NULL CHECK (shoulder_fit IN ('tight', 'comfortable', 'loose', 'not_applicable')),
  would_buy_same_size boolean NOT NULL,
  comments            text CHECK (length(comments) <= 1000),
  moderation_status   text NOT NULL DEFAULT 'active' CHECK (moderation_status IN ('active', 'flagged', 'excluded')),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fit_feedback_product_idx ON fit_feedback (product_id) WHERE moderation_status = 'active';
CREATE INDEX fit_feedback_brand_cat_idx ON fit_feedback (brand_id, category_id);
CREATE INDEX fit_feedback_user_idx ON fit_feedback (user_id, created_at DESC);

CREATE TABLE saved_products (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE user_brand_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_id              uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  category_id           integer NOT NULL REFERENCES clothing_categories(id),
  last_recommended_size text,
  check_count           integer NOT NULL DEFAULT 1 CHECK (check_count > 0),
  last_checked_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, brand_id, category_id)
);
CREATE INDEX user_brand_history_recent_idx ON user_brand_history (user_id, last_checked_at DESC);
