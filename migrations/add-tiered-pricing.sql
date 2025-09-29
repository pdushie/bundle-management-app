-- Add tiered pricing support
ALTER TABLE pricing_profiles 
  ADD COLUMN IF NOT EXISTS is_tiered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pricing_profiles 
  ALTER COLUMN data_price_per_gb DROP NOT NULL;

-- Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES pricing_profiles(id) ON DELETE CASCADE,
  data_gb DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_profile_id ON pricing_tiers(profile_id);
