-- Markets: brands publish different size charts per country/region.
-- 'GLOBAL' is used only for market-agnostic (e.g. demonstration) data.

ALTER TABLE brand_size_charts
  ADD COLUMN market text NOT NULL DEFAULT 'GLOBAL' CHECK (market IN ('GLOBAL', 'IN', 'US', 'UK_EU'));

CREATE INDEX brand_size_charts_market_idx ON brand_size_charts (brand_id, category_id, market);

ALTER TABLE users
  ADD COLUMN market text NOT NULL DEFAULT 'IN' CHECK (market IN ('IN', 'US', 'UK_EU'));

-- Why a brand has no chart for a market (shown to users instead of silently falling back).
CREATE TABLE brand_market_notes (
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  market     text NOT NULL CHECK (market IN ('IN', 'US', 'UK_EU')),
  note       text NOT NULL,
  checked_at date NOT NULL,
  PRIMARY KEY (brand_id, market)
);

-- Demo products no longer pin a demo chart: the best chart for the shopper's market is chosen at request time.
UPDATE products SET size_chart_id = NULL WHERE is_demo;
