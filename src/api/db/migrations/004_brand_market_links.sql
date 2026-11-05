-- Each brand's own store for a market (e.g. hm.com/en_in for India).
-- A missing row means the brand has no store on file for that market.
CREATE TABLE brand_market_links (
  brand_id   uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  market     text NOT NULL CHECK (market IN ('IN', 'US', 'UK_EU')),
  url        text NOT NULL CHECK (url ~ '^https://'),
  checked_at date NOT NULL,
  PRIMARY KEY (brand_id, market)
);
