-- Brands price each market separately, so a product carries one price per market.
-- products.price_amount / currency stay as the fallback when a market has no price.
CREATE TABLE product_prices (
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  market     text NOT NULL CHECK (market IN ('IN', 'US', 'UK_EU')),
  amount     numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency   char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  is_demo    boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, market)
);
